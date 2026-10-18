import { GoogleGenAI, Type } from '@google/genai';
import {
  RequirementsDocument,
  mergeRequirementsDocument,
  validateRequirementsDocument,
} from '../shared/requirementsSchema.ts';

export interface TokenUsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface RequirementsAgentExecutionInput {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  userMessage: string;
  currentDocument: RequirementsDocument;
  chatHistory: { sender: 'user' | 'ai'; text: string }[];
}

export interface RequirementsAgentExecutionResult {
  reply: string;
  updatedDocument: RequirementsDocument;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}

export type ProviderHttpClient = typeof fetch;

const REQUIREMENTS_SYSTEM_INSTRUCTION = `You are the Gate 1 Requirements Agent (وكيل المتطلبات وتحليل الأعمال) at OGroup AI Factory.
Your mission is to:
1. Understand the customer's software idea and requirements thoroughly.
2. Ask 1 to 3 relevant, practical clarification questions to refine scope.
3. Generate or update a professional, structured Product Requirements Document (PRD).
4. When the user requests a modification or addition (e.g., adding WhatsApp notifications), add the requested capability to the relevant sections (such as features, integrations, userJourneys, acceptanceCriteria) while PRESERVING all previously confirmed requirements.
5. Avoid overwriting unrelated sections.
6. Respond in the same language the user writes in (Arabic or English).

You MUST return ONLY a valid JSON object matching this exact structure:
{
  "reply": "Natural conversational response to the user (including summary of updates and 1-3 clarification questions)",
  "replaceSections": [],
  "documentUpdate": {
    "projectName": "string",
    "overview": "string",
    "objectives": ["string"],
    "userRoles": ["string"],
    "features": ["string"],
    "userJourneys": ["string"],
    "businessRules": ["string"],
    "dataRequirements": ["string"],
    "integrations": ["string"],
    "acceptanceCriteria": ["string"],
    "assumptions": ["string"],
    "exclusions": ["string"]
  }
}`;

function extractJsonObject(rawText: string): Record<string, unknown> {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    throw new Error('استجابة المزود فارغة ولا تحتوي على بيانات JSON صالحة.');
  }

  // Strip optional markdown code fences if present
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Try extracting the first {...} block
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = candidate.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  }

  throw new Error('فشل التحقق من مخرجات الوكيل: الاستجابة ليست كائن JSON مهيكل صالح.');
}

function buildUserPrompt(input: RequirementsAgentExecutionInput): string {
  const recentHistory = input.chatHistory
    .slice(-8)
    .map((m) => `${m.sender === 'user' ? 'User' : 'Requirements Agent'}: ${m.text}`)
    .join('\n');

  return [
    `Current Requirements Document (JSON):`,
    JSON.stringify(input.currentDocument, null, 2),
    '',
    recentHistory ? `Recent Conversation History:\n${recentHistory}\n` : '',
    `Latest Customer Message:`,
    input.userMessage,
    '',
    `Instructions:`,
    `- Update the requirements document based on the Latest Customer Message.`,
    `- Preserve existing requirements in all sections unless the user explicitly asks to remove or replace them.`,
    `- Return ONLY the JSON object with "reply", "replaceSections", and "documentUpdate".`,
  ].join('\n');
}

function defaultEndpointForProvider(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions';
    case 'mistral':
      return 'https://api.mistral.ai/v1/chat/completions';
    case 'xai':
      return 'https://api.x.ai/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    case 'perplexity':
      return 'https://api.perplexity.ai/chat/completions';
    case 'together':
      return 'https://api.together.xyz/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    default:
      return '';
  }
}

