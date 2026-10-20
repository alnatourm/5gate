import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import * as esbuild from 'esbuild';
import { RequirementsDocument } from '../shared/requirementsSchema.ts';
import { DesignArtifact } from '../shared/designSchema.ts';
import { CodeArtifact, validateRelativeFilePath } from '../shared/codeSchema.ts';
import { executeProviderRequest } from './ai/router.ts';
import { inferProviderType } from './ai/credentialResolver.ts';
import { ProviderHttpClient, TokenUsageMetrics } from './ai/types.ts';
import { executeDevelopmentAgent } from './developmentAgent.ts';

const execFileAsync = promisify(execFile);

export interface QACheckResult {
  id: string;
  name: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  details: string;
  responsibleFiles?: string[];
}

export interface QARepairAttemptRecord {
  attempt: number;
  fromCodeVersion: number;
  toCodeVersion: number;
  failedCheckIds: string[];
  errorSummary: string;
}

export interface QAReportArtifact {
  status: 'passed' | 'failed' | 'runner_unavailable';
  testedCodeVersion: number;
  executedChecks: number;
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    score: number;
  };
  buildSucceeded: boolean;
  repairAttempts: number;
  repairIterations: number;
  repairHistory: QARepairAttemptRecord[];
  checks: QACheckResult[];
  logs: string[];
  securityFindings: string[];
  artifacts: string[];
  aiSummary: string;
  aiAnalysis: string;
}

function createIsolatedEnv(sandboxDir: string): NodeJS.ProcessEnv {
  // Strip all platform/customer API keys, secrets, and database paths
  return {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    NODE_ENV: 'test',
    HOME: sandboxDir,
    TMPDIR: sandboxDir,
  };
}

