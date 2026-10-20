import { RequirementsDocument } from './requirementsSchema.ts';
import { DesignArtifact, buildIsolatedDesignPreviewHtml } from './designSchema.ts';

export interface GeneratedProjectFile {
  path: string;
  content: string;
  fileType: string;
  version: number;
  description?: string;
}

export interface CodeArchitecture {
  stack: string;
  frontend: string;
  backend: string;
  database: string;
  summary: string;
}

export interface CodeArtifact {
  projectName: string;
  basedOnPrdVersion: number;
  basedOnDesignVersion: number;
  version: number;
  architecture: CodeArchitecture;
  architectureSummary: string;
  apiEndpoints: string[];
  databaseTables: string[];
  files: GeneratedProjectFile[];
  previewHtml: string;
}

export function validateRelativeFilePath(rawPath: unknown): {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
} {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return { valid: false, error: 'مسار الملف مطلوب ولا يمكن أن يكون فارغاً.' };
  }
  const trimmed = rawPath.trim();

  // Reject null bytes
  if (trimmed.includes('\0')) {
    return { valid: false, error: `مسار الملف غير آمن (يحتوي على Null Byte): ${trimmed}` };
  }

  // Reject absolute paths (Unix / or Windows C:\ or \\)
  if (trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return { valid: false, error: `يُمنع استخدام المسارات المطلقة (Absolute Path Rejected): ${trimmed}` };
  }

  const normalized = trimmed.replace(/\\/g, '/');
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') {
      return {
        valid: false,
        error: `يُمنع استخدام التنقل خارج المجلد (Directory Traversal Rejected): ${trimmed}`,
      };
    }
  }

  if (normalized === '.env' || normalized.endsWith('/.env')) {
    return {
      valid: false,
      error: 'يُمنع تضمين ملف .env الفعلي؛ استخدم .env.example فقط.',
    };
  }

  return { valid: true, normalizedPath: normalized };
}

export function inferFileType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'json':
    case 'md':
    case 'html':
    case 'css':
    case 'sql':
    case 'yml':
    case 'yaml':
      return ext;
    default:
      return 'text';
  }
}

