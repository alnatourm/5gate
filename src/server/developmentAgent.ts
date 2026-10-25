import { RequirementsDocument } from '../shared/requirementsSchema.ts';
import { DesignArtifact, buildIsolatedDesignPreviewHtml } from '../shared/designSchema.ts';
import {
  CodeArtifact,
  GeneratedProjectFile,
  ensureCompleteProjectFiles,
  inferFileType,
  validateRelativeFilePath,
} from '../shared/codeSchema.ts';
import { executeProviderRequest } from './ai/router.ts';
import { inferProviderType } from './ai/credentialResolver.ts';
import { ProviderHttpClient, TokenUsageMetrics, redactSecrets } from './ai/types.ts';
import { extractJsonObject } from './requirementsAgent.ts';

export interface DevelopmentAgentInput {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  userMessage?: string;
  userInstructions?: string;
  approvedPrd: RequirementsDocument;
  approvedPrdVersion: number;
  approvedDesign: DesignArtifact;
  approvedDesignVersion: number;
  selectedStack?: string;
  stackPreference?: string;
  currentCodeArtifact?: CodeArtifact | null;
  currentCode?: CodeArtifact | null;
  chatHistory?: { sender: 'user' | 'ai'; text: string }[];
  nextVersion: number;
  timeoutMs?: number;
}

export interface DevelopmentAgentResult {
  reply: string;
  codeArtifact: CodeArtifact;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}

const DEVELOPMENT_SYSTEM_INSTRUCTION = `You are the Gate 3 Code Generation Agent (Principal Full-Stack Software Development Agent) at OGroup AI Factory.
Your job is to generate or iteratively update a complete, multi-file software project based on:
1. The Approved Gate 1 Product Requirements Document (PRD).
2. The Approved Gate 2 UI/UX Design Artifact.
3. Any existing generated project files from previous iterations.
4. The customer's coding or repair instruction.

CRITICAL RULES:
- Generate actual, clean, syntactically valid source files (TypeScript/React/Node/SQL/Tests/README).
- Never output a single decorative code snippet.
- All file paths MUST be safe relative paths (e.g., "src/App.tsx", "src/components/Login.tsx", "src/server/api.ts", "src/database/schema.ts"). Never use absolute paths ("/...") or "../".
- Never include real API keys or secrets in any generated file.
- When updating an existing project based on a user request (e.g., "Add a login screen" or "Fix syntax error in src/App.tsx"), return the updated or newly added files in the "files" array.

You MUST return ONLY a valid JSON object with this structure:
{
  "reply": "Clear explanation in Arabic/English of the architecture and generated/updated files",
  "architecture": {
    "stack": "React + TypeScript + Express + SQLite",
    "frontend": "React + Tailwind CSS RTL",
    "backend": "Node.js + Express REST API",
    "database": "SQLite Relational Schema",
    "summary": "string"
  },
  "files": [
    {
      "path": "src/App.tsx",
      "fileType": "tsx",
      "description": "Main application component",
      "content": "valid TypeScript/React code"
    }
  ]
}`;