export async function executeRequirementsAgent(
  input: RequirementsAgentExecutionInput,
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<RequirementsAgentExecutionResult> {
  const fetchFn = options.fetchImpl || globalThis.fetch;
  const provider = (input.provider || '').trim().toLowerCase();
  const model = (input.model || '').trim();
  const apiKey = (input.apiKey || '').trim();

  if (!provider) {
    const err: any = new Error('لم يتم تحديد مزود الذكاء الاصطناعي (Provider).');
    err.statusCode = 400;
    throw err;
  }
  if (!model) {
    const err: any = new Error('لم يتم تحديد نموذج الذكاء الاصطناعي (Model).');
    err.statusCode = 400;
    throw err;
  }
  if (!apiKey) {
    const err: any = new Error(`مفتاح API غير متوفر للمزود المحدد (${provider}). يرجى التحقق من إعدادات المفتاح.`);
    err.statusCode = 401;
    throw err;
  }

  const promptText = buildUserPrompt(input);
  let rawModelOutput = '';
  let usage: TokenUsageMetrics | null = null;

  if (provider === 'gemini') {
    // If a custom fetchImpl is provided (e.g. in automated tests) or if calling Gemini REST/SDK
    if (options.fetchImpl) {
      const endpoint =
        input.endpoint ||
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const resp = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: REQUIREMENTS_SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        }),
      });

      if (!resp.ok) {
        let errDetail = `HTTP ${resp.status}`;
        try {
          const errJson: any = await resp.json();
          errDetail = errJson?.error?.message || errJson?.error || errDetail;
        } catch {}
        const err: any = new Error(`فشل طلب المزود (gemini / ${model}): ${errDetail}`);
        err.statusCode = resp.status === 401 || resp.status === 403 ? 401 : 502;
        throw err;
      }

      const data: any = await resp.json();
      rawModelOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (data?.usageMetadata) {
        usage = {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        };
      }
    } else {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction: REQUIREMENTS_SYSTEM_INSTRUCTION,
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                replaceSections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                documentUpdate: {
                  type: Type.OBJECT,
                  properties: {
                    projectName: { type: Type.STRING },
                    overview: { type: Type.STRING },
                    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                    userRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } },
                    userJourneys: { type: Type.ARRAY, items: { type: Type.STRING } },
                    businessRules: { type: Type.ARRAY, items: { type: Type.STRING } },
                    dataRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    integrations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    exclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: [
                    'projectName',
                    'overview',
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
                },
              },
              required: ['reply', 'documentUpdate'],
            },
          },
        });

        rawModelOutput = response.text || '';
        if (response.usageMetadata) {
          usage = {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          };
        }
      } catch (sdkErr: any) {
        const msg = sdkErr?.message || 'Gemini provider error';
        const err: any = new Error(`فشل طلب المزود (gemini / ${model}): ${msg}`);
        err.statusCode = msg.toLowerCase().includes('api key') || msg.includes('401') || msg.includes('403') ? 401 : 502;
        throw err;
      }
    }
  } else if (provider === 'anthropic') {
    const endpoint = input.endpoint || defaultEndpointForProvider('anthropic');
    const resp = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: REQUIREMENTS_SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: promptText }],
      }),
    });

    if (!resp.ok) {
      let errDetail = `HTTP ${resp.status}`;
      try {
        const errJson: any = await resp.json();
        errDetail = errJson?.error?.message || errJson?.error || errDetail;
      } catch {}
      const err: any = new Error(`فشل طلب المزود (anthropic / ${model}): ${errDetail}`);
      err.statusCode = resp.status === 401 || resp.status === 403 ? 401 : 502;
      throw err;
    }

    const data: any = await resp.json();
    rawModelOutput = data?.content?.[0]?.text || '';
    if (data?.usage) {
      const p = typeof data.usage.input_tokens === 'number' ? data.usage.input_tokens : undefined;
      const c = typeof data.usage.output_tokens === 'number' ? data.usage.output_tokens : undefined;
      usage = {
        promptTokens: p,
        completionTokens: c,
        totalTokens: typeof p === 'number' && typeof c === 'number' ? p + c : undefined,
      };
    }
  } else {
    // OpenAI, Groq, DeepSeek, Mistral, xAI, OpenRouter, Together, Perplexity, Custom
    const endpoint = input.endpoint || defaultEndpointForProvider(provider);
    if (!endpoint) {
      const err: any = new Error(`عنوان الاتصال (Endpoint) غير محدد للمزود (${provider}).`);
      err.statusCode = 400;
      throw err;
    }

    const resp = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REQUIREMENTS_SYSTEM_INSTRUCTION },
          { role: 'user', content: promptText },
        ],
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      let errDetail = `HTTP ${resp.status}`;
      try {
        const errJson: any = await resp.json();
        errDetail = errJson?.error?.message || errJson?.error || errDetail;
      } catch {}
      const err: any = new Error(`فشل طلب المزود (${provider} / ${model}): ${errDetail}`);
      err.statusCode = resp.status === 401 || resp.status === 403 ? 401 : 502;
      throw err;
    }

    const data: any = await resp.json();
    rawModelOutput = data?.choices?.[0]?.message?.content || '';
    if (data?.usage) {
      usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };
    }
  }

  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = extractJsonObject(rawModelOutput);
  } catch (parseErr: any) {
    const err: any = new Error(parseErr.message || 'فشل تحليل استجابة الوكيل كـ JSON مهيكل.');
    err.statusCode = 422;
    throw err;
  }

  const reply = typeof parsedPayload.reply === 'string' ? parsedPayload.reply.trim() : '';
  if (!reply) {
    const err: any = new Error('استجابة وكيل المتطلبات لا تحتوي على رد محادثة صالح (reply).');
    err.statusCode = 422;
    throw err;
  }

  const rawUpdate = parsedPayload.documentUpdate;
  if (!rawUpdate || typeof rawUpdate !== 'object' || Array.isArray(rawUpdate)) {
    const err: any = new Error('استجابة وكيل المتطلبات لا تحتوي على كائن تحديث الوثيقة المهيكل (documentUpdate).');
    err.statusCode = 422;
    throw err;
  }

  const replaceSections = Array.isArray(parsedPayload.replaceSections)
    ? (parsedPayload.replaceSections.filter((s): s is keyof RequirementsDocument => typeof s === 'string') as (keyof RequirementsDocument)[])
    : [];

  const merged = mergeRequirementsDocument(
    input.currentDocument,
    rawUpdate as Partial<RequirementsDocument>,
    replaceSections
  );

  const validation = validateRequirementsDocument(merged);
  if (!validation.valid || !validation.document) {
    const err: any = new Error(`وثيقة المتطلبات المحدثة غير صالحة هيكلياً: ${validation.errors.join(' | ')}`);
    err.statusCode = 422;
    throw err;
  }

  return {
    reply,
    updatedDocument: validation.document,
    providerUsed: provider,
    modelUsed: model,
    usage,
  };
}
