import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { ProviderHttpClient } from '../src/server/requirementsAgent.ts';

describe('OGroup AI Factory - Complete 5-Gate & Official Google Stitch MCP Verification Suite', () => {
  let tempDir: string;
  let dbFilePath: string;

  let lastRequestedUrl = '';
  let lastRequestedHeaders: Record<string, string> = {};
  let lastRequestedModel = '';
  let stitchMcpCallLog: Array<{ method: string; toolName?: string; args?: any; apiKey?: string }> = [];
  const stitchArtifactHtmlStore = new Map<string, string>();
  let stitchScreenCounter = 0;

  const extractHeadersRecord = (rawHeaders: any): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!rawHeaders) return out;
    if (typeof rawHeaders.forEach === 'function') {
      rawHeaders.forEach((v: string, k: string) => {
        out[k] = v;
        out[k.toLowerCase()] = v;
      });
      return out;
    }
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (typeof v === 'string') {
        out[k] = v;
        out[k.toLowerCase()] = v;
      }
    }
    return out;
  };

  const mockProviderFetch: ProviderHttpClient = async (inputUrl, init) => {
    const urlStr = String(inputUrl);
    const headers = extractHeadersRecord(init?.headers);
    const method = (init?.method || 'GET').toUpperCase();

    lastRequestedUrl = urlStr;
    lastRequestedHeaders = headers;

    // 0A. Serve Stitch HTML Artifact Downloads (https://stitch.googleapis.com/artifacts/...)
    if (urlStr.startsWith('https://stitch.googleapis.com/artifacts/')) {
      const html = stitchArtifactHtmlStore.get(urlStr);
      if (!html) {
        return new Response('Artifact not found', { status: 404 });
      }
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 0B. Official Google Stitch MCP Server (https://stitch.googleapis.com/mcp)
    if (urlStr.startsWith('https://stitch.googleapis.com/mcp')) {
      if (method === 'DELETE' || method === 'GET') {
        return new Response(null, { status: 200 });
      }

      const apiKey = headers['x-goog-api-key'] || headers['X-Goog-Api-Key'] || '';
      const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};
      const rpcMethod = bodyObj.method || '';

      stitchMcpCallLog.push({
        method: rpcMethod,
        toolName: bodyObj?.params?.name,
        args: bodyObj?.params?.arguments,
        apiKey,
      });

      if (!apiKey || apiKey === 'STITCH_INVALID_KEY_401') {
        return new Response(
          JSON.stringify({
            error: {
              code: 401,
              message: 'UNAUTHENTICATED: Request had invalid authentication credentials for Stitch MCP.',
              status: 'UNAUTHENTICATED',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (rpcMethod === 'initialize') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: bodyObj.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'google-stitch-mcp', version: '1.0.0' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (rpcMethod === 'notifications/initialized') {
        return new Response(null, { status: 202 });
      }

      if (rpcMethod === 'tools/list') {
        if (apiKey === 'STITCH_MISSING_TOOLS_KEY') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                tools: [{ name: 'list_projects', description: 'List projects', inputSchema: { type: 'object' } }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: bodyObj.id,
            result: {
              tools: [
                { name: 'create_project', description: 'Create Stitch project', inputSchema: { type: 'object' } },
                { name: 'get_project', description: 'Get Stitch project', inputSchema: { type: 'object' } },
                { name: 'list_projects', description: 'List Stitch projects', inputSchema: { type: 'object' } },
                {
                  name: 'generate_screen_from_text',
                  description: 'Generate UI screen from text prompt',
                  inputSchema: { type: 'object' },
                },
                { name: 'edit_screens', description: 'Edit existing UI screens', inputSchema: { type: 'object' } },
                { name: 'get_screen', description: 'Get screen details', inputSchema: { type: 'object' } },
                { name: 'list_screens', description: 'List project screens', inputSchema: { type: 'object' } },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (rpcMethod === 'tools/call') {
        const toolName = bodyObj?.params?.name;
        const toolArgs = bodyObj?.params?.arguments || {};

        if (apiKey === 'STITCH_REMOTE_FAIL_KEY') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              error: {
                code: -32000,
                message: 'Stitch MCP remote screen generation failed: upstream capacity exceeded',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (toolName === 'list_projects') {
          const payload = { projects: [] };
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                structuredContent: payload,
                content: [{ type: 'text', text: JSON.stringify(payload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (toolName === 'create_project') {
          const projectTitle = toolArgs.title || 'Untitled Stitch Project';
          const projSlug = projectTitle.includes('السيارات') ? 'proj-cars-900' : 'proj-clinic-100';
          const payload = {
            name: `projects/${projSlug}`,
            projectId: projSlug,
            title: projectTitle,
          };
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                structuredContent: payload,
                content: [{ type: 'text', text: JSON.stringify(payload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (toolName === 'generate_screen_from_text') {
          stitchScreenCounter += 1;
          const projectIdArg = toolArgs.projectId || 'proj-100';
          const promptArg = String(toolArgs.prompt || '');
          const modelIdArg = String(toolArgs.modelId || 'GEMINI_3_FLASH');
          lastRequestedModel = modelIdArg;

          const screenTitleMatch = promptArg.match(/Generate the complete Arabic RTL UI screen\s+"([^"]+)"/i);
          const screenTitle = screenTitleMatch?.[1] || `Stitch Screen ${stitchScreenCounter}`;
          const remoteScreenId = `stitch-scr-${stitchScreenCounter}`;
          const htmlDownloadUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${remoteScreenId}.html`;
          const screenshotUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${remoteScreenId}.png`;

          const generatedHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>${screenTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white p-8 font-sans" data-stitch-project="${projectIdArg}" data-stitch-screen="${remoteScreenId}">
  <header class="border-b border-slate-800 pb-4 mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-orange-400">${screenTitle}</h1>
    <span class="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full">Google Stitch MCP (${modelIdArg})</span>
  </header>
  <main class="space-y-4">
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <p class="text-sm text-slate-300">${promptArg.slice(0, 280).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </section>
  </main>
</body>
</html>`;

          stitchArtifactHtmlStore.set(htmlDownloadUrl, generatedHtml);

          const resultPayload = {
            outputComponents: [
              {
                design: {
                  screens: [
                    {
                      id: remoteScreenId,
                      name: `projects/${projectIdArg}/screens/${remoteScreenId}`,
                      title: screenTitle,
                      htmlCode: { downloadUrl: htmlDownloadUrl },
                      screenshot: { downloadUrl: screenshotUrl },
                    },
                  ],
                },
              },
            ],
          };

          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                structuredContent: resultPayload,
                content: [{ type: 'text', text: JSON.stringify(resultPayload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (toolName === 'edit_screens') {
          const projectIdArg = toolArgs.projectId || 'proj-100';
          const selectedScreenIds: string[] = toolArgs.selectedScreenIds || ['stitch-scr-1'];
          const promptArg = String(toolArgs.prompt || '');
          const editedScreenId = selectedScreenIds[0] || 'stitch-scr-1';
          const htmlDownloadUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${editedScreenId}-rev.html`;
          const screenshotUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${editedScreenId}-rev.png`;

          const revisedHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /><title>واجهة محدثة عبر Stitch</title></head>
<body class="bg-slate-950 text-white p-8" data-stitch-edited="true">
  <h1>تم تحديث الشاشة عبر Google Stitch edit_screens</h1>
  <p>${promptArg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
</body>
</html>`;
          stitchArtifactHtmlStore.set(htmlDownloadUrl, revisedHtml);

          const resultPayload = {
            outputComponents: [
              {
                design: {
                  screens: [
                    {
                      id: editedScreenId,
                      name: `projects/${projectIdArg}/screens/${editedScreenId}`,
                      title: 'واجهة محدثة عبر Stitch',
                      htmlCode: { downloadUrl: htmlDownloadUrl },
                      screenshot: { downloadUrl: screenshotUrl },
                    },
                  ],
                },
              },
            ],
          };

          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                structuredContent: resultPayload,
                content: [{ type: 'text', text: JSON.stringify(resultPayload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (toolName === 'get_screen') {
          const projectIdArg = toolArgs.projectId || 'proj-100';
          const screenIdArg = toolArgs.screenId || 'stitch-scr-1';
          const htmlDownloadUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${screenIdArg}.html`;
          const screenshotUrl = `https://stitch.googleapis.com/artifacts/${projectIdArg}/${screenIdArg}.png`;
          const payload = {
            id: screenIdArg,
            name: `projects/${projectIdArg}/screens/${screenIdArg}`,
            title: 'Stitch Screen',
            htmlCode: { downloadUrl: htmlDownloadUrl },
            screenshot: { downloadUrl: screenshotUrl },
          };
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: bodyObj.id,
              result: {
                structuredContent: payload,
                content: [{ type: 'text', text: JSON.stringify(payload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: bodyObj.id ?? null,
          error: { code: -32601, message: `Unsupported MCP method ${rpcMethod}` },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};
    lastRequestedModel =
      bodyObj.model ||
      (urlStr.includes('/models/') ? urlStr.split('/models/')[1]?.split(':')[0] || '' : '');

    const promptText =
      bodyObj?.contents?.[0]?.parts?.[0]?.text ||
      bodyObj?.messages?.find((m: any) => m.role === 'user')?.content ||
      '';
    const systemText =
      bodyObj?.systemInstruction?.parts?.[0]?.text ||
      bodyObj?.system ||
      bodyObj?.messages?.find((m: any) => m.role === 'system')?.content ||
      '';

    // 1. Admin Connection Test prompt (for LLM providers)
    if (promptText.includes('Connection Verification Test')) {
      const replyText = 'OK - Provider Verified';
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: replyText }] } }],
          choices: [{ message: { content: replyText } }],
          content: [{ type: 'text', text: replyText }],
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 5, totalTokenCount: 20 },
          usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Gate 3 Code Generation Agent
    if (systemText.includes('Gate 3 Code Generation Agent')) {
      const isCarProject = promptText.includes('موقع لبيع السيارات');
      const codePayload = {
        reply: 'تم توليد وتحديث ملفات الكود المصدري القابلة للتشغيل بنجاح.',
        framework: 'react-vite-ts',
        architectureSummary: isCarProject
          ? 'منصة بيع السيارات React 19 + TypeScript + Express + SQLite مستندة إلى تصميم Google Stitch'
          : 'تطبيق React 19 + TypeScript + Express + SQLite متكامل',
        files: [
          {
            path: 'package.json',
            language: 'json',
            description: 'إعدادات الحزم والتبعيات',
            content: JSON.stringify(
              {
                name: isCarProject ? 'car-marketplace' : 'clinic-system',
                private: true,
                version: '1.0.0',
                scripts: { dev: 'vite', build: 'tsc && vite build' },
                dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
              },
              null,
              2
            ),
          },
          {
            path: 'src/App.tsx',
            language: 'tsx',
            description: 'المكون الرئيسي للتطبيق',
            content: isCarProject
              ? `import React, { useState } from 'react';
export default function App() {
  const [cars] = useState(['تويوتا كامري 2025', 'بي إم دبليو X5']);
  return (
    <div dir="rtl" className="p-6">
      <h1>موقع لبيع السيارات</h1>
      <ul>{cars.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}`
              : `import React, { useState } from 'react';
export default function App() {
  const [patients] = useState(['أحمد', 'سارة']);
  return (
    <div dir="rtl" className="p-6">
      <h1>نظام إدارة العيادة الطبية الذكي</h1>
      <ul>{patients.map((p, i) => <li key={i}>{p}</li>)}</ul>
    </div>
  );
}`,
          },
          {
            path: 'src/server/api.ts',
            language: 'ts',
            description: 'واجهة الخادم البرمجية',
            content: `export interface RecordItem { id: string; name: string; }
export function getItems(): RecordItem[] { return [{ id: '1', name: 'سجل 1' }]; }`,
          },
        ],
        apiEndpoints: ['GET /api/items', 'POST /api/items'],
        databaseTables: ['items', 'users'],
        setupInstructions: ['npm install', 'npm run dev'],
        previewHtml: isCarProject
          ? '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>معاينة حية لموقع بيع السيارات</h1></body></html>'
          : '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>معاينة حية لنظام العيادة</h1></body></html>',
      };

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(codePayload) }] } }],
          choices: [{ message: { content: JSON.stringify(codePayload) } }],
          usageMetadata: { promptTokenCount: 350, candidatesTokenCount: 450, totalTokenCount: 800 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Gate 4 QA Agent
    if (systemText.includes('Gate 4 QA & Security Verification Agent')) {
      const qaPayload = {
        reply: 'تم إجراء فحص الجودة والأمان والتحقق من مطابقة المتطلبات.',
        aiAnalysis: 'الكود متوافق مع المتطلبات والتصميم المعتمد.',
        recommendations: ['الاستمرار في مراقبة الأداء عند زيادة عدد المستخدمين'],
      };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(qaPayload) }] } }],
          choices: [{ message: { content: JSON.stringify(qaPayload) } }],
          usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 120, totalTokenCount: 320 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Gate 5 Delivery Agent
    if (systemText.includes('Gate 5 Delivery Agent')) {
      const delivPayload = {
        reply: 'تم تجهيز حزمة التسليم النهائية وأرشيف الـ ZIP بنجاح.',
        releaseSummary: 'إصدار إنتاجي جاهز للنشر السحابي مع كافة الوثائق والكود المصدري.',
      };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(delivPayload) }] } }],
          choices: [{ message: { content: JSON.stringify(delivPayload) } }],
          usageMetadata: { promptTokenCount: 180, candidatesTokenCount: 100, totalTokenCount: 280 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Default: Gate 1 Requirements Agent
    const isCarRequest = promptText.includes('بيع السيارات') || promptText.includes('معرض سيارات');
    const gate1Payload = isCarRequest
      ? {
          reply: 'تم إعداد وثيقة المتطلبات المهيكلة لمشروع موقع لبيع السيارات.',
          replaceSections: [
            'objectives',
            'userRoles',
            'features',
            'userJourneys',
            'businessRules',
            'dataRequirements',
            'integrations',
            'acceptanceCriteria',
            'assumptions',
            'exclusions',
          ],
          documentUpdate: {
            projectName: 'موقع لبيع السيارات',
            overview: 'منصة إلكترونية متكاملة لإعلانات بيع وشراء السيارات الجديدة والمستعملة مع البحث المتقدم ولوحة تحكم المعارض.',
            objectives: ['تسهيل عرض وبيع السيارات', 'توفير بحث متقدم وفلاتر دقيقة للمشترين'],
            userRoles: ['مشتري', 'بائع / معرض سيارات', 'مدير النظام'],
            features: [
              'إعلانات السيارات المميزة',
              'قوائم السيارات مع البحث والفلاتر حسب الماركة والموديل والسعر',
              'صفحة تفاصيل السيارة مع الصور والمواصفات والسعر والتواصل مع البائع',
              'نموذج إضافة إعلان سيارة للبيع',
              'حساب المستخدم والإعلانات المحفوظة والمفضلة',
              'لوحة تحكم المعارض والإدارة لمتابعة الإعلانات والمبيعات',
            ],
            userJourneys: [
              'البحث عن سيارة -> تصفية النتائج -> عرض تفاصيل السيارة -> التواصل مع البائع',
              'تسجيل الدخول -> إضافة إعلان سيارة -> نشر الإعلان في السوق',
            ],
            businessRules: ['التحقق من بيانات المركبة والسعر قبل النشر', 'صلاحيات خاصة لمعارض السيارات المعتمدة'],
            dataRequirements: ['بيانات المركبات والصور والمواصفات', 'حسابات البائعين والمشترين', 'سجل الإعلانات المحفوظة'],
            integrations: ['بوابة الدفع الإلكتروني للإعلانات المميزة', 'خدمة الرسائل الفورية واتساب'],
            acceptanceCriteria: ['سرعة البحث والفلترة في أقل من ثانية', 'دعم كامل للغة العربية RTL'],
            assumptions: ['توفر صور عالية الدقة للسيارات'],
            exclusions: ['خدمات التأمين البنكي المباشر في المرحلة الأولى'],
          },
        }
      : {
          reply: 'تم إعداد وثيقة المتطلبات المهيكلة لنظام العيادة الطبية.',
          replaceSections: [
            'objectives',
            'userRoles',
            'features',
            'userJourneys',
            'businessRules',
            'dataRequirements',
            'integrations',
            'acceptanceCriteria',
            'assumptions',
            'exclusions',
          ],
          documentUpdate: {
            projectName: 'نظام إدارة العيادة الطبية الذكي',
            overview: 'منصة سحابية لإدارة العيادات والمواعيد والملفات الطبية.',
            objectives: ['تنظيم مواعيد المرضى', 'أرشفة السجلات الطبية'],
            userRoles: ['الطبيب', 'موظف الاستقبال', 'المريض'],
            features: ['جدولة المواعيد', 'السجل الطبي الإلكتروني', 'إشعارات واتساب'],
            userJourneys: ['حجز موعد -> معاينة الطبيب -> إصدار الوصفة'],
            businessRules: ['منع ازدواجية المواعيد لنفس الطبيب'],
            dataRequirements: ['بيانات المرضى', 'سجل المواعيد'],
            integrations: ['WhatsApp Business API'],
            acceptanceCriteria: ['حجز موعد في أقل من دقيقة'],
            assumptions: ['اتصال إنترنت مستقر في العيادة'],
            exclusions: ['العمليات الجراحية الكبرى'],
          },
        };

    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(gate1Payload) }] } }],
        choices: [{ message: { content: JSON.stringify(gate1Payload) } }],
        usageMetadata: { promptTokenCount: 250, candidatesTokenCount: 300, totalTokenCount: 550 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  let appInstance: ReturnType<typeof createApp>['app'];
  let userToken = '';
  let projectId = '';

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogroup-5gates-test-'));
    dbFilePath = path.join(tempDir, 'test-5gates.sqlite');

    const created = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'test-5gates-secret-2026',
      fetchImpl: mockProviderFetch,
      managedGeminiApiKey: 'AIzaSy_MANAGED_PLATFORM_TEST_KEY',
      isolateConfig: true,
    });
    appInstance = created.app;

    const authRes = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'founder@clinic.jo', name: 'Founder', defaultCredits: 25, defaultSubscription: true });
    expect(authRes.status).toBe(200);
    userToken = authRes.body.token;
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. POST /api/admin/test-connection fails when a non-Gemini provider or Stitch has no key (never falls back to GEMINI_API_KEY)', async () => {
    const res = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-openai',
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toContain('لا يوجد مفتاح API');

    // Stitch without a key MUST also fail honestly (never synthesize locally or use GEMINI_API_KEY)
    const stitchNoKeyRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-stitch',
        gate: 2,
      });

    expect(stitchNoKeyRes.status).toBe(400);
    expect(stitchNoKeyRes.body.ok).toBe(false);
    expect(stitchNoKeyRes.body.providerType).toBe('stitch');
    expect(stitchNoKeyRes.body.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');
    expect(stitchNoKeyRes.body.error).toContain('X-Goog-Api-Key');
  });

  it('2. POST /api/admin/test-connection verifies real Stitch MCP connectivity, auth failure, and missing tools', async () => {
    // 2a. Invalid Stitch API key -> 401 auth_error
    const invalidStitchRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-stitch',
        customKey: 'STITCH_INVALID_KEY_401',
        gate: 2,
      });

    expect(invalidStitchRes.status).toBe(401);
    expect(invalidStitchRes.body.ok).toBe(false);
    expect(invalidStitchRes.body.verified).toBe(false);
    expect(invalidStitchRes.body.providerType).toBe('stitch');
    expect(invalidStitchRes.body.errorType).toBe('auth_error');

    // 2b. Stitch server missing required screen generation tools -> 501 unsupported
    const missingToolsRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-stitch',
        customKey: 'STITCH_MISSING_TOOLS_KEY',
        gate: 2,
      });

    expect(missingToolsRes.status).toBe(501);
    expect(missingToolsRes.body.ok).toBe(false);
    expect(missingToolsRes.body.errorType).toBe('unsupported');

    // 2c. Valid Stitch API key -> 200 OK with MCP verification metadata
    const validStitchRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-stitch',
        customKey: 'AQ.ValidStitchMcpApiKey_2026',
        gate: 2,
      });

    expect(validStitchRes.status).toBe(200);
    expect(validStitchRes.body.ok).toBe(true);
    expect(validStitchRes.body.verified).toBe(true);
    expect(validStitchRes.body.providerType).toBe('stitch');
    expect(validStitchRes.body.transport).toBe('mcp');
    expect(validStitchRes.body.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');
    expect(validStitchRes.body.authenticationVerified).toBe(true);
    expect(validStitchRes.body.toolDiscoveryVerified).toBe(true);
    expect(validStitchRes.body.discoveredTools).toContain('generate_screen_from_text');
    expect(typeof validStitchRes.body.latencyMs).toBe('number');

    // Save the valid Stitch API key into the admin provider configuration for Gate 2 execution
    const currentCfgRes = await request(appInstance).get('/api/admin/config');
    const updatedProviders = currentCfgRes.body.providers.map((p: any) =>
      p.id === 'prov-stitch'
        ? {
            ...p,
            apiKey: 'AQ.ValidStitchMcpApiKey_2026',
            endpoint: 'https://stitch.googleapis.com/mcp',
            model: 'GEMINI_3_FLASH',
            enabled: true,
          }
        : p
    );
    const saveCfgRes = await request(appInstance)
      .post('/api/admin/config')
      .send({ providers: updatedProviders });
    expect(saveCfgRes.status).toBe(200);

    // 2d. Cloud IAM unconfigured -> 501 unsupported_protocol
    const cloudRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        provider: 'cloud',
        model: 'claude-3-5-sonnet-bedrock',
        endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
      });

    expect(cloudRes.status).toBe(501);
    expect(cloudRes.body.ok).toBe(false);
    expect(cloudRes.body.status).toBe('unsupported_protocol');
  });

  it('3. POST /api/admin/test-connection uses the selected provider and model when a valid key is provided', async () => {
    const res = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-openai',
        customKey: 'sk-valid-openai-admin-key-12345',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('connected');
    expect(res.body.providerType).toBe('openai');
    expect(res.body.model).toBe('gpt-4o-2024-11-20');
    expect(lastRequestedUrl).toContain('api.openai.com');
    expect(lastRequestedHeaders.Authorization).toBe('Bearer sk-valid-openai-admin-key-12345');
    expect(lastRequestedModel).toBe('gpt-4o-2024-11-20');
  });

  it('3b. POST /api/admin/config rejects a Groq provider with a mismatched Gemini endpoint (HTTP 400) and normalizes a valid Groq base URL to /openai/v1/chat/completions', async () => {
    const badCfgRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: [
          {
            id: 'prov-custom-groq',
            name: 'groq',
            providerType: 'groq',
            model: 'llama-3.3-70b-versatile',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: 'gsk_valid_groq_key_123456',
            useSystemEnv: false,
            enabled: true,
          },
        ],
      });
    expect(badCfgRes.status).toBe(400);
    expect(badCfgRes.body.ok).toBe(false);

    const cfgRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: [
          {
            id: 'prov-custom-groq',
            name: 'groq',
            providerType: 'groq',
            model: 'llama-3.3-70b-versatile',
            endpoint: 'https://api.groq.com',
            apiKey: 'gsk_valid_groq_key_123456',
            useSystemEnv: false,
            enabled: true,
          },
        ],
      });
    expect(cfgRes.status).toBe(200);
    const savedGroq = cfgRes.body.providers.find((p: any) => p.id === 'prov-custom-groq');
    expect(savedGroq).toBeDefined();
    expect(savedGroq.providerType).toBe('groq');
    expect(savedGroq.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');

    const testRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-custom-groq',
        providerConfig: savedGroq,
        customKey: 'gsk_valid_groq_key_123456',
      });
    expect(testRes.status).toBe(200);
    expect(testRes.body.ok).toBe(true);
    expect(testRes.body.providerType).toBe('groq');
    expect(lastRequestedUrl).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(lastRequestedHeaders.Authorization).toBe('Bearer gsk_valid_groq_key_123456');
    expect(lastRequestedModel).toBe('llama-3.3-70b-versatile');
  });

  it('4. Gate 2 cannot run before Gate 1 approval, and Gate 1 works end-to-end', async () => {
    const createRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'مشروع العيادة الشامل',
        description: 'نظام عيادة طبية ذكي عبر البوابات الخمس',
        mode: 'managed',
      });
    expect(createRes.status).toBe(201);
    projectId = createRes.body.project.id;

    // Attempt Gate 2 before Gate 1 approval -> must fail with 409
    const prematureGate2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'صمم الواجهات' });
    expect(prematureGate2.status).toBe(409);

    // Run Gate 1 chat
    const gate1Chat = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'أريد نظام إدارة عيادة طبية.', expectedVersion: 1 });
    expect(gate1Chat.status).toBe(200);
    expect(gate1Chat.body.version).toBe(2);

    // Approve Gate 1
    const gate1Approve = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(gate1Approve.status).toBe(200);
    expect(gate1Approve.body.approval.approved).toBe(true);
    expect(gate1Approve.body.project.currentGate).toBe(2);
  });

  it('5. Gate 3 cannot run before Gate 2 approval; Gate 2 executes real Stitch MCP project & screen generation, updates screens, and approves', async () => {
    // Attempt Gate 3 before Gate 2 approval -> must fail with 409
    const prematureGate3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'اكتب الكود' });
    expect(prematureGate3.status).toBe(409);

    stitchMcpCallLog = [];

    // Generate Gate 2 design artifact via Google Stitch MCP
    const gen2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'قم بتوليد تصميم الواجهات الأساسي' });
    expect(gen2.status).toBe(200);
    expect(gen2.body.version).toBe(1);
    expect(gen2.body.artifact.screens.length).toBeGreaterThanOrEqual(4);
    expect(gen2.body.artifact.projectName).toContain('العيادة');
    expect(JSON.stringify(gen2.body.artifact)).not.toContain('فيلا');

    // Verify real Stitch MCP metadata & downloaded HTML on the persisted artifact
    expect(gen2.body.artifact.stitchMetadata).toBeDefined();
    expect(gen2.body.artifact.stitchMetadata.remoteProjectId).toBe('proj-clinic-100');
    expect(gen2.body.artifact.stitchMetadata.transport).toBe('mcp');
    expect(gen2.body.artifact.stitchMetadata.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');
    expect(gen2.body.artifact.stitchMetadata.remoteExecutionStatus).toBe('succeeded');
    expect(gen2.body.artifact.screens[0].remoteScreenId).toBeTruthy();
    expect(gen2.body.artifact.screens[0].htmlDownloadUrl).toContain('https://stitch.googleapis.com/artifacts/');
    expect(gen2.body.artifact.screens[0].htmlContent).toContain('data-stitch-project="proj-clinic-100"');

    // Verify Stitch MCP tools were actually invoked
    expect(stitchMcpCallLog.some((c) => c.toolName === 'create_project')).toBe(true);
    expect(stitchMcpCallLog.some((c) => c.toolName === 'generate_screen_from_text')).toBe(true);

    // Request Gate 2 update to add a new screen ("شاشة تقارير المبيعات") reusing the remote Stitch project
    const update2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'أضف شاشة تقارير المبيعات إلى التصميم' });
    expect(update2.status).toBe(200);
    expect(update2.body.version).toBe(2);
    expect(update2.body.artifact.stitchMetadata.remoteProjectId).toBe('proj-clinic-100');
    expect(update2.body.artifact.screens.some((s: any) => s.name.includes('تقارير المبيعات'))).toBe(true);

    // Approve Gate 2
    const approve2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(approve2.status).toBe(200);
    expect(approve2.body.approval.approved).toBe(true);
    expect(approve2.body.project.currentGate).toBe(3);
  });

  it('6. Gate 4 cannot run before Gate 3 approval; Gate 3 generates persistent code files, supports manual edits, and approves', async () => {
    const prematureGate4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/run`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(prematureGate4.status).toBe(409);

    const gen3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'قم بتوليد الكود المصدري للمشروع' });
    expect(gen3.status).toBe(200);
    expect(gen3.body.version).toBe(1);
    expect(gen3.body.artifact.files.length).toBeGreaterThanOrEqual(3);

    const brokenArtifact = {
      ...gen3.body.artifact,
      files: gen3.body.artifact.files.map((f: any) =>
        f.path === 'src/App.tsx'
          ? {
              ...f,
              content: `import { NonExistentWidget } from './missingModule';\n` + f.content,
            }
          : f
      ),
    };

    const edit3 = await request(appInstance)
      .put(`/api/projects/${projectId}/gates/3/files`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ artifact: brokenArtifact, expectedVersion: 1 });
    expect(edit3.status).toBe(200);
    expect(edit3.body.version).toBe(2);

    const approve3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(approve3.status).toBe(200);
    expect(approve3.body.approval.approved).toBe(true);
    expect(approve3.body.project.currentGate).toBe(4);
  });

  it('7. Gate 4 detects broken import in Gate 3 code, blocks Gate 4 approval, and repairs via Gate 4 -> Gate 3 -> Gate 4 repair loop', async () => {
    const prematureGate5 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/5/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(prematureGate5.status).toBe(409);

    const run4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/run`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(run4.status).toBe(200);
    expect(run4.body.artifact.status).toBe('failed');
    expect(run4.body.artifact.summary.failed).toBeGreaterThanOrEqual(1);

    const blockedApprove4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 1 });
    expect(blockedApprove4.status).toBe(400);

    const repairRes = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/repair`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(repairRes.status).toBe(200);
    expect(repairRes.body.codeVersion).toBe(3);
    expect(repairRes.body.qaVersion).toBe(2);
    expect(repairRes.body.qaArtifact.status).toBe('passed');
    expect(repairRes.body.qaArtifact.summary.failed).toBe(0);
    expect(repairRes.body.qaArtifact.repairIterations).toBe(1);

    const approve4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(approve4.status).toBe(200);
    expect(approve4.body.approval.approved).toBe(true);
    expect(approve4.body.project.currentGate).toBe(5);
  });

  it('8. Gate 5 generates complete delivery package, serves real downloadable .zip archive, and completes project on approval', async () => {
    const gen5 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/5/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'قم بإعداد حزمة التسليم النهائية' });
    expect(gen5.status).toBe(200);
    expect(gen5.body.version).toBe(1);
    expect(gen5.body.artifact.includedFiles).toContain('README.md');
    expect(gen5.body.artifact.includedFiles).toContain('src/App.tsx');
    expect(gen5.body.artifact.manifest.approvedGates.gate1Version).toBe(2);
    expect(gen5.body.artifact.manifest.approvedGates.gate2Version).toBe(2);
    expect(gen5.body.artifact.manifest.approvedGates.gate3Version).toBe(3);
    expect(gen5.body.artifact.manifest.approvedGates.gate4Version).toBe(2);

    const downloadRes = await request(appInstance)
      .get(`/api/projects/${projectId}/gates/5/download`)
      .set('Authorization', `Bearer ${userToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toContain('application/zip');
    const zipBuffer = downloadRes.body as Buffer;
    expect(zipBuffer.length).toBeGreaterThan(200);
    expect(zipBuffer[0]).toBe(0x50); // 'P'
    expect(zipBuffer[1]).toBe(0x4b); // 'K'
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);

    const approve5 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/5/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 1 });
    expect(approve5.status).toBe(200);
    expect(approve5.body.approval.approved).toBe(true);
    expect(approve5.body.project.status).toBe('completed');
  });

  it('9. Modifying an earlier gate artifact invalidates downstream approvals', async () => {
    const regen2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'تعديل إضافي في التصميم' });
    expect(regen2.status).toBe(200);

    const projDetails = await request(appInstance)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(projDetails.status).toBe(200);
    const activeApprovedGates = projDetails.body.approvals
      .filter((a: any) => a.approved)
      .map((a: any) => a.gateNumber);
    expect(activeApprovedGates).toEqual([1]);
  });

  it('10. Car Marketplace PRD (موقع لبيع السيارات) generates all 6 required car marketplace screens via Google Stitch MCP, supports edit_screens revisions, and passes artifacts to Gate 3', async () => {
    // 1. Create Car Marketplace project
    const createCarRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'موقع لبيع السيارات',
        description: 'منصة لبيع وشراء السيارات الجديدة والمستعملة',
        mode: 'managed',
      });
    expect(createCarRes.status).toBe(201);
    const carProjectId = createCarRes.body.project.id;

    // 2. Run Gate 1 chat with car marketplace requirements & approve Gate 1
    const g1Chat = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'أريد موقع لبيع السيارات يشمل إعلانات السيارات، البحث والفلاتر، تفاصيل السيارة، إضافة إعلان، حساب المستخدم، ولوحة تحكم المعارض.',
        expectedVersion: 1,
      });
    expect(g1Chat.status).toBe(200);
    expect(g1Chat.body.artifact.projectName).toBe('موقع لبيع السيارات');

    const g1Approve = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(g1Approve.status).toBe(200);

    // 3. Generate Gate 2 via real Stitch MCP
    stitchMcpCallLog = [];
    const g2Gen = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'صمم واجهات موقع لبيع السيارات بناءً على وثيقة المتطلبات المعتمدة' });

    expect(g2Gen.status).toBe(200);
    const carDesign = g2Gen.body.artifact;
    expect(carDesign.projectName).toBe('موقع لبيع السيارات');
    expect(carDesign.stitchMetadata.remoteProjectId).toBe('proj-cars-900');
    expect(carDesign.stitchMetadata.transport).toBe('mcp');
    expect(carDesign.stitchMetadata.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');

    // Verify all 6 required car marketplace screens were generated via Stitch MCP
    expect(carDesign.screens.length).toBe(6);
    const screenRoutes = carDesign.screens.map((s: any) => s.route);
    expect(screenRoutes).toEqual(['/', '/vehicles', '/vehicles/details', '/post-ad', '/account', '/admin']);

    for (const scr of carDesign.screens) {
      expect(scr.remoteScreenId).toBeTruthy();
      expect(scr.htmlDownloadUrl).toContain('https://stitch.googleapis.com/artifacts/proj-cars-900/');
      expect(scr.htmlContent).toContain('data-stitch-project="proj-cars-900"');
      expect(scr.htmlContent).not.toContain('فيلا');
      expect(scr.htmlContent).not.toContain('عقار');
    }

    // 4. Revise an existing screen via Stitch edit_screens
    const g2Revise = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'عدّل ألوان الصفحة الرئيسية وأبرز قسم البحث السريع عن السيارات' });
    expect(g2Revise.status).toBe(200);
    expect(g2Revise.body.version).toBe(2);
    expect(stitchMcpCallLog.some((c) => c.toolName === 'edit_screens')).toBe(true);
    expect(g2Revise.body.artifact.screens[0].htmlContent).toContain('data-stitch-edited="true"');

    // 5. Approve Gate 2 and verify Gate 3 receives the approved Stitch design artifacts
    const g2Approve = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/2/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(g2Approve.status).toBe(200);
    expect(g2Approve.body.project.currentGate).toBe(3);

    const g3Gen = await request(appInstance)
      .post(`/api/projects/${carProjectId}/gates/3/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'ولّد الكود المصدري لموقع بيع السيارات بناءً على تصميم Stitch المعتمد' });
    expect(g3Gen.status).toBe(200);
    expect(g3Gen.body.artifact.architectureSummary).toContain('السيارات');
  });

  it('11. Gate 2 does NOT mark design as generated or approved when remote Stitch MCP fails', async () => {
    // Create a fresh project and approve Gate 1
    const createRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'مشروع اختبار فشل Stitch', mode: 'managed' });
    const failProjId = createRes.body.project.id;

    await request(appInstance)
      .post(`/api/projects/${failProjId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'نظام مبيعات', expectedVersion: 1 });
    await request(appInstance)
      .post(`/api/projects/${failProjId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });

    // Temporarily configure Stitch with a key that triggers remote generation failure
    const cfgRes = await request(appInstance).get('/api/admin/config');
    await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: cfgRes.body.providers.map((p: any) =>
          p.id === 'prov-stitch' ? { ...p, apiKey: 'STITCH_REMOTE_FAIL_KEY' } : p
        ),
      });

    const failedGen2 = await request(appInstance)
      .post(`/api/projects/${failProjId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'صمم الواجهات' });

    expect(failedGen2.status).toBeGreaterThanOrEqual(400);

    // Confirm no Gate 2 artifact was saved and Gate 2 cannot be approved
    const gate2State = await request(appInstance)
      .get(`/api/projects/${failProjId}/gates/2`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(gate2State.body.artifact).toBeNull();

    const approveAttempt = await request(appInstance)
      .post(`/api/projects/${failProjId}/gates/2/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 1 });
    expect(approveAttempt.status).toBe(400);
  });
});