export async function executeDevelopmentAgent(
  input: DevelopmentAgentInput,
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<DevelopmentAgentResult> {
  const provider = (input.provider || '').trim().toLowerCase();
  const model = (input.model || '').trim();
  const apiKey = (input.apiKey || '').trim();
  const providerType = inferProviderType({ provider, endpoint: input.endpoint });

  const existingCode = input.currentCodeArtifact ?? input.currentCode ?? null;
  const effectiveStack = input.selectedStack || input.stackPreference;
  const effectiveUserMessage =
    input.userMessage || input.userInstructions || 'قم بتوليد الكود المصدري الكامل للمشروع.';

  const existingFilesSummary = existingCode?.files
    ? existingCode.files.map((f) => ({
        path: f.path,
        fileType: f.fileType,
        description: f.description,
        contentPreview: f.content.slice(0, 1200),
      }))
    : [];

  const userPrompt = [
    `Approved Gate 1 PRD (v${input.approvedPrdVersion}):`,
    JSON.stringify(input.approvedPrd, null, 2),
    '',
    `Approved Gate 2 Design Summary & Screens (v${input.approvedDesignVersion}):`,
    JSON.stringify(
      {
        projectName: input.approvedDesign.projectName,
        designSummary: input.approvedDesign.designSummary,
        stitchMetadata: input.approvedDesign.stitchMetadata,
        screens: input.approvedDesign.screenInventory.map((s) => ({
          id: s.id,
          title: s.title,
          route: s.route,
          role: s.role,
          purpose: s.purpose,
          layoutType: s.layoutType,
          remoteScreenId: s.remoteScreenId,
          kpis: s.kpis,
          sections: s.sections,
          actions: s.actions,
        })),
        forms: input.approvedDesign.formDefinitions,
      },
      null,
      2
    ),
    '',
    effectiveStack ? `Preferred Technology Stack: ${effectiveStack}\n` : '',
    existingFilesSummary.length > 0
      ? `Existing Generated Project Files (v${existingCode?.version}):\n${JSON.stringify(
          existingFilesSummary,
          null,
          2
        )}\n`
      : '',
    `Customer Development Instruction:`,
    effectiveUserMessage,
    '',
    `Return ONLY valid JSON with "reply", "architecture", and "files".`,
  ].join('\n');

  const systemInstruction = input.systemPrompt
    ? `${DEVELOPMENT_SYSTEM_INSTRUCTION}\n\nAdmin Custom Instructions:\n${input.systemPrompt}`
    : DEVELOPMENT_SYSTEM_INSTRUCTION;

  const adapterResult = await executeProviderRequest(
    {
      providerId: provider,
      providerType,
      configuredModel: model,
      apiKey,
      keySource: 'Gate 3 Development Agent',
      endpoint: input.endpoint,
      systemPrompt: systemInstruction,
      userPrompt,
      responseFormat: 'json',
      temperature: input.temperature ?? 0.3,
      maxTokens: input.maxTokens,
      timeoutMs: input.timeoutMs,
      agentGate: 3,
    },
    options
  );

  if (!adapterResult.ok) {
    const err: any = new Error(adapterResult.error || `فشل طلب وكيل البرمجة (${provider} / ${model}).`);
    err.statusCode = adapterResult.statusCode || 502;
    err.executionStatus = adapterResult.status;
    throw err;
  }

  let parsed: Record<string, any>;
  try {
    parsed = extractJsonObject(adapterResult.response);
  } catch (e: any) {
    const err: any = new Error(e.message || 'فشل تحليل مخرجات وكيل البرمجة كـ JSON صالح.');
    err.statusCode = 422;
    throw err;
  }

  const rawFiles: any[] = Array.isArray(parsed.files) ? parsed.files : [];
  if (rawFiles.length === 0) {
    const err: any = new Error('استجابة وكيل البرمجة لا تحتوي على ملفات مصدرية (files array is empty).');
    err.statusCode = 422;
    throw err;
  }

  // Validate all returned file paths strictly (reject unsafe paths!)
  const validatedIncoming: GeneratedProjectFile[] = [];
  for (const rf of rawFiles) {
    const pathCheck = validateRelativeFilePath(rf?.path);
    if (!pathCheck.valid || !pathCheck.normalizedPath) {
      const err: any = new Error(pathCheck.error || `مسار ملف غير صالح: ${String(rf?.path)}`);
      err.statusCode = 422;
      throw err;
    }
    const content = redactSecrets(String(rf?.content || ''), apiKey);
    if (!content.trim()) {
      continue;
    }
    validatedIncoming.push({
      path: pathCheck.normalizedPath,
      content,
      fileType: String(rf?.fileType || rf?.language || inferFileType(pathCheck.normalizedPath)),
      version: input.nextVersion,
      description: rf?.description ? String(rf.description) : undefined,
    });
  }

  // Merge with previous files if this is an iterative update
  const mergedMap = new Map<string, GeneratedProjectFile>();
  if (existingCode?.files) {
    for (const prevFile of existingCode.files) {
      mergedMap.set(prevFile.path, { ...prevFile });
    }
  }
  // Also include Gate 2 generated UI screen files if not already present
  for (const uiFile of input.approvedDesign.uiFiles || []) {
    const chk = validateRelativeFilePath(uiFile.path);
    if (chk.valid && chk.normalizedPath && !mergedMap.has(chk.normalizedPath)) {
      mergedMap.set(chk.normalizedPath, {
        path: chk.normalizedPath,
        content: redactSecrets(uiFile.content, apiKey),
        fileType: uiFile.fileType || inferFileType(chk.normalizedPath),
        version: input.nextVersion,
        description: `UI Screen (${uiFile.screenId || 'Gate 2'})`,
      });
    }
  }
  for (const inc of validatedIncoming) {
    mergedMap.set(inc.path, inc);
  }

  const completeFiles = ensureCompleteProjectFiles(
    Array.from(mergedMap.values()),
    input.approvedPrd,
    input.approvedDesign,
    input.nextVersion
  );

  const rawArch = parsed.architecture && typeof parsed.architecture === 'object' ? parsed.architecture : {};
  const archSummary = String(
    rawArch.summary ||
      parsed.architectureSummary ||
      `بنية برمجية متكاملة لمشروع ${input.approvedPrd.projectName} تضم ${completeFiles.length} ملفاً مصدرياً.`
  );
  const architecture = {
    stack: String(rawArch.stack || effectiveStack || 'React 19 + TypeScript + Node.js + SQLite'),
    frontend: String(rawArch.frontend || 'React + TypeScript + Tailwind CSS (RTL)'),
    backend: String(rawArch.backend || 'Node.js + Express REST API'),
    database: String(rawArch.database || 'SQLite Relational Database'),
    summary: archSummary,
  };

  const apiEndpoints = Array.isArray(parsed.apiEndpoints) && parsed.apiEndpoints.length > 0
    ? parsed.apiEndpoints.map((e: any) => String(e))
    : ['GET /api/health', 'GET /api/items', 'POST /api/items'];

  const databaseTables = Array.isArray(parsed.databaseTables) && parsed.databaseTables.length > 0
    ? parsed.databaseTables.map((t: any) => String(t))
    : (input.approvedPrd.dataRequirements || ['users', 'records']).slice(0, 6);

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : `تم توليد وتحديث الكود المصدري لمشروع "${input.approvedPrd.projectName}" (${completeFiles.length} ملفاً - الإصدار v${input.nextVersion}).`;

  const previewHtml =
    (typeof parsed.previewHtml === 'string' && parsed.previewHtml.trim()) ||
    input.approvedDesign.previewMetadata?.isolatedPreviewHtml ||
    buildIsolatedDesignPreviewHtml(input.approvedDesign);

  return {
    reply,
    codeArtifact: {
      projectName: input.approvedPrd.projectName,
      basedOnPrdVersion: input.approvedPrdVersion,
      basedOnDesignVersion: input.approvedDesignVersion,
      version: input.nextVersion,
      architecture,
      architectureSummary: archSummary,
      apiEndpoints,
      databaseTables,
      files: completeFiles,
      previewHtml,
    },
    providerUsed: provider,
    modelUsed: adapterResult.executedModel || model,
    usage: adapterResult.usage,
  };
}
