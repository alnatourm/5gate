import { RequirementsDocument } from '../shared/requirementsSchema.ts';
import {
  DesignArtifact,
  validateDesignArtifact,
} from '../shared/designSchema.ts';
import { executeProviderRequest } from './ai/router.ts';
import { inferProviderType } from './ai/credentialResolver.ts';
import { ProviderHttpClient, TokenUsageMetrics } from './ai/types.ts';
import { extractJsonObject } from './requirementsAgent.ts';

export interface DesignAgentInput {
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
  currentDesign?: DesignArtifact | null;
  chatHistory?: { sender: 'user' | 'ai'; text: string }[];
  timeoutMs?: number;
}

export interface DesignAgentResult {
  reply: string;
  designArtifact: DesignArtifact;
  providerUsed: string;
  modelUsed: string;
  usage: TokenUsageMetrics | null;
}

const DESIGN_SYSTEM_INSTRUCTION = `You are the Gate 2 Design Agent (UI/UX & System Design Agent) at OGroup AI Factory.
Your job is to transform the approved Gate 1 Product Requirements Document (PRD) and the customer's instructions into a comprehensive, project-specific UI/UX Design Artifact.

CRITICAL RULES:
1. Make the screens, KPIs, forms, navigation, and components 100% specific to the customer's project in the Approved PRD (e.g., if the project is a Clinic Appointment System, design screens for Patient Registration, Doctor Management, Appointment Booking, Appointment Status, and Clinic Admin Dashboard).
2. NEVER output a generic real-estate demo unless the PRD is actually about real estate.
3. Support Arabic RTL layout by default unless the user requests otherwise.
4. When a currentDesign is provided and the user asks for changes or a new screen, preserve existing screens and apply the requested modifications/additions.

You MUST return ONLY a valid JSON object with this structure:
{
  "reply": "Conversational explanation in Arabic/English summarizing the generated/updated screens and design tokens",
  "design": {
    "projectName": "string",
    "designSummary": "string",
    "designSpecification": {
      "direction": "rtl",
      "primaryLanguage": "ar",
      "designSystem": "Tailwind CSS RTL + Modern Cards",
      "preferredPlatform": "Responsive Web App",
      "layoutStructure": "string",
      "responsiveBehavior": "string",
      "uiPreferences": ["string"]
    },
    "visualTokens": {
      "primaryColor": "#FF6B00",
      "secondaryColor": "#0F172A",
      "accentColor": "#10B981",
      "backgroundColor": "#F8FAFC",
      "surfaceColor": "#FFFFFF",
      "textColor": "#0F172A",
      "fontFamily": "Cairo, sans-serif",
      "borderRadius": "16px",
      "themePreset": "orange"
    },
    "navigationMap": [
      { "id": "nav-1", "label": "string", "route": "/dashboard", "targetScreenId": "dashboard", "role": "string" }
    ],
    "screenInventory": [
      {
        "id": "dashboard",
        "title": "string",
        "route": "/dashboard",
        "role": "string",
        "purpose": "string",
        "layoutType": "dashboard",
        "kpis": [{ "label": "string", "value": "string", "badge": "string" }],
        "sections": [{ "title": "string", "description": "string", "items": ["string"] }],
        "actions": ["string"]
      }
    ],
    "componentInventory": [
      { "name": "string", "category": "string", "description": "string", "props": ["string"] }
    ],
    "userFlows": [
      { "name": "string", "actor": "string", "steps": ["string"] }
    ],
    "formDefinitions": [
      {
        "id": "form-1",
        "title": "string",
        "screenId": "dashboard",
        "submitLabel": "string",
        "fields": [
          { "name": "string", "label": "string", "type": "text", "required": true, "placeholder": "string", "options": ["string"] }
        ]
      }
    ]
  }
}`;

export async function executeDesignAgent(
  input: DesignAgentInput,
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<DesignAgentResult> {
  const provider = (input.provider || '').trim().toLowerCase();
  const model = (input.model || '').trim();
  const apiKey = (input.apiKey || '').trim();
  const providerType = inferProviderType({ provider, endpoint: input.endpoint });
  const effectiveUserMessage =
    input.userMessage || input.userInstructions || 'قم بتوليد وتحديث تصميم الواجهات التفاعلية والشاشات للمشروع.';

  const userPrompt = [
    `Approved Gate 1 PRD (Version v${input.approvedPrdVersion}):`,
    JSON.stringify(input.approvedPrd, null, 2),
    '',
    input.currentDesign
      ? `Current Gate 2 Design Artifact:\n${JSON.stringify(
          {
            projectName: input.currentDesign.projectName,
            designSummary: input.currentDesign.designSummary,
            stitchMetadata: input.currentDesign.stitchMetadata,
            visualTokens: input.currentDesign.visualTokens,
            screenInventory: input.currentDesign.screenInventory,
            formDefinitions: input.currentDesign.formDefinitions,
          },
          null,
          2
        )}\n`
      : '',
    `Customer Design Instruction:`,
    effectiveUserMessage,
    '',
    `Return ONLY valid JSON with "reply" and "design".`,
  ].join('\n');

  const systemInstruction = input.systemPrompt
    ? `${DESIGN_SYSTEM_INSTRUCTION}\n\nAdmin Custom Instructions:\n${input.systemPrompt}`
    : DESIGN_SYSTEM_INSTRUCTION;

  const adapterResult = await executeProviderRequest(
    {
      providerId: provider,
      providerType,
      configuredModel: model,
      apiKey,
      keySource: 'Gate 2 Design Agent',
      endpoint: input.endpoint,
      systemPrompt: systemInstruction,
      userPrompt,
      responseFormat: 'json',
      temperature: input.temperature ?? 0.5,
      maxTokens: input.maxTokens,
      timeoutMs: input.timeoutMs,
      agentGate: 2,
    },
    options
  );

  if (!adapterResult.ok) {
    const err: any = new Error(adapterResult.error || `فشل طلب وكيل التصميم (${provider} / ${model}).`);
    err.statusCode = adapterResult.statusCode || 502;
    err.executionStatus = adapterResult.status;
    throw err;
  }

  let parsed: Record<string, any>;
  try {
    parsed = extractJsonObject(adapterResult.response);
  } catch (e: any) {
    const err: any = new Error(e.message || 'فشل تحليل مخرجات وكيل التصميم كـ JSON صالح.');
    err.statusCode = 422;
    throw err;
  }

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : `تم توليد وتحديث تصميم واجهات مشروع "${input.approvedPrd.projectName}" بنجاح.`;

  const rawDesign = parsed.design || parsed.designArtifact || parsed;
  const validation = validateDesignArtifact(rawDesign, input.approvedPrd, input.approvedPrdVersion);
  if (!validation.valid || !validation.artifact) {
    const err: any = new Error(`مخرجات التصميم غير صالحة هيكلياً: ${validation.errors.join(' | ')}`);
    err.statusCode = 422;
    throw err;
  }

  return {
    reply,
    designArtifact: validation.artifact,
    providerUsed: provider,
    modelUsed: adapterResult.executedModel || model,
    usage: adapterResult.usage,
  };
}
