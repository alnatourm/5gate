import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { ProviderHttpClient } from '../src/server/requirementsAgent.ts';

describe('OGroup AI Factory - Complete 5-Gate & Provider Truthfulness Verification Suite', () => {
  let tempDir: string;
  let dbFilePath: string;

  let lastRequestedUrl = '';
  let lastRequestedHeaders: Record<string, string> = {};
  let lastRequestedModel = '';

  const mockProviderFetch: ProviderHttpClient = async (inputUrl, init) => {
    const urlStr = String(inputUrl);
    const headers = (init?.headers || {}) as Record<string, string>;
    const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};

    lastRequestedUrl = urlStr;
    lastRequestedHeaders = headers;
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

    // 1. Admin Connection Test prompt
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

    // 2. Gate 2 Design Agent
    if (systemText.includes('Gate 2 Design Agent')) {
      const isAddReportsScreen = promptText.includes('شاشة تقارير المبيعات');
      const designPayload = {
        reply: isAddReportsScreen
          ? 'تم تحديث التصميم وإضافة شاشة تقارير المبيعات الجديدة.'
          : 'تم توليد التصميم التفاعلي الأولي للمشروع بنجاح.',
        designSummary: 'تصميم عربي متكامل RTL مع لوحة تحكم ونماذج تفاعلية',
        colorPalette: {
          primary: '#EA580C',
          secondary: '#0F172A',
          accent: '#10B981',
          background: '#F8FAFC',
          surface: '#FFFFFF',
          text: '#1E293B',
        },
        typography: {
          headingFont: 'Cairo',
          bodyFont: 'Tajawal',
          direction: 'rtl',
        },
        navigation: {
          type: 'sidebar',
          items: [
            { label: 'الرئيسية', route: '/', icon: 'home' },
            { label: 'لوحة التحكم', route: '/dashboard', icon: 'grid' },
            ...(isAddReportsScreen ? [{ label: 'تقارير المبيعات', route: '/reports', icon: 'chart' }] : []),
          ],
        },
        screens: [
          {
            id: 'screen-landing',
            name: 'الصفحة الرئيسية',
            route: '/',
            screenType: 'landing',
            primaryRole: 'User',
            summary: 'واجهة الاستقبال الرئيسية للمشروع',
            layoutDescription: 'Hero + KPIs + Quick Actions',
            components: ['Navbar', 'HeroSection'],
            actions: ['تسجيل الدخول', 'طلب خدمة'],
            htmlContent: '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>الصفحة الرئيسية</h1></body></html>',
          },
          {
            id: 'screen-dashboard',
            name: 'لوحة التحكم والعمليات',
            route: '/dashboard',
            screenType: 'dashboard',
            primaryRole: 'Admin',
            summary: 'إدارة العمليات والبيانات اليومية',
            layoutDescription: 'Sidebar + Stats Grid + Data Table',
            components: ['Sidebar', 'DataTable'],
            actions: ['إضافة سجل', 'تصدير'],
            htmlContent: '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>لوحة التحكم</h1></body></html>',
          },
          ...(isAddReportsScreen
            ? [
                {
                  id: 'screen-reports',
                  name: 'شاشة تقارير المبيعات',
                  route: '/reports',
                  screenType: 'analytics',
                  primaryRole: 'Admin',
                  summary: 'تحليلات وتقارير الأداء والمبيعات',
                  layoutDescription: 'Charts + Summary Cards',
                  components: ['ReportChart'],
                  actions: ['تحميل PDF'],
                  htmlContent:
                    '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>شاشة تقارير المبيعات</h1></body></html>',
                },
              ]
            : []),
        ],
        components: [
          {
            name: 'Navbar',
            category: 'navigation',
            props: ['title', 'user'],
            description: 'شريط التنقل العلوي',
          },
          {
            name: 'DataTable',
            category: 'data',
            props: ['rows', 'columns'],
            description: 'جدول عرض البيانات التفاعلي',
          },
        ],
        userFlows: [
          {
            name: 'مسار الاستخدام الأساسي',
            fromScreen: 'الصفحة الرئيسية',
            toScreen: 'لوحة التحكم والعمليات',
            trigger: 'النقر على زر لوحة التحكم',
          },
        ],
      };

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(designPayload) }] } }],
          choices: [{ message: { content: JSON.stringify(designPayload) } }],
          usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 400, totalTokenCount: 700 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Gate 3 Code Generation Agent
    if (systemText.includes('Gate 3 Code Generation Agent')) {
      const codePayload = {
        reply: 'تم توليد وتحديث ملفات الكود المصدري القابلة للتشغيل بنجاح.',
        framework: 'react-vite-ts',
        architectureSummary: 'تطبيق React 19 + TypeScript + Express + SQLite متكامل',
        files: [
          {
            path: 'package.json',
            language: 'json',
            description: 'إعدادات الحزم والتبعيات',
            content: JSON.stringify(
              {
                name: 'clinic-system',
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
            content: `import React, { useState } from 'react';
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
            content: `export interface PatientRecord { id: string; name: string; }
export function getPatients(): PatientRecord[] { return [{ id: '1', name: 'أحمد' }]; }`,
          },
        ],
        apiEndpoints: ['GET /api/patients', 'POST /api/appointments'],
        databaseTables: ['patients', 'appointments'],
        setupInstructions: ['npm install', 'npm run dev'],
        previewHtml: '<!DOCTYPE html><html dir="rtl" lang="ar"><body><h1>معاينة حية لنظام العيادة</h1></body></html>',
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

    // 4. Gate 4 QA Agent
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

    // 5. Gate 5 Delivery Agent
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
    const gate1Payload = {
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
      .send({ email: 'founder@clinic.jo', name: 'Founder', defaultCredits: 5, defaultSubscription: true });
    expect(authRes.status).toBe(200);
    userToken = authRes.body.token;
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. POST /api/admin/test-connection fails when a non-Gemini provider has no key (never falls back to GEMINI_API_KEY)', async () => {
    const res = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-openai',
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toContain('لا يوجد مفتاح API');
  });

  it('2. POST /api/admin/test-connection succeeds for Google Stitch Designer (Gate 2) and returns 501 unsupported_protocol for unconfigured Cloud IAM', async () => {
    const stitchRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        providerId: 'prov-stitch',
        gate: 2,
      });

    expect(stitchRes.status).toBe(200);
    expect(stitchRes.body.ok).toBe(true);
    expect(stitchRes.body.providerType).toBe('stitch');
    expect(stitchRes.body.reply).toContain('Google Stitch');

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
    // 1. Cross-provider mismatch (Groq with Gemini endpoint) must be rejected with HTTP 400
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

    // 2. Valid Groq base URL normalizes to https://api.groq.com/openai/v1/chat/completions
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
    // Create project
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

  it('5. Gate 3 cannot run before Gate 2 approval; Gate 2 creates persistent design artifact, updates screens, and approves', async () => {
    // Attempt Gate 3 before Gate 2 approval -> must fail with 409
    const prematureGate3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'اكتب الكود' });
    expect(prematureGate3.status).toBe(409);

    // Generate Gate 2 design artifact
    const gen2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'قم بتوليد تصميم الواجهات الأساسي' });
    expect(gen2.status).toBe(200);
    expect(gen2.body.version).toBe(1);
    expect(gen2.body.artifact.screens.length).toBe(4);
    expect(gen2.body.artifact.projectName).toContain('العيادة');
    expect(JSON.stringify(gen2.body.artifact)).not.toContain('فيلا');

    // Request Gate 2 update to add a new screen ("شاشة تقارير المبيعات")
    const update2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'أضف شاشة تقارير المبيعات إلى التصميم' });
    expect(update2.status).toBe(200);
    expect(update2.body.version).toBe(2);
    expect(update2.body.artifact.screens.length).toBe(5);
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
    // Attempt Gate 4 before Gate 3 approval -> must fail with 409
    const prematureGate4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/run`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(prematureGate4.status).toBe(409);

    // Generate Gate 3 code
    const gen3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'قم بتوليد الكود المصدري للمشروع' });
    expect(gen3.status).toBe(200);
    expect(gen3.body.version).toBe(1);
    expect(gen3.body.artifact.files.length).toBeGreaterThanOrEqual(3);

    // Inject a broken import via manual file edit in Gate 3 so we can verify Gate 4 catches it and blocks approval!
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

    // Approve Gate 3 (version 2)
    const approve3 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/3/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 2 });
    expect(approve3.status).toBe(200);
    expect(approve3.body.approval.approved).toBe(true);
    expect(approve3.body.project.currentGate).toBe(4);
  });

  it('7. Gate 4 detects broken import in Gate 3 code, blocks Gate 4 approval, and repairs via Gate 4 -> Gate 3 -> Gate 4 repair loop', async () => {
    // Attempt Gate 5 before Gate 4 approval -> must fail with 409
    const prematureGate5 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/5/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(prematureGate5.status).toBe(409);

    // Run Gate 4 verification against the broken Gate 3 code
    const run4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/run`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(run4.status).toBe(200);
    expect(run4.body.artifact.status).toBe('failed');
    expect(run4.body.artifact.summary.failed).toBeGreaterThanOrEqual(1);

    // Attempting to approve Gate 4 while status is 'failed' must be rejected with 400!
    const blockedApprove4 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/4/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 1 });
    expect(blockedApprove4.status).toBe(400);

    // Trigger automated Gate 4 -> Gate 3 -> Gate 4 repair loop
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

    // Now Gate 4 approval succeeds!
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

    // Download the real .zip binary archive
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
    // Verify PK\x03\x04 ZIP magic header
    expect(zipBuffer[0]).toBe(0x50); // 'P'
    expect(zipBuffer[1]).toBe(0x4b); // 'K'
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);

    // Approve Gate 5
    const approve5 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/5/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ expectedVersion: 1 });
    expect(approve5.status).toBe(200);
    expect(approve5.body.approval.approved).toBe(true);
    expect(approve5.body.project.status).toBe('completed');
  });

  it('9. Modifying an earlier gate artifact invalidates downstream approvals', async () => {
    // Re-generate Gate 2 design -> must invalidate Gate 2, 3, 4, 5 approvals
    const regen2 = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/2/generate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'تعديل إضافي في التصميم' });
    expect(regen2.status).toBe(200);

    // Verify downstream approvals (Gates 2, 3, 4, 5) are now invalidated
    const projDetails = await request(appInstance)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(projDetails.status).toBe(200);
    const activeApprovedGates = projDetails.body.approvals
      .filter((a: any) => a.approved)
      .map((a: any) => a.gateNumber);
    expect(activeApprovedGates).toEqual([1]); // Only Gate 1 remains approved
  });
});
