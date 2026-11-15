import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { ProviderHttpClient } from '../src/server/requirementsAgent.ts';

describe('Stage & Agent Key Isolation — Every Agent Uses His Own Key in His Own Stage', () => {
  let tempDir: string;
  let dbFilePath: string;
  let appInstance: ReturnType<typeof createApp>['app'];

  let lastCapturedApiKey = '';
  let lastCapturedModel = '';

  const mockHttpClient: ProviderHttpClient = async (inputUrl, init) => {
    const urlStr = String(inputUrl);
    const headers = (init?.headers || {}) as Record<string, string>;
    const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};

    lastCapturedApiKey =
      headers['x-goog-api-key'] ||
      headers['X-Goog-Api-Key'] ||
      (headers.Authorization ? headers.Authorization.replace('Bearer ', '') : '') ||
      headers['x-api-key'] ||
      '';

    lastCapturedModel = bodyObj.model || (urlStr.includes('gemini-') ? 'gemini-3.8-flash' : '');

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply: 'تم استلام وتحديث المتطلبات بنجاح.',
                    replaceSections: [],
                    documentUpdate: {
                      projectName: 'تطبيق الاختبار',
                      overview: 'نظام إدارة المفاتيح لكل مرحلة',
                      objectives: ['عزل المفاتيح لكل وكيل'],
                      userRoles: ['مستخدم', 'مدير'],
                      features: ['ربط مفتاح مخصص لكل بوابة'],
                      userJourneys: ['تسجيل المفتاح ثم تشغيل المرحلة'],
                      businessRules: ['كل وكيل يستخدم مفتاحه الخاص'],
                      dataRequirements: ['حقول المفاتيح والمراحل'],
                      integrations: ['Gemini', 'OpenAI', 'Anthropic'],
                      acceptanceCriteria: ['اجتياز كافة الفحوصات'],
                      assumptions: ['وجود اتصال إنترنت'],
                      exclusions: ['تداخل المفاتيح بين الوكلاء'],
                    },
                  }),
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-keys-test-'));
    dbFilePath = path.join(tempDir, 'test-keys.sqlite');
    const created = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'test-secret-32-bytes-stage-keys-iso!',
      managedGeminiApiKey: 'MANAGED_GLOBAL_FALLBACK_KEY',
      isolateConfig: true,
      fetchImpl: mockHttpClient,
    });
    appInstance = created.app;
  });

  afterAll(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore Windows file lock on temporary sqlite db
    }
  });

  it('1. BYOK Module: Allows saving distinct active keys for each stage/gate without cross-deactivation', async () => {
    // 1. Authenticate user
    const authRes = await request(appInstance)
      .post('/api/auth/session')
      .send({
        email: 'byok-developer@example.com',
        name: 'BYOK Developer',
        defaultCredits: 10,
        defaultSubscription: true,
      });
    expect(authRes.status).toBe(200);
    const token = authRes.body.token;

    // 2. Save Gate 1 Key (Requirements)
    const gate1ConnRes = await request(appInstance)
      .post('/api/ai-connections')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        apiKey: 'AIzaSy_STAGE_1_REQUIREMENTS_KEY',
        assignedGate: 1,
        active: true,
      });
    expect(gate1ConnRes.status).toBe(200);

    // 3. Save Gate 2 Key (Design)
    const gate2ConnRes = await request(appInstance)
      .post('/api/ai-connections')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        apiKey: 'AIzaSy_STAGE_2_DESIGN_KEY',
        assignedGate: 2,
        active: true,
      });
    expect(gate2ConnRes.status).toBe(200);

    // 4. Save Gate 3 Key (Coding)
    const gate3ConnRes = await request(appInstance)
      .post('/api/ai-connections')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'openai',
        model: 'gpt-4o-2024-11-20',
        apiKey: 'sk-proj-STAGE_3_CODING_KEY',
        assignedGate: 3,
        active: true,
      });
    expect(gate3ConnRes.status).toBe(200);

    // Verify all 3 stage keys remain active simultaneously
    const listConnsRes = await request(appInstance)
      .get('/api/ai-connections')
      .set('Authorization', `Bearer ${token}`);
    expect(listConnsRes.status).toBe(200);

    const activeConns = listConnsRes.body.connections.filter((c: any) => c.active);
    const gate1 = activeConns.find((c: any) => c.assignedGate === 1);
    const gate2 = activeConns.find((c: any) => c.assignedGate === 2);
    const gate3 = activeConns.find((c: any) => c.assignedGate === 3);

    expect(gate1).toBeDefined();
    expect(gate2).toBeDefined();
    expect(gate3).toBeDefined();
  });

  it('2. BYOK Module: Stage 1 execution strictly uses Stage 1 key', async () => {
    // Authenticate user
    const authRes = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'byok-developer@example.com' });
    const token = authRes.body.token;

    // Create BYOK project
    const projRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'مشروع الفحص المعزول',
        description: 'اختبار عزل المفاتيح للبوابات',
        mode: 'byok',
      });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.project.id;

    // Execute Gate 1 chat turn
    lastCapturedApiKey = '';
    const chatRes = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'أريد بناء تطبيق تجارة إلكترونية مع نظام بوابات الدفع',
      });

    expect(chatRes.status).toBe(200);
    expect(lastCapturedApiKey).toBe('AIzaSy_STAGE_1_REQUIREMENTS_KEY');
  });

  it('3. Direct Request Key Override: Explicitly passed apiKey in request is used directly for that stage', async () => {
    const authRes = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'byok-developer@example.com' });
    const token = authRes.body.token;

    const projRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'مشروع التمرير المباشر',
        description: 'اختبار تمرير مفتاح مخصص في الطلب مباشرة',
        mode: 'byok',
      });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.project.id;

    lastCapturedApiKey = '';
    const chatRes = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'إضافة إشعارات الرسائل القصيرة',
        apiKey: 'AIzaSy_DIRECT_OVERRIDE_KEY_9999',
      });

    expect(chatRes.status).toBe(200);
    expect(lastCapturedApiKey).toBe('AIzaSy_DIRECT_OVERRIDE_KEY_9999');
  });

  it('4. Managed Module: Agent 1 dedicated key takes precedence over shared provider fallback', async () => {
    // Configure Agent 1 with a dedicated key in admin settings
    const adminConfigRes = await request(appInstance).get('/api/admin/config');
    expect(adminConfigRes.status).toBe(200);

    const updatedAgents = adminConfigRes.body.agents.map((a: any) =>
      a.gate === 1
        ? { ...a, apiKey: 'AIzaSy_MANAGED_AGENT_1_DEDICATED_KEY', useProviderKey: false }
        : a
    );

    const saveAdminRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: adminConfigRes.body.providers,
        agents: updatedAgents,
      });
    expect(saveAdminRes.status).toBe(200);

    // Create Managed Project
    const authRes = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'managed-customer@example.com', defaultCredits: 5 });
    const token = authRes.body.token;

    const projRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'مشروع الإدارة المدارة',
        description: 'فحص استخدام مفتاح الوكيل المخصص',
        mode: 'managed',
      });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.project.id;

    lastCapturedApiKey = '';
    const chatRes = await request(appInstance)
      .post(`/api/projects/${projectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'تحليل المتطلبات باستخدام مفتاح الوكيل الأول',
      });

    expect(chatRes.status).toBe(200);
    expect(lastCapturedApiKey).toBe('AIzaSy_MANAGED_AGENT_1_DEDICATED_KEY');
  });
});