export function ensureCompleteProjectFiles(
  incomingFiles: GeneratedProjectFile[],
  prd: RequirementsDocument,
  design: DesignArtifact,
  version: number
): GeneratedProjectFile[] {
  const fileMap = new Map<string, GeneratedProjectFile>();
  for (const f of incomingFiles) {
    const check = validateRelativeFilePath(f.path);
    if (check.valid && check.normalizedPath && typeof f.content === 'string' && f.content.trim()) {
      fileMap.set(check.normalizedPath, {
        path: check.normalizedPath,
        content: f.content,
        fileType: f.fileType || inferFileType(check.normalizedPath),
        version,
        description: f.description,
      });
    }
  }

  const slug =
    prd.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'ogroup-generated-app';

  if (!fileMap.has('package.json')) {
    fileMap.set('package.json', {
      path: 'package.json',
      fileType: 'json',
      version,
      description: 'Project manifest and scripts',
      content: JSON.stringify(
        {
          name: slug,
          version: `1.0.${version}`,
          private: true,
          type: 'module',
          description: prd.overview,
          scripts: {
            build: 'node scripts/build.mjs',
            test: 'node --test tests/app.test.mjs',
            start: 'node dist/index.mjs',
          },
          dependencies: {},
        },
        null,
        2
      ),
    });
  } else {
    // Ensure package.json is valid JSON
    try {
      const parsedPkg = JSON.parse(fileMap.get('package.json')!.content);
      if (!parsedPkg.name) parsedPkg.name = slug;
      if (!parsedPkg.type) parsedPkg.type = 'module';
      if (!parsedPkg.scripts || typeof parsedPkg.scripts !== 'object') {
        parsedPkg.scripts = {};
      }
      if (!parsedPkg.scripts.build) parsedPkg.scripts.build = 'node scripts/build.mjs';
      if (!parsedPkg.scripts.test) parsedPkg.scripts.test = 'node --test tests/app.test.mjs';
      fileMap.set('package.json', {
        ...fileMap.get('package.json')!,
        content: JSON.stringify(parsedPkg, null, 2),
      });
    } catch {
      fileMap.set('package.json', {
        path: 'package.json',
        fileType: 'json',
        version,
        content: JSON.stringify(
          {
            name: slug,
            version: `1.0.${version}`,
            private: true,
            type: 'module',
            scripts: {
              build: 'node scripts/build.mjs',
              test: 'node --test tests/app.test.mjs',
            },
          },
          null,
          2
        ),
      });
    }
  }

  if (!fileMap.has('tsconfig.json')) {
    fileMap.set('tsconfig.json', {
      path: 'tsconfig.json',
      fileType: 'json',
      version,
      description: 'TypeScript configuration',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: false,
            jsx: 'react-jsx',
            skipLibCheck: true,
            noEmit: true,
          },
          include: ['src/**/*'],
        },
        null,
        2
      ),
    });
  }

  if (!fileMap.has('.env.example')) {
    fileMap.set('.env.example', {
      path: '.env.example',
      fileType: 'text',
      version,
      description: 'Environment variable template (no secrets)',
      content: [
        '# Application Configuration Template',
        'PORT=3000',
        'NODE_ENV=development',
        'DATABASE_URL=./data/app.sqlite',
      ].join('\n'),
    });
  }

  if (!fileMap.has('README.md')) {
    fileMap.set('README.md', {
      path: 'README.md',
      fileType: 'md',
      version,
      description: 'Setup and architecture documentation',
      content: [
        `# ${prd.projectName}`,
        '',
        prd.overview,
        '',
        `## الميزات الأساسية (Features)`,
        ...prd.features.map((f) => `- ${f}`),
        '',
        `## الشاشات المعتمدة (Screens)`,
        ...design.screenInventory.map((s) => `- **${s.title}** (\`${s.route}\`): ${s.purpose}`),
        '',
        `## خطوات التشغيل والبناء (Setup & Build)`,
        '```bash',
        'npm install',
        'npm run build',
        'npm test',
        '```',
      ].join('\n'),
    });
  }

  if (!fileMap.has('src/database/schema.ts')) {
    fileMap.set('src/database/schema.ts', {
      path: 'src/database/schema.ts',
      fileType: 'ts',
      version,
      description: 'Database entities and schema definitions',
      content: `export interface EntityRecord {\n  id: string;\n  createdAt: string;\n  data: Record<string, unknown>;\n}\n\nexport const DATA_ENTITIES = ${JSON.stringify(prd.dataRequirements, null, 2)} as const;\n`,
    });
  }

  if (!fileMap.has('src/server/api.ts')) {
    fileMap.set('src/server/api.ts', {
      path: 'src/server/api.ts',
      fileType: 'ts',
      version,
      description: 'Backend API routes and business logic',
      content: `export interface ApiResponse<T> {\n  ok: boolean;\n  projectName: string;\n  data: T;\n}\n\nexport const PROJECT_FEATURES = ${JSON.stringify(prd.features, null, 2)};\nexport const USER_ROLES = ${JSON.stringify(prd.userRoles, null, 2)};\n\nexport function getSystemHealth(): ApiResponse<{ features: string[]; roles: string[] }> {\n  return {\n    ok: true,\n    projectName: ${JSON.stringify(prd.projectName)},\n    data: {\n      features: PROJECT_FEATURES,\n      roles: USER_ROLES,\n    },\n  };\n}\n`,
    });
  }

  if (!fileMap.has('src/App.tsx')) {
    const screensList = design.screenInventory.map((s) => ({
      id: s.id,
      title: s.title,
      route: s.route,
      purpose: s.purpose,
      kpis: s.kpis,
      actions: s.actions,
    }));

    fileMap.set('src/App.tsx', {
      path: 'src/App.tsx',
      fileType: 'tsx',
      version,
      description: 'Main application frontend component',
      content: `export const PROJECT_NAME = ${JSON.stringify(prd.projectName)};
export const PROJECT_OVERVIEW = ${JSON.stringify(prd.overview)};
export const SCREENS = ${JSON.stringify(screensList, null, 2)};

export function getAppMetadata() {
  return {
    projectName: PROJECT_NAME,
    overview: PROJECT_OVERVIEW,
    screenCount: SCREENS.length,
    direction: ${JSON.stringify(design.designSpecification.direction || 'rtl')},
  };
}
`,
    });
  }

  if (!fileMap.has('scripts/build.mjs')) {
    fileMap.set('scripts/build.mjs', {
      path: 'scripts/build.mjs',
      fileType: 'mjs',
      version,
      description: 'Deterministic project build script',
      content: `import fs from 'node:fs';
import path from 'node:path';

const distDir = path.join(process.cwd(), 'dist');
fs.mkdirSync(distDir, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const bundleInfo = {
  name: pkg.name,
  version: pkg.version,
  builtAt: new Date().toISOString(),
  projectName: ${JSON.stringify(prd.projectName)},
  features: ${JSON.stringify(prd.features)},
  screens: ${JSON.stringify(design.screenInventory.map((s) => s.title))},
};

fs.writeFileSync(
  path.join(distDir, 'index.mjs'),
  \`export const BUNDLE = \${JSON.stringify(bundleInfo, null, 2)};\\nif (import.meta.url === \\\`file://\\\${process.argv[1]}\\\`) { console.log(JSON.stringify(BUNDLE)); }\\n\`,
  'utf-8'
);
console.log('Build succeeded:', pkg.name);
`,
    });
  }

  if (!fileMap.has('tests/app.test.mjs')) {
    fileMap.set('tests/app.test.mjs', {
      path: 'tests/app.test.mjs',
      fileType: 'mjs',
      version,
      description: 'Automated project verification tests',
      content: `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Project manifest and required source files exist', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert.ok(pkg.name.length > 0);
  assert.ok(fs.existsSync('README.md'));
  assert.ok(fs.existsSync('src/App.tsx'));
  assert.ok(fs.existsSync('src/server/api.ts'));
});
`,
    });
  }

  return Array.from(fileMap.values());
}