export async function runIsolatedQAChecksOnCode(params: {
  codeArtifact: CodeArtifact;
  approvedPrd: RequirementsDocument;
  approvedDesign: DesignArtifact;
}): Promise<{
  status: 'passed' | 'failed' | 'runner_unavailable';
  executedChecks: number;
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  buildSucceeded: boolean;
  checks: QACheckResult[];
  logs: string[];
  securityFindings: string[];
  artifacts: string[];
}> {
  const { codeArtifact, approvedPrd } = params;
  const checks: QACheckResult[] = [];
  const logs: string[] = [];
  const securityFindings: string[] = [];
  const artifacts: string[] = [];

  let sandboxDir = '';
  try {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogroup-qa-sandbox-'));
  } catch (err: any) {
    return {
      status: 'runner_unavailable',
      executedChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
      buildSucceeded: false,
      checks: [],
      logs: [`[ERROR] Sandbox creation failed: ${err?.message || 'runner_unavailable'}`],
      securityFindings: [],
      artifacts: [],
    };
  }

  try {
    // 1. File Manifest Validation
    const t1 = Date.now();
    const invalidPaths: string[] = [];
    const writtenFiles: string[] = [];

    for (const file of codeArtifact.files || []) {
      const check = validateRelativeFilePath(file.path);
      if (!check.valid || !check.normalizedPath) {
        invalidPaths.push(String(file.path));
        continue;
      }
      const targetPath = path.resolve(sandboxDir, check.normalizedPath);
      if (!targetPath.startsWith(path.resolve(sandboxDir) + path.sep)) {
        invalidPaths.push(String(file.path));
        continue;
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, file.content, 'utf-8');
      writtenFiles.push(check.normalizedPath);
    }

    const requiredFiles = ['package.json', 'README.md', 'src/App.tsx'];
    const missingRequired = requiredFiles.filter((req) => !writtenFiles.includes(req));

    if (invalidPaths.length > 0 || missingRequired.length > 0 || writtenFiles.length === 0) {
      const msg = [
        invalidPaths.length > 0 ? `Invalid paths: ${invalidPaths.join(', ')}` : '',
        missingRequired.length > 0 ? `Missing required files: ${missingRequired.join(', ')}` : '',
        writtenFiles.length === 0 ? 'No files in manifest' : '',
      ]
        .filter(Boolean)
        .join(' | ');
      const checkName = 'فحص قائمة الملفات والمسارات (File Manifest Validation)';
      checks.push({
        id: 'manifest_validation',
        name: checkName,
        title: checkName,
        status: 'failed',
        durationMs: Date.now() - t1,
        details: msg,
        responsibleFiles: missingRequired.length > 0 ? missingRequired : invalidPaths,
      });
      logs.push(`[FAIL] File Manifest Validation: ${msg}`);
    } else {
      const checkName = 'فحص قائمة الملفات والمسارات (File Manifest Validation)';
      checks.push({
        id: 'manifest_validation',
        name: checkName,
        title: checkName,
        status: 'passed',
        durationMs: Date.now() - t1,
        details: `Verified ${writtenFiles.length} safe project files in manifest.`,
      });
      logs.push(`[PASS] File Manifest Validation (${writtenFiles.length} files verified)`);
    }

    // 2. Dependency & package.json Validation
    const t2 = Date.now();
    const pkgPath = path.join(sandboxDir, 'package.json');
    let pkgValid = false;
    let pkgDetails = '';
    let hasTestScript = false;
    let hasBuildScript = false;

    if (fs.existsSync(pkgPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        hasBuildScript = Boolean(pkgJson?.scripts?.build);
        hasTestScript = Boolean(pkgJson?.scripts?.test);
        if (pkgJson && typeof pkgJson.name === 'string' && pkgJson.name.trim()) {
          pkgValid = true;
          pkgDetails = `package.json valid (name: ${pkgJson.name}, scripts: ${Object.keys(pkgJson.scripts || {}).join(', ')})`;
        } else {
          pkgDetails = 'package.json missing valid "name" field.';
        }
      } catch (e: any) {
        pkgDetails = `Invalid JSON in package.json: ${e.message}`;
      }
    } else {
      pkgDetails = 'package.json does not exist.';
    }

    const depCheckName = 'فحص الاعتماديات وملف الحزمة (Dependency Validation)';
    checks.push({
      id: 'dependency_validation',
      name: depCheckName,
      title: depCheckName,
      status: pkgValid ? 'passed' : 'failed',
      durationMs: Date.now() - t2,
      details: pkgDetails,
      responsibleFiles: pkgValid ? undefined : ['package.json'],
    });
    logs.push(`[${pkgValid ? 'PASS' : 'FAIL'}] Dependency Validation: ${pkgDetails}`);

    // 3. TypeScript & TSX Compilation + Relative Import Check
    const t3 = Date.now();
    const tsErrors: string[] = [];
    const brokenTsFiles: string[] = [];
    const codeFilesToCheck = codeArtifact.files.filter((f) =>
      /\.(ts|tsx|js|jsx|mjs)$/.test(f.path)
    );
    const writtenSet = new Set(writtenFiles);

    for (const cf of codeFilesToCheck) {
      const ext = cf.path.split('.').pop()?.toLowerCase();
      const loader =
        ext === 'tsx' ? 'tsx' : ext === 'ts' ? 'ts' : ext === 'jsx' ? 'jsx' : 'js';
      try {
        await esbuild.transform(cf.content, {
          loader,
          target: 'es2022',
          format: 'esm',
        });
      } catch (compileErr: any) {
        brokenTsFiles.push(cf.path);
        const errMsg = compileErr?.errors?.[0]?.text || compileErr?.message || 'Syntax error';
        tsErrors.push(`${cf.path}: ${errMsg}`);
      }

      // Also verify relative imports exist in the project manifest
      const importRegex = /(?:import|export)\s+(?:[^'"]+from\s+)?['"](\.[^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(cf.content)) !== null) {
        const relSpec = match[1];
        const baseDir = path.posix.dirname(cf.path);
        const resolvedBase = path.posix.normalize(path.posix.join(baseDir, relSpec));
        const candidates = [
          resolvedBase,
          `${resolvedBase}.ts`,
          `${resolvedBase}.tsx`,
          `${resolvedBase}.js`,
          `${resolvedBase}.jsx`,
          `${resolvedBase}.mjs`,
          `${resolvedBase}.json`,
          `${resolvedBase}/index.ts`,
          `${resolvedBase}/index.tsx`,
          `${resolvedBase}/index.js`,
        ];
        const exists = candidates.some((cand) => writtenSet.has(cand));
        if (!exists) {
          if (!brokenTsFiles.includes(cf.path)) brokenTsFiles.push(cf.path);
          tsErrors.push(`${cf.path}: Cannot resolve relative import '${relSpec}'`);
        }
      }
    }

    const tsCheckName = 'فحص سلامة شيفرة TypeScript/JSX (TypeScript & Syntax Check)';
    if (tsErrors.length > 0) {
      const detail = tsErrors.join(' ; ');
      checks.push({
        id: 'typescript_check',
        name: tsCheckName,
        title: tsCheckName,
        status: 'failed',
        durationMs: Date.now() - t3,
        details: detail,
        responsibleFiles: brokenTsFiles,
      });
      logs.push(`[FAIL] TypeScript & Syntax Check: ${detail}`);
    } else {
      checks.push({
        id: 'typescript_check',
        name: tsCheckName,
        title: tsCheckName,
        status: 'passed',
        durationMs: Date.now() - t3,
        details: `Successfully compiled ${codeFilesToCheck.length} TypeScript/JavaScript modules with zero errors.`,
      });
      logs.push(`[PASS] TypeScript & Syntax Check (${codeFilesToCheck.length} modules compiled)`);
    }

    // 4. Isolated Build Execution
    const t4 = Date.now();
    let buildSucceeded = false;
    const buildCheckName = 'تنفيذ البناء المعزول (Isolated Build Execution)';
    const buildScriptFile = path.join(sandboxDir, 'scripts', 'build.mjs');
    if (hasBuildScript && fs.existsSync(buildScriptFile) && tsErrors.length === 0) {
      try {
        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          ['scripts/build.mjs'],
          {
            cwd: sandboxDir,
            env: createIsolatedEnv(sandboxDir),
            timeout: 10000,
            maxBuffer: 1024 * 1024,
          }
        );
        buildSucceeded = true;
        if (stdout.trim()) logs.push(`[BUILD STDOUT] ${stdout.trim()}`);
        if (stderr.trim()) logs.push(`[BUILD STDERR] ${stderr.trim()}`);
        const distIndex = path.join(sandboxDir, 'dist', 'index.mjs');
        if (fs.existsSync(distIndex)) {
          artifacts.push('dist/index.mjs');
        }
        checks.push({
          id: 'build_execution',
          name: buildCheckName,
          title: buildCheckName,
          status: 'passed',
          durationMs: Date.now() - t4,
          details: stdout.trim() || 'Build script completed with exit code 0.',
        });
        logs.push(`[PASS] Isolated Build Execution completed`);
      } catch (buildErr: any) {
        const errText = buildErr?.stderr || buildErr?.message || 'Build failed';
        checks.push({
          id: 'build_execution',
          name: buildCheckName,
          title: buildCheckName,
          status: 'failed',
          durationMs: Date.now() - t4,
          details: String(errText).trim(),
          responsibleFiles: ['scripts/build.mjs'],
        });
        logs.push(`[FAIL] Isolated Build Execution: ${String(errText).trim()}`);
      }
    } else if (tsErrors.length > 0) {
      checks.push({
        id: 'build_execution',
        name: buildCheckName,
        title: buildCheckName,
        status: 'failed',
        durationMs: Date.now() - t4,
        details: 'Build failed due to TypeScript compilation errors.',
        responsibleFiles: brokenTsFiles,
      });
      logs.push(`[FAIL] Isolated Build Execution aborted due to compilation errors`);
    } else {
      checks.push({
        id: 'build_execution',
        name: buildCheckName,
        title: buildCheckName,
        status: 'skipped',
        durationMs: Date.now() - t4,
        details: 'No build script found in sandbox.',
      });
      logs.push(`[SKIP] Isolated Build Execution (no build script)`);
    }

    // 5. Unit & Integration Tests in Isolated Runner
    const t5 = Date.now();
    const unitCheckName = 'اختبارات الوحدة والتكامل (Isolated Unit & Integration Tests)';
    const testFile = path.join(sandboxDir, 'tests', 'app.test.mjs');
    if (hasTestScript && fs.existsSync(testFile)) {
      try {
        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          ['--test', 'tests/app.test.mjs'],
          {
            cwd: sandboxDir,
            env: createIsolatedEnv(sandboxDir),
            timeout: 10000,
            maxBuffer: 1024 * 1024,
          }
        );
        checks.push({
          id: 'unit_tests',
          name: unitCheckName,
          title: unitCheckName,
          status: 'passed',
          durationMs: Date.now() - t5,
          details: 'node --test tests/app.test.mjs passed in isolated sandbox.',
        });
        logs.push(`[PASS] Unit Tests executed via node --test`);
        if (stdout.trim()) logs.push(stdout.trim().split('\n').slice(-4).join(' | '));
        if (stderr.trim()) logs.push(stderr.trim());
      } catch (testErr: any) {
        const errOut = testErr?.stderr || testErr?.stdout || testErr?.message || 'Unit tests failed';
        checks.push({
          id: 'unit_tests',
          name: unitCheckName,
          title: unitCheckName,
          status: 'failed',
          durationMs: Date.now() - t5,
          details: String(errOut).slice(0, 400),
          responsibleFiles: ['tests/app.test.mjs'],
        });
        logs.push(`[FAIL] Unit Tests failed: ${String(errOut).slice(0, 300)}`);
      }
    } else {
      checks.push({
        id: 'unit_tests',
        name: unitCheckName,
        title: unitCheckName,
        status: 'skipped',
        durationMs: Date.now() - t5,
        details: 'No unit test file found at tests/app.test.mjs.',
      });
      logs.push(`[SKIP] Unit Tests (not present)`);
    }

    // 6. Application Smoke Test
    const t6 = Date.now();
    const smokeCheckName = 'اختبار التشغيل المبدئي (Application Smoke Test)';
    const distEntry = path.join(sandboxDir, 'dist', 'index.mjs');
    if (buildSucceeded && fs.existsSync(distEntry)) {
      try {
        const { stdout } = await execFileAsync(process.execPath, ['dist/index.mjs'], {
          cwd: sandboxDir,
          env: createIsolatedEnv(sandboxDir),
          timeout: 8000,
          maxBuffer: 512 * 1024,
        });
        checks.push({
          id: 'smoke_test',
          name: smokeCheckName,
          title: smokeCheckName,
          status: 'passed',
          durationMs: Date.now() - t6,
          details: `Smoke test verified output: ${stdout.trim().slice(0, 140)}`,
        });
        logs.push(`[PASS] Application Smoke Test succeeded`);
      } catch (smokeErr: any) {
        checks.push({
          id: 'smoke_test',
          name: smokeCheckName,
          title: smokeCheckName,
          status: 'failed',
          durationMs: Date.now() - t6,
          details: smokeErr?.message || 'Smoke test failed',
          responsibleFiles: ['scripts/build.mjs'],
        });
        logs.push(`[FAIL] Application Smoke Test failed: ${smokeErr?.message}`);
      }
    } else {
      checks.push({
        id: 'smoke_test',
        name: smokeCheckName,
        title: smokeCheckName,
        status: 'skipped',
        durationMs: Date.now() - t6,
        details: 'Skipped smoke test because build artifact dist/index.mjs was not produced.',
      });
      logs.push(`[SKIP] Application Smoke Test`);
    }

    // 7. Static Security & Secret Leak Check
    const t7 = Date.now();
    const secCheckName = 'فحص الأمان وعدم تسريب المفاتيح (Security & Secret Scan)';
    const secretFiles: string[] = [];
    for (const f of codeArtifact.files) {
      if (
        /sk-[a-zA-Z0-9_-]{16,}/.test(f.content) ||
        /AIza[a-zA-Z0-9_-]{16,}/.test(f.content) ||
        /gsk_[a-zA-Z0-9_-]{16,}/.test(f.content)
      ) {
        securityFindings.push(`Hardcoded API key pattern detected in ${f.path}`);
        secretFiles.push(f.path);
      }
      if (/\beval\s*\(/.test(f.content)) {
        securityFindings.push(`Unsafe eval() invocation detected in ${f.path}`);
        secretFiles.push(f.path);
      }
    }

    if (securityFindings.length > 0) {
      checks.push({
        id: 'security_check',
        name: secCheckName,
        title: secCheckName,
        status: 'failed',
        durationMs: Date.now() - t7,
        details: securityFindings.join(' | '),
        responsibleFiles: secretFiles,
      });
      logs.push(`[FAIL] Security & Secret Scan: ${securityFindings.join(' | ')}`);
    } else {
      checks.push({
        id: 'security_check',
        name: secCheckName,
        title: secCheckName,
        status: 'passed',
        durationMs: Date.now() - t7,
        details: 'Zero hardcoded API keys, credentials, or unsafe eval() calls detected.',
      });
      logs.push(`[PASS] Security & Secret Scan: 0 vulnerabilities or leaked secrets`);
    }

    // 8. Artifact Completeness Check against Approved PRD
    const t8 = Date.now();
    const compCheckName = 'فحص اكتمال مكونات المشروع (Artifact Completeness Check)';
    const hasReadme = writtenFiles.includes('README.md');
    const hasEnvTemplate = writtenFiles.includes('.env.example');
    const hasBackendApi = writtenFiles.some((p) => p.startsWith('src/server/') || p.includes('api'));
    const hasDbSchema = writtenFiles.some((p) => p.startsWith('src/database/') || p.includes('schema'));

    if (hasReadme && hasEnvTemplate && hasBackendApi && hasDbSchema) {
      checks.push({
        id: 'artifact_completeness',
        name: compCheckName,
        title: compCheckName,
        status: 'passed',
        durationMs: Date.now() - t8,
        details: `Verified frontend, backend, database schema, README, and .env.example for "${approvedPrd.projectName}".`,
      });
      logs.push(`[PASS] Artifact Completeness Check passed`);
    } else {
      const missingParts = [
        !hasReadme ? 'README.md' : '',
        !hasEnvTemplate ? '.env.example' : '',
        !hasBackendApi ? 'src/server/api.ts' : '',
        !hasDbSchema ? 'src/database/schema.ts' : '',
      ].filter(Boolean);
      checks.push({
        id: 'artifact_completeness',
        name: compCheckName,
        title: compCheckName,
        status: 'failed',
        durationMs: Date.now() - t8,
        details: `Missing required architectural components: ${missingParts.join(', ')}`,
        responsibleFiles: missingParts,
      });
      logs.push(`[FAIL] Artifact Completeness Check: missing ${missingParts.join(', ')}`);
    }

    const passedChecks = checks.filter((c) => c.status === 'passed').length;
    const failedChecks = checks.filter((c) => c.status === 'failed').length;
    const skippedChecks = checks.filter((c) => c.status === 'skipped').length;
    const executedChecks = passedChecks + failedChecks; // Skipped checks are never counted as executed/passed

    const overallStatus = failedChecks === 0 && passedChecks > 0 && buildSucceeded ? 'passed' : 'failed';

    return {
      status: overallStatus,
      executedChecks,
      passedChecks,
      failedChecks,
      skippedChecks,
      buildSucceeded,
      checks,
      logs,
      securityFindings,
      artifacts,
    };
  } finally {
    if (sandboxDir && fs.existsSync(sandboxDir)) {
      try {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

export async function executeGate4QAWithRepairLoop(params: {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  systemPrompt?: string;
  userMessage?: string;
  approvedPrd: RequirementsDocument;
  approvedDesign: DesignArtifact;
  initialCodeArtifact: CodeArtifact;
  maxRepairAttempts?: number;
  onRepairAttempt?: (
    failedChecks: QACheckResult[],
    logs: string[],
    currentCode: CodeArtifact,
    attemptNumber: number
  ) => Promise<CodeArtifact | null>;
  fetchImpl?: ProviderHttpClient;
}): Promise<{
  report: QAReportArtifact;
  finalCodeArtifact: CodeArtifact;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}> {
  const maxAttempts = typeof params.maxRepairAttempts === 'number' ? params.maxRepairAttempts : 2;
  let currentCode = params.initialCodeArtifact;
  let repairAttempts = 0;
  const repairHistory: QARepairAttemptRecord[] = [];

  let runResult = await runIsolatedQAChecksOnCode({
    codeArtifact: currentCode,
    approvedPrd: params.approvedPrd,
    approvedDesign: params.approvedDesign,
  });

  while (
    runResult.status === 'failed' &&
    repairAttempts < maxAttempts &&
    typeof params.onRepairAttempt === 'function'
  ) {
    repairAttempts += 1;
    const failedList = runResult.checks.filter((c) => c.status === 'failed');
    const errorSummary = failedList.map((f) => `${f.id}: ${f.details}`).join(' | ');
    const prevVersion = currentCode.version;

    const repairedCode = await params.onRepairAttempt(
      failedList,
      runResult.logs,
      currentCode,
      repairAttempts
    );
    if (!repairedCode) {
      break;
    }

    currentCode = repairedCode;
    repairHistory.push({
      attempt: repairAttempts,
      fromCodeVersion: prevVersion,
      toCodeVersion: currentCode.version,
      failedCheckIds: failedList.map((f) => f.id),
      errorSummary,
    });

    runResult = await runIsolatedQAChecksOnCode({
      codeArtifact: currentCode,
      approvedPrd: params.approvedPrd,
      approvedDesign: params.approvedDesign,
    });
    runResult.logs.unshift(
      `[REPAIR ATTEMPT #${repairAttempts}] Repaired code v${prevVersion} -> v${currentCode.version}`
    );
  }

  // Consult Gate 4 QA Agent for audit summary if credentials are valid
  const provider = (params.provider || '').trim().toLowerCase();
  const model = (params.model || '').trim();
  const apiKey = (params.apiKey || '').trim();
  const providerType = inferProviderType({ provider, endpoint: params.endpoint });

  let aiSummary =
    runResult.status === 'passed'
      ? `اجتاز مشروع "${params.approvedPrd.projectName}" (الإصدار الكودي v${currentCode.version}) جميع فحوصات البناء والأمان والاختبارات بنجاح (${runResult.passedChecks}/${runResult.executedChecks}).`
      : `فشل فحص الجودة في ${runResult.failedChecks} فحوصات بعد ${repairAttempts} محاولات إصلاح تلقائية.`;
  let modelUsed = model;
  let usage: TokenUsageMetrics | null = null;

  if (provider && model && apiKey) {
    const adapterRes = await executeProviderRequest(
      {
        providerId: provider,
        providerType,
        configuredModel: model,
        apiKey,
        keySource: 'Gate 4 QA Agent',
        endpoint: params.endpoint,
        systemPrompt:
          params.systemPrompt ||
          'You are the Gate 4 QA & Security Verification Agent at OGroup AI Factory. Summarize the real executed QA results in Arabic truthfully. Never claim failed checks passed.',
        userPrompt: JSON.stringify({
          projectName: params.approvedPrd.projectName,
          testedCodeVersion: currentCode.version,
          status: runResult.status,
          passedChecks: runResult.passedChecks,
          failedChecks: runResult.failedChecks,
          skippedChecks: runResult.skippedChecks,
          repairAttempts,
          checks: runResult.checks,
          userInstruction: params.userMessage || '',
        }),
        responseFormat: 'text',
        temperature: 0.2,
        agentGate: 4,
      },
      { fetchImpl: params.fetchImpl }
    );

    if (!adapterRes.ok) {
      const err: any = new Error(adapterRes.error || `فشل اتصال وكيل فحص الجودة (${provider} / ${model}).`);
      err.statusCode = adapterRes.statusCode || 502;
      throw err;
    }

    modelUsed = adapterRes.executedModel || model;
    usage = adapterRes.usage;
    if (adapterRes.response && adapterRes.response.trim()) {
      try {
        const maybeJson = JSON.parse(adapterRes.response);
        aiSummary = maybeJson.reply || maybeJson.aiAnalysis || maybeJson.summary || adapterRes.response.trim();
      } catch {
        aiSummary = adapterRes.response.trim();
      }
    }
  }

  const score =
    runResult.executedChecks > 0
      ? Math.round((runResult.passedChecks / runResult.executedChecks) * 100)
      : 0;

  const report: QAReportArtifact = {
    status: runResult.status,
    testedCodeVersion: currentCode.version,
    executedChecks: runResult.executedChecks,
    passedChecks: runResult.passedChecks,
    failedChecks: runResult.failedChecks,
    skippedChecks: runResult.skippedChecks,
    summary: {
      total: runResult.executedChecks,
      passed: runResult.passedChecks,
      failed: runResult.failedChecks,
      skipped: runResult.skippedChecks,
      score,
    },
    buildSucceeded: runResult.buildSucceeded,
    repairAttempts,
    repairIterations: repairAttempts,
    repairHistory,
    checks: runResult.checks,
    logs: runResult.logs,
    securityFindings: runResult.securityFindings,
    artifacts: runResult.artifacts,
    aiSummary,
    aiAnalysis: aiSummary,
  };

  return {
    report,
    finalCodeArtifact: currentCode,
    providerUsed: provider,
    modelUsed,
    usage,
  };
}

export async function executeGate4VerificationWithRepair(
  params: {
    qaProvider: string;
    qaModel: string;
    qaApiKey: string;
    qaEndpoint?: string;
    qaSystemPrompt?: string;
    devProvider: string;
    devModel: string;
    devApiKey: string;
    devEndpoint?: string;
    devSystemPrompt?: string;
    approvedPrd: RequirementsDocument;
    approvedPrdVersion: number;
    approvedDesign: DesignArtifact;
    approvedDesignVersion: number;
    initialCodeArtifact: CodeArtifact;
    maxRepairAttempts?: number;
    userInstructions?: string;
    onSaveRepairedCode?: (repairedArtifact: CodeArtifact) => CodeArtifact | Promise<CodeArtifact>;
  },
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<{
  qaReport: QAReportArtifact;
  report: QAReportArtifact;
  finalCodeArtifact: CodeArtifact;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}> {
  const res = await executeGate4QAWithRepairLoop({
    provider: params.qaProvider,
    model: params.qaModel,
    apiKey: params.qaApiKey,
    endpoint: params.qaEndpoint,
    systemPrompt: params.qaSystemPrompt,
    userMessage: params.userInstructions,
    approvedPrd: params.approvedPrd,
    approvedDesign: params.approvedDesign,
    initialCodeArtifact: params.initialCodeArtifact,
    maxRepairAttempts: params.maxRepairAttempts,
    fetchImpl: options.fetchImpl,
    onRepairAttempt: async (failedChecks, logs, currentCode, attemptNumber) => {
      const failureDetails = failedChecks
        .map((fc) => `- [${fc.id}] ${fc.name}: ${fc.details} (files: ${(fc.responsibleFiles || []).join(', ')})`)
        .join('\n');
      const repairPrompt = [
        `QA Verification Failed (Repair Attempt #${attemptNumber}).`,
        `Fix all broken files, syntax errors, and missing imports reported below:`,
        failureDetails,
        '',
        `Recent QA Logs:`,
        logs.slice(-10).join('\n'),
      ].join('\n');

      const devRepair = await executeDevelopmentAgent(
        {
          provider: params.devProvider,
          model: params.devModel,
          apiKey: params.devApiKey,
          endpoint: params.devEndpoint,
          systemPrompt: params.devSystemPrompt,
          approvedPrd: params.approvedPrd,
          approvedPrdVersion: params.approvedPrdVersion,
          approvedDesign: params.approvedDesign,
          approvedDesignVersion: params.approvedDesignVersion,
          currentCodeArtifact: currentCode,
          nextVersion: currentCode.version + 1,
          userMessage: repairPrompt,
        },
        options
      );

      if (params.onSaveRepairedCode) {
        return await params.onSaveRepairedCode(devRepair.codeArtifact);
      }
      return devRepair.codeArtifact;
    },
  });

  return {
    qaReport: res.report,
    report: res.report,
    finalCodeArtifact: res.finalCodeArtifact,
    providerUsed: res.providerUsed,
    modelUsed: res.modelUsed,
    usage: res.usage,
  };
}

