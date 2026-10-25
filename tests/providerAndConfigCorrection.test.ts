import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server.ts';
import { executeProviderRequest } from '../src/server/ai/router.ts';
import {
  PROVIDER_ENDPOINT_REGISTRY,
  inferProviderType,
  normalizeGroqModelId,
  validateAndNormalizeEndpointForProvider,
} from '../src/server/ai/credentialResolver.ts';
import { ProviderHttpClient, ProviderType } from '../src/server/ai/types.ts';

describe('Phase 1 & Phase 2 — Provider Configuration Authority, Endpoint Validation & Adapter Contracts', () => {
  let tempDir: string;
  let dbFilePath: string;
  let appInstance: ReturnType<typeof createApp>['app'];

  const recordedRequests: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  }> = [];

  const mockHttpClient: ProviderHttpClient = async (inputUrl, init) => {
    const url = String(inputUrl);
    const method = (init?.method || 'POST').toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (typeof (init.headers as any).forEach === 'function') {
        (init.headers as any).forEach((v: string, k: string) => {
          headers[k] = v;
          headers[k.toLowerCase()] = v;
        });
      } else {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          if (typeof v === 'string') {
            headers[k] = v;
            headers[k.toLowerCase()] = v;
          }
        }
      }
    }
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    recordedRequests.push({ url, method, headers, body });

    if (url.startsWith('https://stitch.googleapis.com/artifacts/')) {
      return new Response(
        '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8" /></head><body class="bg-slate-950 text-white"><h1>واجهة Google Stitch الرسمية</h1></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (url.startsWith('https://stitch.googleapis.com/mcp')) {
      if (method === 'DELETE' || method === 'GET') {
        return new Response(null, { status: 200 });
      }
      const rpcMethod = body.method || '';
      if (rpcMethod === 'initialize') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
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
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              tools: [
                { name: 'create_project', inputSchema: { type: 'object' } },
                { name: 'get_project', inputSchema: { type: 'object' } },
                { name: 'list_projects', inputSchema: { type: 'object' } },
                { name: 'generate_screen_from_text', inputSchema: { type: 'object' } },
                { name: 'edit_screens', inputSchema: { type: 'object' } },
                { name: 'get_screen', inputSchema: { type: 'object' } },
                { name: 'list_screens', inputSchema: { type: 'object' } },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (rpcMethod === 'tools/call') {
        const toolName = body?.params?.name;
        if (toolName === 'create_project') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                structuredContent: { name: 'projects/stitch-phase2-proj', title: 'Stitch Project' },
                content: [{ type: 'text', text: JSON.stringify({ name: 'projects/stitch-phase2-proj' }) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (toolName === 'generate_screen_from_text' || toolName === 'edit_screens') {
          const payload = {
            outputComponents: [
              {
                design: {
                  screens: [
                    {
                      id: 'scr-phase2-1',
                      name: 'projects/stitch-phase2-proj/screens/scr-phase2-1',
                      title: 'Stitch Screen',
                      htmlCode: { downloadUrl: 'https://stitch.googleapis.com/artifacts/scr-phase2-1.html' },
                      screenshot: { downloadUrl: 'https://stitch.googleapis.com/artifacts/scr-phase2-1.png' },
                    },
                  ],
                },
              },
            ],
          };
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                structuredContent: payload,
                content: [{ type: 'text', text: JSON.stringify(payload) }],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Cohere v2 response shape
    if (url === 'https://api.cohere.com/v2/chat') {
      return new Response(
        JSON.stringify({
          id: 'cohere-msg-1',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Cohere V2 Verified Response' }],
          },
          usage: {
            tokens: { input_tokens: 12, output_tokens: 6 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Anthropic Messages API response shape
    if (url === 'https://api.anthropic.com/v1/messages') {
      return new Response(
        JSON.stringify({
          id: 'msg_anthropic_1',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Anthropic Messages Verified Response' }],
          usage: { input_tokens: 14, output_tokens: 7 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gemini generateContent response shape
    if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Gemini Native Verified Response' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Standard OpenAI-compatible chat completions response shape
    return new Response(
      JSON.stringify({
        id: 'chatcmpl-verified',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Verified response from ${url} using model ${body.model}`,
            },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 8,
          total_tokens: 19,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogroup-phase12-test-'));
    dbFilePath = path.join(tempDir, 'test-phase12.sqlite');

    const created = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'strict-phase12-encryption-secret',
      fetchImpl: mockHttpClient,
      managedGeminiApiKey: 'AIzaSy_MANAGED_ENV_KEY_FOR_TESTS',
      isolateConfig: true,
    });
    appInstance = created.app;
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('Phase 1 Mandatory Regression Test: Saved backend Groq provider with valid endpoint is never overwritten by stale browser localStorage pointing to Gemini, no auto-POST occurs, and no paid AI request is triggered', async () => {
    recordedRequests.length = 0;

    // 1. Save a valid Groq provider configuration on the backend
    const initialGet = await request(appInstance).get('/api/admin/config');
    expect(initialGet.status).toBe(200);

    const providersWithValidGroq = initialGet.body.providers.map((p: any) =>
      p.id === 'prov-groq'
        ? {
            ...p,
            providerType: 'groq',
            model: 'llama-3.3-70b-versatile',
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            apiKey: 'gsk_valid_saved_server_groq_key_123456',
            useSystemEnv: false,
            enabled: true,
          }
        : p
    );

    const saveRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: providersWithValidGroq,
        agents: initialGet.body.agents,
      });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.ok).toBe(true);

    const savedGroqOnServer = saveRes.body.providers.find((p: any) => p.id === 'prov-groq');
    expect(savedGroqOnServer.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(savedGroqOnServer.model).toBe('llama-3.3-70b-versatile');

    // 2. Verify src/App.tsx source code has no automatic POST /api/admin/config on mount and clears stale localStorage
    const appTsxSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    // Extract the mount useEffect block that fetches /api/admin/config
    const mountEffectMatch = appTsxSource.match(
      /\/\/ Load authoritative providers and agents from backend on mount[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\}, \[\]\);/
    );
    expect(mountEffectMatch).not.toBeNull();
    const mountEffectBody = mountEffectMatch![1];
    expect(mountEffectBody).toContain("fetch('/api/admin/config')");
    expect(mountEffectBody).not.toContain("method: 'POST'");
    expect(mountEffectBody).toContain("localStorage.removeItem('ogroup_factory_providers')");
    expect(mountEffectBody).toContain("localStorage.removeItem('ogroup_factory_agents')");

    // 3. Simulate browser page load with stale localStorage having Groq pointing to Gemini
    const staleBrowserLocalStorage: Record<string, string> = {
      ogroup_factory_providers: JSON.stringify([
        {
          id: 'prov-groq',
          name: 'Groq Cloud (LPU)',
          providerType: 'groq',
          model: 'llama-3.3-70b-versatile',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        },
      ]),
    };

    // Browser performs ONLY GET /api/admin/config on mount
    const mountGetRes = await request(appInstance).get('/api/admin/config');
    expect(mountGetRes.status).toBe(200);

    // Authoritative state hydrated into UI comes strictly from backend response, ignoring stale localStorage
    const uiDisplayedProviders = mountGetRes.body.providers;
    delete staleBrowserLocalStorage.ogroup_factory_providers;

    const uiGroqProvider = uiDisplayedProviders.find((p: any) => p.id === 'prov-groq');
    expect(uiGroqProvider.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(uiGroqProvider.model).toBe('llama-3.3-70b-versatile');

    // 4. Verify backend configuration remains unchanged and zero AI requests were triggered
    const afterLoadGetRes = await request(appInstance).get('/api/admin/config');
    const backendGroqAfterLoad = afterLoadGetRes.body.providers.find((p: any) => p.id === 'prov-groq');
    expect(backendGroqAfterLoad.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(recordedRequests.length).toBe(0);
  });

  it('Phase 1 Req 10-13: Server rejects cross-provider endpoint mismatches (e.g., Groq with Gemini endpoint) with HTTP 400 and never overwrites saved server state', async () => {
    const currentConfig = await request(appInstance).get('/api/admin/config');
    expect(currentConfig.status).toBe(200);

    // Attempt to save Groq with a Gemini endpoint
    const corruptedProviders = currentConfig.body.providers.map((p: any) =>
      p.id === 'prov-groq'
        ? {
            ...p,
            providerType: 'groq',
            model: 'llama-3.3-70b-versatile',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta',
          }
        : p
    );

    const badSaveRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: corruptedProviders,
        agents: currentConfig.body.agents,
      });

    expect(badSaveRes.status).toBe(400);
    expect(badSaveRes.body.ok).toBe(false);
    expect(badSaveRes.body.error.toLowerCase()).toContain('groq');

    // Verify the backend retained the valid Groq endpoint
    const verifyConfig = await request(appInstance).get('/api/admin/config');
    const groqOnServer = verifyConfig.body.providers.find((p: any) => p.id === 'prov-groq');
    expect(groqOnServer.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');

    // Attempt to save OpenAI with an Anthropic endpoint -> rejected with HTTP 400
    const badOpenAIProviders = currentConfig.body.providers.map((p: any) =>
      p.id === 'prov-openai'
        ? {
            ...p,
            providerType: 'openai',
            endpoint: 'https://api.anthropic.com/v1/messages',
          }
        : p
    );
    const badOpenAIRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: badOpenAIProviders,
        agents: currentConfig.body.agents,
      });
    expect(badOpenAIRes.status).toBe(400);
    expect(badOpenAIRes.body.ok).toBe(false);

    // Attempt to save a deliberately configured incompatible custom host on Groq -> rejected with 400 (not silently replaced!)
    const incompatibleCustomHostOnGroq = currentConfig.body.providers.map((p: any) =>
      p.id === 'prov-groq'
        ? {
            ...p,
            providerType: 'groq',
            endpoint: 'https://my-private-proxy.example.org/v1/chat/completions',
          }
        : p
    );
    const incompatibleRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: incompatibleCustomHostOnGroq,
        agents: currentConfig.body.agents,
      });
    expect(incompatibleRes.status).toBe(400);
    expect(incompatibleRes.body.ok).toBe(false);
  });

  it('Phase 1 Req 12 & 14: Custom OpenAI-compatible provider is allowed with valid endpoint, and existing encrypted keys are preserved at rest and across updates without replacement key', async () => {
    const currentConfig = await request(appInstance).get('/api/admin/config');

    // 1. Verify the previously saved Groq API key is encrypted at rest in SQLite (never plaintext)
    const rawDb = new DatabaseSync(dbFilePath);
    const row = rawDb.prepare("SELECT providers_json FROM admin_settings WHERE id = 'default'").get() as {
      providers_json: string;
    };
    rawDb.close();
    expect(row).toBeDefined();
    expect(row.providers_json).not.toContain('gsk_valid_saved_server_groq_key_123456');
    const parsedStoredProviders = JSON.parse(row.providers_json);
    const storedGroq = parsedStoredProviders.find((p: any) => p.id === 'prov-groq');
    expect(storedGroq.apiKey).toBe('');
    expect(typeof storedGroq.encryptedApiKey).toBe('string');
    expect(storedGroq.encryptedApiKey.length).toBeGreaterThan(20);

    // 2. Update Groq model while sending apiKey: '' (no replacement key) -> server must preserve existing key!
    const updateWithoutNewKey = currentConfig.body.providers.map((p: any) =>
      p.id === 'prov-groq'
        ? {
            ...p,
            model: 'llama-3.1-8b-instant',
            apiKey: '',
            useSystemEnv: false,
          }
        : p
    );
    const updateRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: updateWithoutNewKey,
        agents: currentConfig.body.agents,
      });
    expect(updateRes.status).toBe(200);
    const updatedGroq = updateRes.body.providers.find((p: any) => p.id === 'prov-groq');
    expect(updatedGroq.model).toBe('llama-3.1-8b-instant');
    // Rule 14: API responses never expose plaintext keys, returning hasKey + maskedKey instead
    expect(updatedGroq.apiKey).toBe('');
    expect(updatedGroq.hasKey).toBe(true);
    expect(updatedGroq.maskedKey).toBe('gsk_••••••••3456');

    // Verify the preserved server-side key is actually used when testing connection without sending customKey
    recordedRequests.length = 0;
    const testPreservedKeyRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({ providerId: 'prov-groq' });
    expect(testPreservedKeyRes.status).toBe(200);
    expect(testPreservedKeyRes.body.ok).toBe(true);
    expect(recordedRequests.length).toBe(1);
    expect(recordedRequests[0].headers.Authorization).toBe('Bearer gsk_valid_saved_server_groq_key_123456');

    // 3. Add an explicit custom-compatible provider with a valid custom endpoint
    const customProvider = {
      id: 'prov-custom-vllm',
      name: 'Enterprise vLLM Gateway',
      providerType: 'custom',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      status: 'active',
      enabled: true,
      apiKey: 'sk-custom-vllm-secret-key-999',
      useSystemEnv: false,
      endpoint: 'https://vllm.enterprise.example.com/v1',
      latency: '90ms',
      assignedGates: ['GATE 03'],
      monthlyQuotaJod: 500,
      usedQuotaJod: 0,
    };

    const addCustomRes = await request(appInstance)
      .post('/api/admin/config')
      .send({
        providers: [...updateRes.body.providers, customProvider],
        agents: currentConfig.body.agents,
      });
    expect(addCustomRes.status).toBe(200);
    const savedCustom = addCustomRes.body.providers.find((p: any) => p.id === 'prov-custom-vllm');
    expect(savedCustom).toBeDefined();
    expect(savedCustom.endpoint).toBe('https://vllm.enterprise.example.com/v1/chat/completions');
  });

  it('Phase 2: Endpoint validation & normalization prevents duplicate /chat/completions, normalizes base URLs, and blocks cross-provider credentials', () => {
    // Groq base URLs normalize to https://api.groq.com/openai/v1/chat/completions
    for (const rawUrl of [
      'https://api.groq.com',
      'https://api.groq.com/',
      'https://api.groq.com/openai',
      'https://api.groq.com/openai/v1',
      'https://api.groq.com/openai/v1/chat/completions',
      'https://api.groq.com/openai/v1/chat/completions/chat/completions',
    ]) {
      const check = validateAndNormalizeEndpointForProvider('groq', rawUrl);
      expect(check.valid).toBe(true);
      expect(check.endpoint).toBe('https://api.groq.com/openai/v1/chat/completions');
    }

    // OpenAI base URLs normalize to https://api.openai.com/v1/chat/completions
    for (const rawUrl of [
      'https://api.openai.com',
      'https://api.openai.com/v1',
      'https://api.openai.com/v1/chat/completions',
      'https://api.openai.com/v1/chat/completions/chat/completions',
    ]) {
      const check = validateAndNormalizeEndpointForProvider('openai', rawUrl);
      expect(check.valid).toBe(true);
      expect(check.endpoint).toBe('https://api.openai.com/v1/chat/completions');
    }

    // Anthropic base URLs normalize to https://api.anthropic.com/v1/messages
    for (const rawUrl of [
      'https://api.anthropic.com',
      'https://api.anthropic.com/v1',
      'https://api.anthropic.com/v1/messages',
    ]) {
      const check = validateAndNormalizeEndpointForProvider('anthropic', rawUrl);
      expect(check.valid).toBe(true);
      expect(check.endpoint).toBe('https://api.anthropic.com/v1/messages');
    }

    // DeepSeek base URLs normalize to https://api.deepseek.com/v1/chat/completions
    expect(validateAndNormalizeEndpointForProvider('deepseek', 'https://api.deepseek.com').endpoint).toBe(
      'https://api.deepseek.com/v1/chat/completions'
    );

    // OpenRouter base URLs normalize to https://openrouter.ai/api/v1/chat/completions
    expect(validateAndNormalizeEndpointForProvider('openrouter', 'https://openrouter.ai/api/v1').endpoint).toBe(
      'https://openrouter.ai/api/v1/chat/completions'
    );

    // Cohere base URLs normalize to https://api.cohere.com/v2/chat
    expect(validateAndNormalizeEndpointForProvider('cohere', 'https://api.cohere.com').endpoint).toBe(
      'https://api.cohere.com/v2/chat'
    );

    // Perplexity base URLs normalize to https://api.perplexity.ai/chat/completions
    expect(validateAndNormalizeEndpointForProvider('perplexity', 'https://api.perplexity.ai').endpoint).toBe(
      'https://api.perplexity.ai/chat/completions'
    );
  });

  it('Phase 2: All verified adapters execute with their exact protocol, headers, endpoint, and model without falling back to Gemini', async () => {
    const providerTestCases: Array<{
      providerType: ProviderType;
      providerId: string;
      providerName: string;
      model: string;
      apiKey: string;
      expectedUrl: string;
      verifyHeaders: (headers: Record<string, string>) => void;
    }> = [
      {
        providerType: 'groq',
        providerId: 'prov-groq',
        providerName: 'Groq Cloud',
        model: 'llama-3.3-70b-versatile',
        apiKey: 'gsk_live_test_key_12345',
        expectedUrl: 'https://api.groq.com/openai/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer gsk_live_test_key_12345'),
      },
      {
        providerType: 'openai',
        providerId: 'prov-openai',
        providerName: 'OpenAI Platform',
        model: 'gpt-4o-2024-11-20',
        apiKey: 'sk-proj-openai-test-12345',
        expectedUrl: 'https://api.openai.com/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer sk-proj-openai-test-12345'),
      },
      {
        providerType: 'anthropic',
        providerId: 'prov-anthropic',
        providerName: 'Anthropic Claude',
        model: 'claude-3-7-sonnet',
        apiKey: 'sk-ant-api03-test-12345',
        expectedUrl: 'https://api.anthropic.com/v1/messages',
        verifyHeaders: (h) => {
          expect(h['x-api-key']).toBe('sk-ant-api03-test-12345');
          expect(h['anthropic-version']).toBe('2023-06-01');
        },
      },
      {
        providerType: 'gemini',
        providerId: 'prov-gemini',
        providerName: 'Google Gemini',
        model: 'gemini-2.5-flash',
        apiKey: 'AIzaSy_GEMINI_DIRECT_TEST_KEY',
        expectedUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        verifyHeaders: (h) => expect(h['x-goog-api-key']).toBe('AIzaSy_GEMINI_DIRECT_TEST_KEY'),
      },
      {
        providerType: 'deepseek',
        providerId: 'prov-deepseek',
        providerName: 'DeepSeek AI',
        model: 'deepseek-chat',
        apiKey: 'sk-deepseek-test-12345',
        expectedUrl: 'https://api.deepseek.com/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer sk-deepseek-test-12345'),
      },
      {
        providerType: 'openrouter',
        providerId: 'prov-openrouter',
        providerName: 'OpenRouter',
        model: 'openrouter/auto',
        apiKey: 'sk-or-v1-test-12345',
        expectedUrl: 'https://openrouter.ai/api/v1/chat/completions',
        verifyHeaders: (h) => {
          expect(h.Authorization).toBe('Bearer sk-or-v1-test-12345');
          expect(h['HTTP-Referer']).toBeDefined();
          expect(h['X-Title']).toBe('OGroup AI Factory');
        },
      },
      {
        providerType: 'mistral',
        providerId: 'prov-mistral',
        providerName: 'Mistral AI',
        model: 'codestral-latest',
        apiKey: 'mistral-test-key-12345',
        expectedUrl: 'https://api.mistral.ai/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer mistral-test-key-12345'),
      },
      {
        providerType: 'xai',
        providerId: 'prov-xai',
        providerName: 'xAI Grok',
        model: 'grok-3',
        apiKey: 'xai-test-key-12345',
        expectedUrl: 'https://api.x.ai/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer xai-test-key-12345'),
      },
      {
        providerType: 'together',
        providerId: 'prov-together',
        providerName: 'Together AI',
        model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        apiKey: 'together-test-key-12345',
        expectedUrl: 'https://api.together.xyz/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer together-test-key-12345'),
      },
      {
        providerType: 'perplexity',
        providerId: 'prov-perplexity',
        providerName: 'Perplexity Sonar',
        model: 'sonar-pro',
        apiKey: 'pplx-test-key-12345',
        expectedUrl: 'https://api.perplexity.ai/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer pplx-test-key-12345'),
      },
      {
        providerType: 'v0',
        providerId: 'prov-v0',
        providerName: 'Vercel v0',
        model: 'v0-1.0-md',
        apiKey: 'v0-test-key-12345',
        expectedUrl: 'https://api.v0.dev/v1/chat/completions',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer v0-test-key-12345'),
      },
      {
        providerType: 'cohere',
        providerId: 'prov-cohere',
        providerName: 'Cohere Command R+',
        model: 'command-r-plus-08-2024',
        apiKey: 'cohere-test-key-12345',
        expectedUrl: 'https://api.cohere.com/v2/chat',
        verifyHeaders: (h) => expect(h.Authorization).toBe('Bearer cohere-test-key-12345'),
      },
    ];

    for (const tc of providerTestCases) {
      recordedRequests.length = 0;
      const response = await executeProviderRequest(
        {
          providerType: tc.providerType,
          providerId: tc.providerId,
          providerName: tc.providerName,
          configuredModel: tc.model,
          endpoint: PROVIDER_ENDPOINT_REGISTRY[tc.providerType].defaultEndpoint,
          apiKey: tc.apiKey,
          keySource: 'Test Suite Key',
          systemPrompt: 'System verification instruction',
          userPrompt: 'Connection Verification Test',
        },
        { fetchImpl: mockHttpClient }
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe('succeeded');
      expect(recordedRequests.length).toBe(1);
      expect(recordedRequests[0].url).toBe(tc.expectedUrl);
      tc.verifyHeaders(recordedRequests[0].headers);
    }

    // Verify Stitch MCP requires an actual Stitch API key (never synthesizes locally without a key)
    recordedRequests.length = 0;
    const stitchNoKeyRes = await executeProviderRequest(
      {
        providerType: 'stitch',
        providerId: 'prov-stitch',
        providerName: 'Google Stitch (UI/UX Design AI)',
        configuredModel: 'GEMINI_3_FLASH',
        endpoint: 'https://stitch.googleapis.com/mcp',
        apiKey: '',
        keySource: 'Missing Key',
        userPrompt: 'Connection Verification Test',
      },
      { fetchImpl: mockHttpClient }
    );
    expect(stitchNoKeyRes.ok).toBe(false);
    expect(stitchNoKeyRes.status).toBe('auth_error');
    expect(recordedRequests.length).toBe(0);

    // Verify Stitch MCP succeeds with a valid Stitch API key against https://stitch.googleapis.com/mcp
    recordedRequests.length = 0;
    const stitchPingRes = await executeProviderRequest(
      {
        providerType: 'stitch',
        providerId: 'prov-stitch',
        providerName: 'Google Stitch (UI/UX Design AI)',
        configuredModel: 'GEMINI_3_FLASH',
        endpoint: 'https://stitch.googleapis.com/mcp',
        apiKey: 'AQ.ValidStitchKey_Phase2_12345',
        keySource: 'Admin Stitch Key',
        userPrompt: 'Connection Verification Test',
      },
      { fetchImpl: mockHttpClient }
    );
    expect(stitchPingRes.ok).toBe(true);
    expect(stitchPingRes.status).toBe('succeeded');
    expect(stitchPingRes.transport).toBe('mcp');
    expect(stitchPingRes.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');
    expect(stitchPingRes.authenticationVerified).toBe(true);
    expect(stitchPingRes.toolDiscoveryVerified).toBe(true);
    expect(stitchPingRes.response).toContain('Google Stitch');
    expect(recordedRequests.some((r) => r.url === 'https://stitch.googleapis.com/mcp')).toBe(true);

    const stitchDesignRes = await executeProviderRequest(
      {
        providerType: 'stitch',
        providerId: 'prov-stitch',
        providerName: 'Google Stitch (UI/UX Design AI)',
        configuredModel: 'GEMINI_3_FLASH',
        endpoint: 'https://stitch.googleapis.com/mcp',
        apiKey: 'AQ.ValidStitchKey_Phase2_12345',
        keySource: 'Admin Stitch Key',
        userPrompt: `Create or update the Gate 2 UI/UX DesignArtifact based on the following inputs:\n\nApproved Gate 1 PRD (Version v1):\n{\n  "projectName": "موقع لبيع السيارات",\n  "overview": "منصة بيع وشراء السيارات",\n  "features": ["إعلانات السيارات", "البحث والفلاتر", "تفاصيل السيارة"]\n}\n\nCustomer Design Instruction:\nصمم واجهات موقع بيع السيارات`,
      },
      { fetchImpl: mockHttpClient }
    );
    expect(stitchDesignRes.ok).toBe(true);
    expect(stitchDesignRes.status).toBe('succeeded');
    const parsedStitchDesign = JSON.parse(stitchDesignRes.response || '{}');
    expect(parsedStitchDesign.design.designSpecification.direction).toBe('rtl');
    expect(parsedStitchDesign.design.screenInventory.length).toBe(6);
    expect(parsedStitchDesign.design.stitchMetadata.remoteProjectId).toBe('stitch-phase2-proj');

    // Verify Gate 2 Agent is assigned to Google Stitch by default and /api/admin/test-connection verifies MCP with a key
    const adminCheckRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({ gate: 2, customKey: 'AQ.ValidStitchKey_Phase2_12345' });
    expect(adminCheckRes.status).toBe(200);
    expect(adminCheckRes.body.ok).toBe(true);
    expect(adminCheckRes.body.providerType).toBe('stitch');
    expect(adminCheckRes.body.transport).toBe('mcp');
    expect(adminCheckRes.body.remoteEndpoint).toBe('https://stitch.googleapis.com/mcp');

    recordedRequests.length = 0;
    const cloudRes = await executeProviderRequest(
      {
        providerType: 'cloud',
        providerId: 'prov-cloud',
        providerName: 'AWS Bedrock',
        configuredModel: 'claude-3-5-sonnet-bedrock',
        endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
        apiKey: 'aws-key-123',
        keySource: 'Test Suite',
        userPrompt: 'Test Cloud',
      },
      { fetchImpl: mockHttpClient }
    );
    expect(cloudRes.ok).toBe(false);
    expect(cloudRes.status).toBe('unsupported_protocol');
    expect(recordedRequests.length).toBe(0);
  });

  it('Rule 7, 8 & 14: Failed non-Gemini provider never falls back to Gemini and never leaks API keys in error messages', async () => {
    const failingGroqClient: ProviderHttpClient = async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Invalid API Key gsk_super_secret_key_do_not_leak_999999 provided to Groq',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await executeProviderRequest(
      {
        providerType: 'groq',
        providerId: 'prov-groq',
        providerName: 'Groq Cloud',
        configuredModel: 'llama-3.3-70b-versatile',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'gsk_super_secret_key_do_not_leak_999999',
        keySource: 'Provider Vault',
        userPrompt: 'Hello Groq',
      },
      { fetchImpl: failingGroqClient }
    );

    expect(res.ok).toBe(false);
    expect(res.status).toBe('auth_error');
    expect(res.providerType).toBe('groq');
    expect(res.error).not.toContain('gsk_super_secret_key_do_not_leak_999999');
    expect(res.error).toContain('[REDACTED_API_KEY]');
  });

  it('Groq Console Models: GPT OSS 120B/20B, Qwen 3.8 27B, Safety GPT OSS 20B, Orpheus TTS, and Whisper v3 resolve to Groq and execute with canonical model IDs', async () => {
    const groqModels = [
      { input: 'openai/gpt-oss-120b', expected: 'openai/gpt-oss-120b' },
      { input: 'GPT OSS 120B', expected: 'openai/gpt-oss-120b' },
      { input: 'gpt-oss-120b', expected: 'openai/gpt-oss-120b' },
      { input: 'openai/gpt-oss-20b', expected: 'openai/gpt-oss-20b' },
      { input: 'GPT OSS 20B', expected: 'openai/gpt-oss-20b' },
      { input: 'qwen/qwen-3.8-27b', expected: 'qwen/qwen-3.8-27b' },
      { input: 'Qwen 3.8 27B', expected: 'qwen/qwen-3.8-27b' },
      { input: 'openai/gpt-oss-safeguard-20b', expected: 'openai/gpt-oss-safeguard-20b' },
      { input: 'Safety GPT OSS 20B', expected: 'openai/gpt-oss-safeguard-20b' },
      { input: 'canopylabs/orpheus-arabic-saudi', expected: 'canopylabs/orpheus-arabic-saudi' },
      { input: 'Orpheus Arabic Saudi', expected: 'canopylabs/orpheus-arabic-saudi' },
      { input: 'canopylabs/orpheus-v1-english', expected: 'canopylabs/orpheus-v1-english' },
      { input: 'Orpheus English', expected: 'canopylabs/orpheus-v1-english' },
      { input: 'whisper-large-v3', expected: 'whisper-large-v3' },
      { input: 'Whisper Large v3 Turbo', expected: 'whisper-large-v3-turbo' },
    ];

    for (const item of groqModels) {
      expect(normalizeGroqModelId(item.input)).toBe(item.expected);
      expect(inferProviderType({ model: item.input })).toBe('groq');
    }

    recordedRequests.length = 0;
    const res = await executeProviderRequest(
      {
        providerType: 'groq',
        providerId: 'prov-groq',
        providerName: 'Groq Cloud LPU Engine',
        configuredModel: 'GPT OSS 120B',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'gsk_test_groq_oss_120b',
        keySource: 'Provider Vault',
        userPrompt: 'Test GPT OSS 120B on Groq',
      },
      { fetchImpl: mockHttpClient }
    );

    expect(res.ok).toBe(true);
    expect(recordedRequests.length).toBe(1);
    expect(recordedRequests[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(recordedRequests[0].body.model).toBe('openai/gpt-oss-120b');
  });

  it('Regression Test: Saved Groq / Non-Stitch Provider & Agent keys work when browser sends redacted providerConfig/agentConfig (apiKey: "") and syncs model to linked gates', async () => {
    const initialRes = await request(appInstance).get('/api/admin/config');
    expect(initialRes.status).toBe(200);

    // 1. Configure Groq with openai/gpt-oss-120b and custom key (useSystemEnv: false), and link Gate 1 to prov-groq
    const updatedProviders = initialRes.body.providers.map((p: any) =>
      p.id === 'prov-groq'
        ? {
            ...p,
            model: 'openai/gpt-oss-120b',
            apiKey: 'gsk_browser_saved_groq_key_987654',
            useSystemEnv: false,
            enabled: true,
          }
        : p
    );
    const updatedAgents = initialRes.body.agents.map((a: any) =>
      a.gate === 1
        ? {
            ...a,
            providerId: 'prov-groq',
            providerName: 'Groq Cloud LPU Engine',
            model: 'openai/gpt-oss-120b',
            useProviderKey: true,
          }
        : a
    );

    const saveRes = await request(appInstance)
      .post('/api/admin/config')
      .send({ providers: updatedProviders, agents: updatedAgents });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.ok).toBe(true);

    // Server returns redacted apiKey: '' with hasKey: true and maskedKey
    const redactedGroqProv = saveRes.body.providers.find((p: any) => p.id === 'prov-groq');
    const redactedGate1Agent = saveRes.body.agents.find((a: any) => a.gate === 1);
    expect(redactedGroqProv.apiKey).toBe('');
    expect(redactedGroqProv.hasKey).toBe(true);
    expect(redactedGroqProv.maskedKey).toBe('gsk_••••••••7654');

    // 2. Simulate clicking "اختبار المفتاح والاتصال" on the Groq provider card in the browser
    // (which sends providerConfig with apiKey: '' from React state)
    recordedRequests.length = 0;
    const provTestRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        gate: 1,
        providerId: 'prov-groq',
        providers: saveRes.body.providers,
        agents: saveRes.body.agents,
        agentConfig: redactedGate1Agent,
        providerConfig: redactedGroqProv,
      });
    expect(provTestRes.status).toBe(200);
    expect(provTestRes.body.ok).toBe(true);
    expect(recordedRequests.length).toBe(1);
    expect(recordedRequests[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(recordedRequests[0].body.model).toBe('openai/gpt-oss-120b');
    expect(recordedRequests[0].headers.Authorization).toBe('Bearer gsk_browser_saved_groq_key_987654');

    // 3. Simulate clicking "اختبار الوكيل والمفتاح حياً" on Gate 1 Agent card in the browser
    // (which sends agentConfig and providerConfig with apiKey: '')
    recordedRequests.length = 0;
    const agentTestRes = await request(appInstance)
      .post('/api/admin/test-connection')
      .send({
        gate: 1,
        providers: saveRes.body.providers,
        agents: saveRes.body.agents,
        agentConfig: redactedGate1Agent,
        providerConfig: redactedGroqProv,
      });
    expect(agentTestRes.status).toBe(200);
    expect(agentTestRes.body.ok).toBe(true);
    expect(recordedRequests.length).toBe(1);
    expect(recordedRequests[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(recordedRequests[0].body.model).toBe('openai/gpt-oss-120b');
    expect(recordedRequests[0].headers.Authorization).toBe('Bearer gsk_browser_saved_groq_key_987654');
  });
});