export function validateCodeArtifact(
  raw: unknown,
  approvedPrd: RequirementsDocument,
  approvedDesign: DesignArtifact,
  approvedPrdVersion = 1,
  approvedDesignVersion = 1,
  nextVersion = 1,
  _options?: { strictForApproval?: boolean }
): { valid: boolean; errors: string[]; artifact?: CodeArtifact } {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['مخرجات الكود يجب أن تكون كائناً صالحاً (JSON Object).'] };
  }

  const obj = raw as Record<string, any>;
  if (!Array.isArray(obj.files) || obj.files.length === 0) {
    return { valid: false, errors: ['يجب أن يحتوي الكود المولد على ملف واحد على الأقل في قائمة الملفات (files).'] };
  }

  const validatedIncoming: GeneratedProjectFile[] = [];
  for (const rf of obj.files) {
    const check = validateRelativeFilePath(rf?.path);
    if (!check.valid || !check.normalizedPath) {
      errors.push(check.error || `مسار الملف غير صالح: ${String(rf?.path)}`);
      continue;
    }
    const content = typeof rf?.content === 'string' ? rf.content : '';
    if (!content.trim()) {
      errors.push(`محتوى الملف فارغ: ${check.normalizedPath}`);
      continue;
    }
    validatedIncoming.push({
      path: check.normalizedPath,
      content,
      fileType: String(rf?.fileType || rf?.language || inferFileType(check.normalizedPath)),
      version: nextVersion,
      description: rf?.description ? String(rf.description) : undefined,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const completeFiles = ensureCompleteProjectFiles(
    validatedIncoming,
    approvedPrd,
    approvedDesign,
    nextVersion
  );

  const rawArch = obj.architecture && typeof obj.architecture === 'object' ? obj.architecture : {};
  const archSummary = String(
    rawArch.summary ||
      obj.architectureSummary ||
      `بنية برمجية متكاملة لمشروع ${approvedPrd.projectName} تضم ${completeFiles.length} ملفاً مصدرياً.`
  );
  const architecture: CodeArchitecture = {
    stack: String(rawArch.stack || obj.framework || 'React 19 + TypeScript + Node.js + SQLite'),
    frontend: String(rawArch.frontend || 'React + TypeScript + Tailwind CSS (RTL)'),
    backend: String(rawArch.backend || 'Node.js + Express REST API'),
    database: String(rawArch.database || 'SQLite Relational Database'),
    summary: archSummary,
  };

  const apiEndpoints = Array.isArray(obj.apiEndpoints) && obj.apiEndpoints.length > 0
    ? obj.apiEndpoints.map((e: any) => String(e))
    : ['GET /api/health', 'GET /api/items', 'POST /api/items'];

  const databaseTables = Array.isArray(obj.databaseTables) && obj.databaseTables.length > 0
    ? obj.databaseTables.map((t: any) => String(t))
    : (approvedPrd.dataRequirements || ['users', 'records']).slice(0, 6);

  const previewHtml =
    (typeof obj.previewHtml === 'string' && obj.previewHtml.trim()) ||
    approvedDesign.previewMetadata?.isolatedPreviewHtml ||
    buildIsolatedDesignPreviewHtml(approvedDesign);

  return {
    valid: true,
    errors: [],
    artifact: {
      projectName: approvedPrd.projectName,
      basedOnPrdVersion: approvedPrdVersion,
      basedOnDesignVersion: approvedDesignVersion,
      version: nextVersion,
      architecture,
      architectureSummary: archSummary,
      apiEndpoints,
      databaseTables,
      files: completeFiles,
      previewHtml,
    },
  };
}

