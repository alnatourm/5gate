import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { ProviderHttpClient } from '../src/server/requirementsAgent.ts';

describe('OGroup AI Factory - Task 02: Gate 1 Full Functional Verification Suite', () => {
  let tempDir: string;
  let dbFilePath: string;

  // Clearly labeled Test Mock Provider HTTP Client for repeatable automated tests
  let lastPromptSentToProvider = '';
  let lastApiKeySentToProvider = '';
  let lastModelSentToProvider = '';
  let mockShouldFailWithInvalidKey = false;

  const mockProviderFetch: ProviderHttpClient = async (inputUrl, init) => {
    const urlStr = String(inputUrl);
    const headers = (init?.headers || {}) as Record<string, string>;
    const bodyObj = init?.body ? JSON.parse(String(init.body)) : {};

    lastApiKeySentToProvider =
      headers['x-goog-api-key'] ||
      (headers.Authorization ? headers.Authorization.replace('Bearer ', '') : '') ||
      headers['x-api-key'] ||
      '';

    lastModelSentToProvider = bodyObj.model || (urlStr.includes('gemini-') ? 'gemini-3.8-flash' : '');

    if (mockShouldFailWithInvalidKey || lastApiKeySentToProvider.includes('INVALID_KEY')) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Invalid API key provided by BYOK customer.',
            code: 'invalid_api_key',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const promptContent =
      bodyObj?.contents?.[0]?.parts?.[0]?.text ||
      bodyObj?.messages?.find((m: any) => m.role === 'user')?.content ||
      '';
    lastPromptSentToProvider = promptContent;

    // Inspect prompt to return realistic structured JSON responses for Test A, Test B, and Test C follow-up
    const isWhatsAppModification = promptContent.includes('إشعارات واتساب');
    const isPostManualEditFollowUp = promptContent.includes('تأكيد الهوية الوطنية للمريض');

    if (isPostManualEditFollowUp) {
      const payload = {
        reply:
          'تم استيعاب قاعدة العمل المضافة يدوياً (تأكيد الهوية الوطنية للمريض) وإضافة ميزة التحقق الآلي من السجل الطبي.',
        replaceSections: [],
        documentUpdate: {
          features: ['التحقق الآلي من السجل الطبي للمريض عند الاستقبال'],
          acceptanceCriteria: ['التأكد من حفظ رقم الهوية الوطنية للمريض قبل فتح الملف الطبي'],
        },
      };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
          usageMetadata: { promptTokenCount: 410, candidatesTokenCount: 165, totalTokenCount: 575 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (isWhatsAppModification) {
      const payload = {
        reply:
          'قمت بتحديث وثيقة المتطلبات لإضافة إشعارات واتساب التلقائية لتذكير المرضى بالمواعيد مع الحفاظ على كافة متطلبات نظام العيادة الطبية السابقة. هل ترغب في إرسال التذكير قبل 24 ساعة أم ساعتين من الموعد؟',
        replaceSections: [],
        documentUpdate: {
          features: ['إشعارات واتساب تلقائية لتذكير المرضى بالمواعيد وتأكيد الحضور أو الإلغاء'],
          integrations: ['الربط مع واجهة WhatsApp Business Cloud API لإرسال رسائل التذكير الفورية'],
          userJourneys: ['يتلقى المريض رسالة واتساب قبل الموعد بـ 24 ساعة ويمكنه تأكيد الموعد بضغطة زر'],
          acceptanceCriteria: ['وصول إشعار واتساب للمريض فور حجز الموعد وقبل الموعد بـ 24 ساعة'],
        },
      };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
          usageMetadata: { promptTokenCount: 380, candidatesTokenCount: 190, totalTokenCount: 570 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Default: Test A ("أريد نظام إدارة عيادة طبية.")
    const clinicPayload = {
      reply:
        'أهلاً بك! لقد قمت بإعداد وثيقة المتطلبات المهيكلة لنظام إدارة العيادة الطبية (تنظيم المواعيد، الملفات الطبية الإلكترونية، والفوترة). للتفصيل أكثر: كم عدد الأطباء والتخصصات في العيادة؟ وهل تحتاجون للربط مع شركات التأمين الطبي؟',
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
        overview: 'منصة سحابية متكاملة لإدارة حجوزات المرضى، السجلات الطبية الإلكترونية (EMR)، والوصفات الطبية والفوترة.',
        objectives: [
          'تقليل وقت انتظار المرضى وتنظيم جدول الأطباء بدقة',
          'أرشفة الملفات الطبية والتاريخ المرضي إلكترونياً بأمان',
        ],
        userRoles: [
          'الطبيب المعالج (Doctor)',
          'موظف الاستقبال والحجوزات (Receptionist)',
          'المريض (Patient)',
          'مدير العيادة (Clinic Admin)',
        ],
        features: [
          'إدارة وجدولة مواعيد العيادة والأطباء',
          'الملف الطبي الإلكتروني للمريض (EMR) والتشخيص والوصفات',
          'إصدار الفواتير الطبية وإدارة المدفوعات',
        ],
        userJourneys: [
          'يحجز موظف الاستقبال أو المريض موعداً جديداً -> يدخل المريض للطبيب -> يسجل الطبيب التشخيص والوصفة -> تصدر الفاتورة',
        ],
        businessRules: [
          'لا يمكن حجز موعدين لنفس الطبيب في نفس الفترة الزمنية',
          'لا يُسمح بالاطلاع على التشخيص الطبي إلا للطبيب المعالج والمريض',
        ],
        dataRequirements: [
          'سجلات المرضى (الاسم، رقم الهاتف، التاريخ الطبي)',
          'جدول مواعيد الأطباء والزيارات',
          'الفواتير والمدفوعات',
        ],
        integrations: ['بوابة الدفع الإلكتروني', 'خدمة الرسائل القصيرة SMS'],
        acceptanceCriteria: [
          'تمكين حجز وتعديل وإلغاء المواعيد دون تضارب زمني',
          'حفظ واسترجاع الملف الطبي للمريض في أقل من ثانية',
        ],
        assumptions: ['العيادة تعمل بنظام المواعيد المسبقة والحالات الطارئة'],
        exclusions: ['إدارة العمليات الجراحية الكبرى داخل المستشفيات'],
      },
    };

    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(clinicPayload) }] } }],
        choices: [{ message: { content: JSON.stringify(clinicPayload) } }],
        usageMetadata: { promptTokenCount: 295, candidatesTokenCount: 340, totalTokenCount: 635 },
        usage: { prompt_tokens: 295, completion_tokens: 340, total_tokens: 635 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  let appInstance: ReturnType<typeof createApp>['app'];
  let userAToken = '';
  let userBToken = '';
  let projectAId = '';

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogroup-gate1-test-'));
    dbFilePath = path.join(tempDir, 'test-factory.sqlite');

    const created = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'test-vault-secret-2026',
      fetchImpl: mockProviderFetch,
      managedGeminiApiKey: 'AIzaSy_MANAGED_PLATFORM_TEST_KEY',
      isolateConfig: true,
    });
    appInstance = created.app;

    // Authenticate User A
    const authA = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'usera@clinic.jo', name: 'Dr. Ahmad', defaultCredits: 3, defaultSubscription: true });
    expect(authA.status).toBe(200);
    userAToken = authA.body.token;

    // Authenticate User B
    const authB = await request(appInstance)
      .post('/api/auth/session')
      .send({ email: 'userb@other.jo', name: 'User B', defaultCredits: 2, defaultSubscription: true });
    expect(authB.status).toBe(200);
    userBToken = authB.body.token;
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('Test A: Real document generation from "أريد نظام إدارة عيادة طبية."', async () => {
    // 1. Create project
    const createRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'مشروع العيادة',
        description: 'فكرة مبدئية لنظام عيادة',
        mode: 'managed',
      });

    expect(createRes.status).toBe(201);
    projectAId = createRes.body.project.id;
    expect(createRes.body.gate1.version).toBe(1);

    // 2. Send "أريد نظام إدارة عيادة طبية." to Gate 1 Requirements Agent
    const chatRes = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'أريد نظام إدارة عيادة طبية.',
        expectedVersion: 1,
      });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.status).toBe('succeeded');
    expect(chatRes.body.version).toBe(2);
    expect(chatRes.body.provider).toBe('gemini');
    expect(chatRes.body.model).toBe('gemini-3.8-flash');
    expect(chatRes.body.usage).toEqual({
      promptTokens: 295,
      completionTokens: 340,
      totalTokens: 635,
    });
    expect(chatRes.body.reply).toContain('وثيقة المتطلبات المهيكلة لنظام إدارة العيادة الطبية');
    expect(chatRes.body.document.projectName).toBe('نظام إدارة العيادة الطبية الذكي');
    expect(chatRes.body.document.features).toContain('إدارة وجدولة مواعيد العيادة والأطباء');
    expect(chatRes.body.document.userRoles.length).toBeGreaterThanOrEqual(3);
  });

  it('Test B: Document modification from "أضف إشعارات واتساب لتذكير المرضى بالمواعيد." preserving previous requirements', async () => {
    const modRes = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'أضف إشعارات واتساب لتذكير المرضى بالمواعيد.',
        expectedVersion: 2,
      });

    expect(modRes.status).toBe(200);
    expect(modRes.body.version).toBe(3);

    // Verify WhatsApp notifications added
    const features: string[] = modRes.body.document.features;
    const integrations: string[] = modRes.body.document.integrations;
    expect(features.some((f) => f.includes('إشعارات واتساب'))).toBe(true);
    expect(integrations.some((i) => i.includes('WhatsApp Business'))).toBe(true);

    // Verify previous requirements from Test A are preserved!
    expect(features).toContain('إدارة وجدولة مواعيد العيادة والأطباء');
    expect(features).toContain('الملف الطبي الإلكتروني للمريض (EMR) والتشخيص والوصفات');
    expect(modRes.body.document.projectName).toBe('نظام إدارة العيادة الطبية الذكي');
  });

  it('Test C: Manual editing saves changes, survives refresh, enforces concurrency version check, and informs subsequent AI request', async () => {
    // Fetch current state
    const getBefore = await request(appInstance)
      .get(`/api/projects/${projectAId}/gates/1`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getBefore.status).toBe(200);
    expect(getBefore.body.version).toBe(3);

    const editedDoc = {
      ...getBefore.body.document,
      businessRules: [
        ...getBefore.body.document.businessRules,
        'تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة',
      ],
    };

    // 1. Save manual edit
    const putRes = await request(appInstance)
      .put(`/api/projects/${projectAId}/gates/1/document`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        document: editedDoc,
        expectedVersion: 3,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.version).toBe(4);
    expect(putRes.body.document.businessRules).toContain(
      'تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة'
    );

    // 2. Verify stale version concurrency protection (sending expectedVersion: 3 should fail with 409)
    const staleRes = await request(appInstance)
      .put(`/api/projects/${projectAId}/gates/1/document`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        document: editedDoc,
        expectedVersion: 3,
      });
    expect(staleRes.status).toBe(409);

    // 3. Refresh / GET verifies manual edit persisted
    const getAfter = await request(appInstance)
      .get(`/api/projects/${projectAId}/gates/1`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getAfter.status).toBe(200);
    expect(getAfter.body.version).toBe(4);
    expect(getAfter.body.document.businessRules).toContain(
      'تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة'
    );

    // 4. Subsequent AI request receives the manually edited v4 document in its context
    const followUpChat = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'حدث الميزات بناءً على قاعدة تأكيد الهوية الوطنية للمريض.',
        expectedVersion: 4,
      });

    expect(followUpChat.status).toBe(200);
    expect(followUpChat.body.version).toBe(5);
    expect(lastPromptSentToProvider).toContain('تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة');
    expect(followUpChat.body.document.businessRules).toContain(
      'تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة'
    );
  });

  it('Test D: Invalid AI key in BYOK mode returns explicit error, never falls back to platform Gemini key, and does not update document', async () => {
    // Configure an invalid OpenAI BYOK key for User A
    const saveConn = await request(appInstance)
      .post('/api/ai-connections')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        provider: 'openai',
        model: 'gpt-4o-2024-11-20',
        apiKey: 'sk-INVALID_KEY_9999',
        active: true,
      });
    expect(saveConn.status).toBe(200);
    // Verify API key is masked and never exposed in plaintext
    expect(saveConn.body.connection.maskedKey).not.toContain('INVALID_KEY');
    expect((saveConn.body.connection as any).apiKey).toBeUndefined();

    // Create a BYOK project
    const byokProjRes = await request(appInstance)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'مشروع BYOK اختبار المفتاح',
        description: 'مشروع لاختبار فشل المفتاح غير الصالح',
        mode: 'byok',
      });
    expect(byokProjRes.status).toBe(201);
    const byokProjectId = byokProjRes.body.project.id;

    // Attempt Gate 1 chat (even if client maliciously passes mode: 'managed' in body, server must use stored 'byok' mode!)
    const failChatRes = await request(appInstance)
      .post(`/api/projects/${byokProjectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'أريد نظام محاسبة سحابي.',
        mode: 'managed', // Server must ignore this untrusted client mode
      });

    expect(failChatRes.status).toBe(401);
    expect(failChatRes.body.status).toBe('failed');
    expect(failChatRes.body.error).toContain('openai');
    expect(lastApiKeySentToProvider).toBe('sk-INVALID_KEY_9999');
    expect(lastModelSentToProvider).toBe('gpt-4o-2024-11-20');

    // Verify document version did NOT change and no false update occurred
    const checkState = await request(appInstance)
      .get(`/api/projects/${byokProjectId}/gates/1`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(checkState.status).toBe(200);
    expect(checkState.body.version).toBe(1);
    expect(checkState.body.chatHistory.length).toBe(1); // Only initial greeting remains

    // Now update customer's BYOK connection with a valid key and verify it uses customer's provider & model
    const validConn = await request(appInstance)
      .post('/api/ai-connections')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        provider: 'openai',
        model: 'gpt-4o-2024-11-20',
        apiKey: 'sk-VALID_CUSTOMER_BYOK_KEY_8888',
        active: true,
      });
    expect(validConn.status).toBe(200);

    const validByokChat = await request(appInstance)
      .post(`/api/projects/${byokProjectId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'أريد نظام إدارة عيادة طبية.',
        expectedVersion: 1,
      });
    expect(validByokChat.status).toBe(200);
    expect(validByokChat.body.provider).toBe('openai');
    expect(validByokChat.body.model).toBe('gpt-4o-2024-11-20');
    expect(lastApiKeySentToProvider).toBe('sk-VALID_CUSTOMER_BYOK_KEY_8888');
    expect(lastModelSentToProvider).toBe('gpt-4o-2024-11-20');
    expect(validByokChat.body.version).toBe(2);
  });

  it('Test E: Project isolation blocks User B from accessing or modifying User A project and Gate 1 document', async () => {
    const getProj = await request(appInstance)
      .get(`/api/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(getProj.status).toBe(403);

    const getGate1 = await request(appInstance)
      .get(`/api/projects/${projectAId}/gates/1`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(getGate1.status).toBe(403);

    const chatGate1 = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/chat`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ message: 'محاولة اختراق' });
    expect(chatGate1.status).toBe(403);

    const editGate1 = await request(appInstance)
      .put(`/api/projects/${projectAId}/gates/1/document`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ markdown: '# محاولة تعديل غير مصرح' });
    expect(editGate1.status).toBe(403);

    const approveGate1 = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({});
    expect(approveGate1.status).toBe(403);
  });

  it('Test F: Approval validates required sections, stores immutable snapshot, locks Gate 1, and delivers exact version to Gate 2', async () => {
    // 1. Before approval, approved-artifact endpoint returns 404
    const preArtifact = await request(appInstance)
      .get(`/api/projects/${projectAId}/gates/1/approved-artifact`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(preArtifact.status).toBe(404);

    // 2. Attempting to approve with an invalid/incomplete document fails validation and does NOT approve
    const invalidApprove = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        expectedVersion: 5,
        document: {
          projectName: '',
          overview: '',
          objectives: [],
          userRoles: [],
          features: [],
          userJourneys: [],
          businessRules: [],
          dataRequirements: [],
          integrations: [],
          acceptanceCriteria: [],
          assumptions: [],
          exclusions: [],
        },
      });
    expect(invalidApprove.status).toBe(400);

    // 3. Approve valid v5 document
    const approveRes = await request(appInstance)
      .post(`/api/projects/${projectAId}/gates/1/approve`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ expectedVersion: 5 });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.approval.approved).toBe(true);
    expect(approveRes.body.approval.approvedVersion).toBe(5);
    expect(approveRes.body.project.currentGate).toBe(2);

    // 4. Verify Gate 2 receives the exact approved v5 artifact
    const artifactRes = await request(appInstance)
      .get(`/api/projects/${projectAId}/gates/1/approved-artifact`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(artifactRes.status).toBe(200);
    expect(artifactRes.body.artifact.approvedVersion).toBe(5);
    expect(artifactRes.body.artifact.document.projectName).toBe('نظام إدارة العيادة الطبية الذكي');
    expect(
      artifactRes.body.artifact.document.features.some((f: string) => f.includes('إشعارات واتساب'))
    ).toBe(true);
    expect(artifactRes.body.artifact.document.businessRules).toContain(
      'تأكيد الهوية الوطنية للمريض إلزامي عند فتح الملف لأول مرة'
    );

    // 5. Verify locked Gate 1 rejects subsequent edits
    const editAfterLock = await request(appInstance)
      .put(`/api/projects/${projectAId}/gates/1/document`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ markdown: '# تعديل بعد القفل' });
    expect(editAfterLock.status).toBe(409);
  });

  it('Test G: Reload / Server restart preserves projects, chat history, document versions, and approved snapshot in SQLite', async () => {
    // Create a brand new Express app instance pointing to the same SQLite file on disk
    const restartedServer = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'test-vault-secret-2026',
      fetchImpl: mockProviderFetch,
      managedGeminiApiKey: 'AIzaSy_MANAGED_PLATFORM_TEST_KEY',
      isolateConfig: true,
    });

    const reloadGate1 = await request(restartedServer.app)
      .get(`/api/projects/${projectAId}/gates/1`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(reloadGate1.status).toBe(200);
    expect(reloadGate1.body.version).toBe(5);
    expect(reloadGate1.body.locked).toBe(true);
    expect(reloadGate1.body.document.projectName).toBe('نظام إدارة العيادة الطبية الذكي');
    expect(reloadGate1.body.chatHistory.length).toBe(7); // 1 initial + 3 user + 3 AI turns
    expect(reloadGate1.body.versions.length).toBeGreaterThanOrEqual(5);
    expect(reloadGate1.body.approval.approvedVersion).toBe(5);
  });
});
