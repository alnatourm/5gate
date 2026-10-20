import zlib from 'node:zlib';
import { RequirementsDocument, formatRequirementsToMarkdown } from '../shared/requirementsSchema.ts';
import { DesignArtifact } from '../shared/designSchema.ts';
import { CodeArtifact, validateRelativeFilePath } from '../shared/codeSchema.ts';
import { QAReportArtifact } from './qaRunner.ts';
import { executeProviderRequest } from './ai/router.ts';
import { inferProviderType } from './ai/credentialResolver.ts';
import { ProviderHttpClient, TokenUsageMetrics, redactSecrets } from './ai/types.ts';

export interface ZipFileEntry {
  path: string;
  content: string | Buffer;
}

export interface DeliveryArtifact {
  projectId: string;
  projectName: string;
  projectSlug: string;
  version: number;
  approvedPrdVersion: number;
  approvedDesignVersion: number;
  approvedCodeVersion: number;
  approvedQaVersion: number;
  fileName: string;
  zipFileName: string;
  fileCount: number;
  filesManifest: { path: string; sizeBytes: number }[];
  includedFiles: string[];
  releaseNotes: string;
  releaseSummary: string;
  readmeMarkdown: string;
  deploymentGuide: string;
  deploymentGuideMarkdown: string;
  envExample: string;
  dockerfileContent: string;
  dockerComposeContent: string;
  manifest: {
    projectId: string;
    projectName: string;
    projectSlug: string;
    generatedAt: string;
    qaScore: number;
    approvedGates: {
      gate1Version: number;
      gate2Version: number;
      gate3Version: number;
      gate4Version: number;
    };
    approvedVersions: {
      gate1PrdVersion: number;
      gate2DesignVersion: number;
      gate3CodeVersion: number;
      gate4QaVersion: number;
    };
    files: string[];
  };
  createdAt: string;
}

/**
 * Creates a standards-compliant PKZIP binary buffer using Node.js built-in zlib.crc32 and deflateRawSync.
 */
