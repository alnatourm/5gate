import { Type } from '@google/genai';
import {
  RequirementsDocument,
  mergeRequirementsDocument,
  validateRequirementsDocument,
} from '../shared/requirementsSchema.ts';
import { executeProviderRequest } from './ai/router.ts';
import { inferProviderType } from './ai/credentialResolver.ts';
import { ProviderHttpClient, TokenUsageMetrics } from './ai/types.ts';

export type { ProviderHttpClient, TokenUsageMetrics };

export interface RequirementsAgentExecutionInput {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  userMessage: string;
  currentDocument: RequirementsDocument;
  chatHistory: { sender: 'user' | 'ai'; text: string }[];
  timeoutMs?: number;
}

export interface RequirementsAgentExecutionResult {
  reply: string;
  updatedDocument: RequirementsDocument;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}

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

export function extractJsonObject(rawText: string): Record<string, unknown> {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    throw new Error('استجابة المزود فارغة ولا تحتوي على بيانات JSON صالحة.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
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

export async function executeRequirementsAgent(
  input: RequirementsAgentExecutionInput,
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<RequirementsAgentExecutionResult> {
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
  if (!apiKey && provider !== 'stitch') {
    const err: any = new Error(`مفتاح API غير متوفر للمزود المحدد (${provider}). يرجى التحقق من إعدادات المفتاح.`);
    err.statusCode = 401;
    throw err;
  }

  const providerType = inferProviderType({ provider, endpoint: input.endpoint });
  const promptText = buildUserPrompt(input);

  const geminiJsonSchema = {
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
  };

  const adapterResult = await executeProviderRequest(
    {
      providerId: provider,
      providerType,
      configuredModel: model,
      apiKey,
      keySource: 'Gate 1 Agent',
      endpoint: input.endpoint,
      systemPrompt: REQUIREMENTS_SYSTEM_INSTRUCTION,
      userPrompt: promptText,
      responseFormat: 'json',
      jsonSchema: geminiJsonSchema,
      temperature: 0.4,
      timeoutMs: input.timeoutMs,
      agentGate: 1,
    },
    options
  );

  if (!adapterResult.ok) {
    const err: any = new Error(adapterResult.error || `فشل طلب المزود (${provider} / ${model}).`);
    err.statusCode = adapterResult.statusCode || 502;
    err.executionStatus = adapterResult.status;
    throw err;
  }

  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = extractJsonObject(adapterResult.response);
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
    modelUsed: adapterResult.executedModel || model,
    usage: adapterResult.usage,
  };
}