export function createZipArchive(entries: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const nameBuf = Buffer.from(cleanPath, 'utf-8');
    const rawData = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(String(entry.content), 'utf-8');

    const crc = zlib.crc32(rawData) >>> 0;
    const compressedData = zlib.deflateRawSync(rawData);
    const compressionMethod = 8; // Deflate

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename)
    localHeader.writeUInt16LE(compressionMethod, 8); // Compression method (8 = deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8); // General purpose bit flag (UTF-8)
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedData.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirectorySize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
  eocd.writeUInt32LE(offset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Extracts and verifies a PKZIP archive buffer, checking signatures and CRC32 checksums.
 */
export function extractZipArchive(zipBuffer: Buffer): Map<string, string> {
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) {
    throw new Error('Invalid ZIP buffer: too small.');
  }
  if (zipBuffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Invalid ZIP buffer: missing PK\\x03\\x04 signature.');
  }

  // Find End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP buffer: End of Central Directory record not found.');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  const extracted = new Map<string, string>();
  let ptr = centralDirOffset;

  for (let idx = 0; idx < totalEntries; idx++) {
    const sig = zipBuffer.readUInt32LE(ptr);
    if (sig !== 0x02014b50) {
      throw new Error(`Invalid Central Directory signature at offset ${ptr}`);
    }
    const compressionMethod = zipBuffer.readUInt16LE(ptr + 10);
    const expectedCrc = zipBuffer.readUInt32LE(ptr + 16) >>> 0;
    const compressedSize = zipBuffer.readUInt32LE(ptr + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(ptr + 24);
    const fileNameLen = zipBuffer.readUInt16LE(ptr + 28);
    const extraLen = zipBuffer.readUInt16LE(ptr + 30);
    const commentLen = zipBuffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(ptr + 42);

    const fileName = zipBuffer.subarray(ptr + 46, ptr + 46 + fileNameLen).toString('utf-8');

    const localSig = zipBuffer.readUInt32LE(localHeaderOffset);
    if (localSig !== 0x04034b50) {
      throw new Error(`Invalid Local File Header signature for ${fileName}`);
    }
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    let uncompressedBuf: Buffer;
    if (compressionMethod === 0) {
      uncompressedBuf = Buffer.from(compressedSlice);
    } else if (compressionMethod === 8) {
      uncompressedBuf = zlib.inflateRawSync(compressedSlice);
    } else {
      throw new Error(`Unsupported compression method ${compressionMethod} for ${fileName}`);
    }

    if (uncompressedBuf.length !== uncompressedSize) {
      throw new Error(`Size mismatch for ${fileName}: expected ${uncompressedSize}, got ${uncompressedBuf.length}`);
    }

    const actualCrc = zlib.crc32(uncompressedBuf) >>> 0;
    if (actualCrc !== expectedCrc) {
      throw new Error(`CRC32 mismatch for ${fileName}`);
    }

    extracted.set(fileName, uncompressedBuf.toString('utf-8'));
    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  return extracted;
}

export function buildProjectDeliveryFiles(params: {
  projectId: string;
  approvedPrd: RequirementsDocument;
  approvedPrdVersion: number;
  approvedDesign: DesignArtifact;
  approvedDesignVersion: number;
  approvedCode: CodeArtifact;
  approvedCodeVersion: number;
  approvedQa: QAReportArtifact;
  approvedQaVersion: number;
  customDeploymentNotes?: string;
}): {
  projectSlug: string;
  entries: ZipFileEntry[];
  deliveryArtifact: DeliveryArtifact;
} {
  const {
    projectId,
    approvedPrd,
    approvedPrdVersion,
    approvedDesign,
    approvedDesignVersion,
    approvedCode,
    approvedCodeVersion,
    approvedQa,
    approvedQaVersion,
    customDeploymentNotes,
  } = params;

  const projectSlug =
    approvedPrd.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'ogroup-software-project';

  const entriesMap = new Map<string, string>();
  const addSafeFile = (relPath: string, rawContent: string) => {
    const check = validateRelativeFilePath(relPath);
    if (!check.valid || !check.normalizedPath) {
      throw new Error(check.error || `Invalid delivery file path: ${relPath}`);
    }
    const sanitized = redactSecrets(rawContent);
    entriesMap.set(`${projectSlug}/${check.normalizedPath}`, sanitized);
  };

  // 1. Add all approved Gate 3 generated code files
  for (const file of approvedCode.files) {
    addSafeFile(file.path, file.content);
  }

  // 2. Add approved Gate 2 UI files if not already present
  for (const uiFile of approvedDesign.uiFiles || []) {
    const check = validateRelativeFilePath(uiFile.path);
    if (check.valid && check.normalizedPath && !entriesMap.has(`${projectSlug}/${check.normalizedPath}`)) {
      addSafeFile(uiFile.path, uiFile.content);
    }
  }

  // 3. Dockerfile
  const dockerfileContent = `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
  if (!entriesMap.has(`${projectSlug}/Dockerfile`)) {
    addSafeFile('Dockerfile', dockerfileContent);
  }

  // 4. docker-compose.yml
  const dockerComposeContent = `version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.example
    restart: unless-stopped
`;
  if (!entriesMap.has(`${projectSlug}/docker-compose.yml`)) {
    addSafeFile('docker-compose.yml', dockerComposeContent);
  }

  // 5. DEPLOYMENT.md
  const deploymentGuide = [
    `# دليل النشر والتشغيل السحابي (Deployment Guide) — ${approvedPrd.projectName}`,
    '',
    customDeploymentNotes || 'تم إعداد هذه الحزمة للإطلاق المباشر على بيئات Node.js 22 أو حاويات Docker.',
    '',
    '## 1. التشغيل المحلي (Local Setup)',
    '```bash',
    'cp .env.example .env',
    'npm install',
    'npm run build',
    'npm test',
    'npm start',
    '```',
    '',
    '## 2. التشغيل عبر Docker',
    '```bash',
    'docker compose up --build -d',
    '```',
  ].join('\n');
  addSafeFile('DEPLOYMENT.md', deploymentGuide);

  // 6. QA-REPORT.md
  const qaReportMd = [
    `# تقرير فحص الجودة والأمان (QA Verification Report) — ${approvedPrd.projectName}`,
    '',
    `- **الحالة النهائية (Status):** ${approvedQa.status.toUpperCase()}`,
    `- **إصدار الكود المفحوص (Tested Code Version):** v${approvedQa.testedCodeVersion}`,
    `- **الفحوصات المنفذة (Executed Checks):** ${approvedQa.executedChecks}`,
    `- **الفحوصات الناجحة (Passed Checks):** ${approvedQa.passedChecks}`,
    `- **الفحوصات الفاشلة (Failed Checks):** ${approvedQa.failedChecks}`,
    `- **الفحوصات المتخطاة (Skipped Checks):** ${approvedQa.skippedChecks}`,
    `- **محاولات الإصلاح التلقائي (Repair Attempts):** ${approvedQa.repairAttempts}`,
    '',
    `## ملخص المراجع الذكي (AI Auditor Summary)`,
    approvedQa.aiSummary,
    '',
    `## تفاصيل الفحوصات (Executed Checks Breakdown)`,
    ...approvedQa.checks.map(
      (c) => `- **[${c.status.toUpperCase()}] ${c.name}** (${c.durationMs}ms): ${c.details}`
    ),
    '',
    `## سجل التنفيذ (Execution Logs)`,
    '```text',
    ...approvedQa.logs,
    '```',
  ].join('\n');
  addSafeFile('QA-REPORT.md', qaReportMd);

  // 7. Approved PRD & Design docs
  addSafeFile('docs/PRD.md', formatRequirementsToMarkdown(approvedPrd));
  addSafeFile('docs/DESIGN-SPEC.json', JSON.stringify(approvedDesign, null, 2));

  // 8. PROJECT-MANIFEST.json
  const now = new Date().toISOString();
  const includedFilesList = Array.from(entriesMap.keys()).map((k) => k.replace(`${projectSlug}/`, ''));
  const qaScore =
    approvedQa.executedChecks > 0
      ? Math.round((approvedQa.passedChecks / approvedQa.executedChecks) * 100)
      : 100;

  const manifestObj = {
    projectId,
    projectName: approvedPrd.projectName,
    projectSlug,
    generatedAt: now,
    qaScore,
    approvedGates: {
      gate1Version: approvedPrdVersion,
      gate2Version: approvedDesignVersion,
      gate3Version: approvedCodeVersion,
      gate4Version: approvedQaVersion,
    },
    approvedVersions: {
      gate1PrdVersion: approvedPrdVersion,
      gate2DesignVersion: approvedDesignVersion,
      gate3CodeVersion: approvedCodeVersion,
      gate4QaVersion: approvedQaVersion,
    },
    architecture: approvedCode.architecture,
    qaSummary: {
      status: approvedQa.status,
      executedChecks: approvedQa.executedChecks,
      passedChecks: approvedQa.passedChecks,
      failedChecks: approvedQa.failedChecks,
      buildSucceeded: approvedQa.buildSucceeded,
    },
    files: includedFilesList,
  };
  addSafeFile('PROJECT-MANIFEST.json', JSON.stringify(manifestObj, null, 2));

  const finalIncludedFiles = Array.from(entriesMap.keys()).map((k) => k.replace(`${projectSlug}/`, ''));
  const entries: ZipFileEntry[] = Array.from(entriesMap.entries()).map(([p, content]) => ({
    path: p,
    content,
  }));

  const zipFileName = `${projectSlug}-v${approvedCodeVersion}.zip`;
  const releaseNotesText =
    customDeploymentNotes ||
    `حزمة الإنتاج المعتمدة لمشروع "${approvedPrd.projectName}" جاهزة للتسليم والتشغيل.`;
  const readmeContent =
    entriesMap.get(`${projectSlug}/README.md`) ||
    entriesMap.get(`${projectSlug}/docs/PRD.md`) ||
    formatRequirementsToMarkdown(approvedPrd);
  const envExampleContent =
    entriesMap.get(`${projectSlug}/.env.example`) ||
    'PORT=3000\nNODE_ENV=production\n';

  const deliveryArtifact: DeliveryArtifact = {
    projectId,
    projectName: approvedPrd.projectName,
    projectSlug,
    version: 1,
    approvedPrdVersion,
    approvedDesignVersion,
    approvedCodeVersion,
    approvedQaVersion,
    fileName: zipFileName,
    zipFileName,
    fileCount: entries.length,
    filesManifest: entries.map((e) => ({
      path: e.path,
      sizeBytes: Buffer.byteLength(String(e.content), 'utf-8'),
    })),
    includedFiles: finalIncludedFiles,
    releaseNotes: releaseNotesText,
    releaseSummary: releaseNotesText,
    readmeMarkdown: readmeContent,
    deploymentGuide,
    deploymentGuideMarkdown: deploymentGuide,
    envExample: envExampleContent,
    dockerfileContent,
    dockerComposeContent,
    manifest: {
      projectId,
      projectName: approvedPrd.projectName,
      projectSlug,
      generatedAt: now,
      qaScore,
      approvedGates: {
        gate1Version: approvedPrdVersion,
        gate2Version: approvedDesignVersion,
        gate3Version: approvedCodeVersion,
        gate4Version: approvedQaVersion,
      },
      approvedVersions: {
        gate1PrdVersion: approvedPrdVersion,
        gate2DesignVersion: approvedDesignVersion,
        gate3CodeVersion: approvedCodeVersion,
        gate4QaVersion: approvedQaVersion,
      },
      files: finalIncludedFiles,
    },
    createdAt: now,
  };

  return {
    projectSlug,
    entries,
    deliveryArtifact,
  };
}

export async function executeDeliveryAgent(
  params: {
    provider: string;
    model: string;
    apiKey: string;
    endpoint?: string;
    systemPrompt?: string;
    userMessage: string;
    projectId: string;
    approvedPrd: RequirementsDocument;
    approvedPrdVersion: number;
    approvedDesign: DesignArtifact;
    approvedDesignVersion: number;
    approvedCode: CodeArtifact;
    approvedCodeVersion: number;
    approvedQa: QAReportArtifact;
    approvedQaVersion: number;
  },
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<{
  reply: string;
  deliveryArtifact: DeliveryArtifact;
  entries: ZipFileEntry[];
  zipBuffer: Buffer;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}> {
  const provider = (params.provider || '').trim().toLowerCase();
  const model = (params.model || '').trim();
  const apiKey = (params.apiKey || '').trim();
  const providerType = inferProviderType({ provider, endpoint: params.endpoint });

  const adapterResult = await executeProviderRequest(
    {
      providerId: provider,
      providerType,
      configuredModel: model,
      apiKey,
      keySource: 'Gate 5 Delivery Agent',
      endpoint: params.endpoint,
      systemPrompt:
        params.systemPrompt ||
        'You are the Gate 5 Delivery Agent (Release & DevOps Agent) at OGroup AI Factory. Provide concise release notes and deployment readiness guidance in Arabic for the approved project.',
      userPrompt: JSON.stringify({
        projectName: params.approvedPrd.projectName,
        architecture: params.approvedCode.architecture,
        qaStatus: params.approvedQa.status,
        fileCount: params.approvedCode.files.length,
        userInstruction: params.userMessage,
      }),
      responseFormat: 'text',
      temperature: 0.3,
      agentGate: 5,
    },
    options
  );

  if (!adapterResult.ok) {
    const err: any = new Error(adapterResult.error || `فشل اتصال وكيل التسليم (${provider} / ${model}).`);
    err.statusCode = adapterResult.statusCode || 502;
    throw err;
  }

  let releaseNotes = adapterResult.response.trim();
  try {
    const parsed = JSON.parse(releaseNotes);
    releaseNotes = parsed.reply || parsed.releaseSummary || parsed.releaseNotes || releaseNotes;
  } catch {}

  const built = buildProjectDeliveryFiles({
    projectId: params.projectId,
    approvedPrd: params.approvedPrd,
    approvedPrdVersion: params.approvedPrdVersion,
    approvedDesign: params.approvedDesign,
    approvedDesignVersion: params.approvedDesignVersion,
    approvedCode: params.approvedCode,
    approvedCodeVersion: params.approvedCodeVersion,
    approvedQa: params.approvedQa,
    approvedQaVersion: params.approvedQaVersion,
    customDeploymentNotes: releaseNotes,
  });

  const zipBuffer = createZipArchive(built.entries);

  return {
    reply: releaseNotes || `تم تجهيز حزمة التسليم النهائية (${built.deliveryArtifact.fileName}) بنجاح.`,
    deliveryArtifact: built.deliveryArtifact,
    entries: built.entries,
    zipBuffer,
    providerUsed: provider,
    modelUsed: adapterResult.executedModel || model,
    usage: adapterResult.usage,
  };
}

export async function buildProjectDeliveryPackage(
  params: {
    projectId: string;
    deliveryVersion?: number;
    approvedPrd: RequirementsDocument;
    approvedPrdVersion: number;
    approvedDesign: DesignArtifact;
    approvedDesignVersion: number;
    approvedCode: CodeArtifact;
    approvedCodeVersion: number;
    approvedQa: QAReportArtifact;
    approvedQaVersion: number;
    provider?: string;
    model?: string;
    apiKey?: string;
    endpoint?: string;
    systemPrompt?: string;
    userInstructions?: string;
  },
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<{
  deliveryArtifact: DeliveryArtifact;
  entries: ZipFileEntry[];
  zipBuffer: Buffer;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}> {
  if (params.provider && params.model && params.apiKey) {
    const res = await executeDeliveryAgent(
      {
        provider: params.provider,
        model: params.model,
        apiKey: params.apiKey,
        endpoint: params.endpoint,
        systemPrompt: params.systemPrompt,
        userMessage: params.userInstructions || 'قم بتوليد حزمة التسليم النهائية',
        projectId: params.projectId,
        approvedPrd: params.approvedPrd,
        approvedPrdVersion: params.approvedPrdVersion,
        approvedDesign: params.approvedDesign,
        approvedDesignVersion: params.approvedDesignVersion,
        approvedCode: params.approvedCode,
        approvedCodeVersion: params.approvedCodeVersion,
        approvedQa: params.approvedQa,
        approvedQaVersion: params.approvedQaVersion,
      },
      options
    );
    if (typeof params.deliveryVersion === 'number') {
      res.deliveryArtifact.version = params.deliveryVersion;
    }
    return res;
  }

  const built = buildProjectDeliveryFiles({
    projectId: params.projectId,
    approvedPrd: params.approvedPrd,
    approvedPrdVersion: params.approvedPrdVersion,
    approvedDesign: params.approvedDesign,
    approvedDesignVersion: params.approvedDesignVersion,
    approvedCode: params.approvedCode,
    approvedCodeVersion: params.approvedCodeVersion,
    approvedQa: params.approvedQa,
    approvedQaVersion: params.approvedQaVersion,
    customDeploymentNotes: params.userInstructions,
  });
  if (typeof params.deliveryVersion === 'number') {
    built.deliveryArtifact.version = params.deliveryVersion;
  }
  const zipBuffer = createZipArchive(built.entries);
  return {
    deliveryArtifact: built.deliveryArtifact,
    entries: built.entries,
    zipBuffer,
    providerUsed: params.provider || 'packager',
    modelUsed: params.model || 'deterministic-zip',
    usage: null,
  };
}

