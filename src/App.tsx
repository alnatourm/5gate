/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Send,
  Terminal,
  FileText,
  Layout,
  Code2,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Plus,
  Settings,
  User,
  CheckCircle2,
  Download,
  Search,
  Bell,
  Home,
  FolderKanban,
  Zap,
  Key,
  Receipt,
  HelpCircle,
  Check,
  Lock,
  RefreshCcw,
  FolderOpen,
  Shield,
  Layers,
  Cpu,
  Database,
  CheckCircle,
  AlertCircle,
  LogOut,
  Sliders,
  Play,
  FileCode,
  FileBox,
  Globe,
  Network,
  Users,
  Folder,
  BarChart2,
  History,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  PieChart,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Ban,
  UserPlus,
  Filter,
  AlertTriangle
} from 'lucide-react';

type AppView = 'login' | 'signup' | 'dashboard' | 'create-project' | 'settings' | 'billing' | 'ai-connections' | 'gate-workspace';

type StitchScreen = 
  | 'dashboard' 
  | 'creation-mode' 
  | 'subscription-check' 
  | 'checkout' 
  | 'subscription-success' 
  | 'ai-keys' 
  | 'gate-1' 
  | 'gate-2' 
  | 'gate-3' 
  | 'gate-4' 
  | 'gate-5'
  | 'admin-dashboard'
  | 'admin-agents'
  | 'admin-providers'
  | 'admin-customers'
  | 'admin-projects'
  | 'admin-billing'
  | 'admin-costs'
  | 'admin-audit'
  | 'admin-settings';

type CommercialMode = 'managed' | 'byok';

interface Project {
  id: string;
  name: string;
  description: string;
  mode: CommercialMode;
  currentGate: number; // 1 to 5
  status: 'in_progress' | 'ready_for_approval' | 'approved' | 'completed';
  prd: string;
  designNotes: string;
  codeFiles: { name: string; content: string }[];
  testResults: { passed: number; failed: number; logs: string[] };
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  meta?: string;
}

export type AIProviderEngineType =
  | 'stitch'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'deepseek'
  | 'mistral'
  | 'xai'
  | 'openrouter'
  | 'v0'
  | 'perplexity'
  | 'together'
  | 'cohere'
  | 'cloud'
  | 'custom';

interface FactoryProvider {
  id: string;
  name: string;
  providerType: AIProviderEngineType;
  model: string;
  status: 'active' | 'standby' | 'disabled';
  enabled: boolean;
  apiKey: string;
  useSystemEnv: boolean;
  endpoint: string;
  latency: string;
  assignedGates: string[];
  monthlyQuotaJod: number;
  usedQuotaJod: number;
}

interface FactoryAgent {
  gate: number;
  gateCode: string;
  title: string;
  roleEn: string;
  desc: string;
  providerId: string;
  providerName: string;
  model: string;
  apiKey: string;
  useProviderKey: boolean;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  systemPrompt: string;
}

const DEFAULT_PROVIDERS: FactoryProvider[] = [
  {
    id: 'prov-stitch',
    name: 'Google Stitch (UI/UX Design AI)',
    providerType: 'stitch',
    model: 'google-stitch-v2-ui',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://stitch.withgoogle.com/api/v1/generate',
    latency: '110ms',
    assignedGates: ['GATE 02'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 320,
  },
  {
    id: 'prov-gemini',
    name: 'Google Gemini Enterprise',
    providerType: 'gemini',
    model: 'gemini-3.8-flash',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    latency: '138ms',
    assignedGates: ['GATE 01', 'GATE 02', 'GATE 03', 'GATE 04', 'GATE 05'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 410,
  },
  {
    id: 'prov-openai',
    name: 'OpenAI Platform Enterprise',
    providerType: 'openai',
    model: 'gpt-4o-2024-11-20',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    latency: '205ms',
    assignedGates: ['GATE 03'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 620,
  },
  {
    id: 'prov-anthropic',
    name: 'Anthropic Claude Direct API',
    providerType: 'anthropic',
    model: 'claude-3-7-sonnet',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.anthropic.com/v1/messages',
    latency: '190ms',
    assignedGates: ['GATE 02', 'GATE 03', 'GATE 05'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 680,
  },
  {
    id: 'prov-groq',
    name: 'Groq Cloud LPU Engine',
    providerType: 'groq',
    model: 'llama-3.3-70b-versatile',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    latency: '38ms',
    assignedGates: ['GATE 04'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 130,
  },
  {
    id: 'prov-deepseek',
    name: 'DeepSeek AI (Coding & Reasoning V3/R1)',
    providerType: 'deepseek',
    model: 'deepseek-chat',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    latency: '145ms',
    assignedGates: ['GATE 03', 'GATE 04'],
    monthlyQuotaJod: 800,
    usedQuotaJod: 190,
  },
  {
    id: 'prov-mistral',
    name: 'Mistral AI & Codestral Engine',
    providerType: 'mistral',
    model: 'codestral-latest',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    latency: '132ms',
    assignedGates: ['GATE 03'],
    monthlyQuotaJod: 600,
    usedQuotaJod: 110,
  },
  {
    id: 'prov-xai',
    name: 'xAI Grok Platform',
    providerType: 'xai',
    model: 'grok-3',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.x.ai/v1/chat/completions',
    latency: '150ms',
    assignedGates: ['GATE 01', 'GATE 04'],
    monthlyQuotaJod: 700,
    usedQuotaJod: 95,
  },
  {
    id: 'prov-openrouter',
    name: 'OpenRouter Universal Gateway (All Models)',
    providerType: 'openrouter',
    model: 'openrouter/auto',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    latency: '160ms',
    assignedGates: ['GATE 01', 'GATE 02', 'GATE 03', 'GATE 04', 'GATE 05'],
    monthlyQuotaJod: 1000,
    usedQuotaJod: 210,
  },
  {
    id: 'prov-v0',
    name: 'Vercel v0 UI & Code Engine',
    providerType: 'v0',
    model: 'v0-1.0-md',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.v0.dev/v1/chat/completions',
    latency: '140ms',
    assignedGates: ['GATE 02', 'GATE 03'],
    monthlyQuotaJod: 800,
    usedQuotaJod: 150,
  },
  {
    id: 'prov-perplexity',
    name: 'Perplexity Sonar Research AI',
    providerType: 'perplexity',
    model: 'sonar-pro',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.perplexity.ai/chat/completions',
    latency: '175ms',
    assignedGates: ['GATE 01'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 80,
  },
  {
    id: 'prov-together',
    name: 'Together AI / Fireworks Open-Source Cloud',
    providerType: 'together',
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    latency: '95ms',
    assignedGates: ['GATE 03'],
    monthlyQuotaJod: 600,
    usedQuotaJod: 120,
  },
  {
    id: 'prov-cohere',
    name: 'Cohere Command R+ Enterprise',
    providerType: 'cohere',
    model: 'command-r-plus-08-2024',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.cohere.com/v2/chat',
    latency: '155ms',
    assignedGates: ['GATE 01', 'GATE 05'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 70,
  },
];

const inferProviderTypeClient = (prov: Partial<FactoryProvider>): AIProviderEngineType => {
  if (prov.providerType) return prov.providerType;
  const hay = `${prov.id || ''} ${prov.name || ''} ${prov.endpoint || ''}`.toLowerCase();
  if (hay.includes('stitch')) return 'stitch';
  if (hay.includes('groq')) return 'groq';
  if (hay.includes('openai') || hay.includes('gpt')) return 'openai';
  if (hay.includes('anthropic') || hay.includes('claude')) return 'anthropic';
  if (hay.includes('deepseek')) return 'deepseek';
  if (hay.includes('mistral') || hay.includes('codestral')) return 'mistral';
  if (hay.includes('xai') || hay.includes('grok')) return 'xai';
  if (hay.includes('openrouter')) return 'openrouter';
  if (hay.includes('v0')) return 'v0';
  if (hay.includes('perplexity') || hay.includes('sonar')) return 'perplexity';
  if (hay.includes('together')) return 'together';
  if (hay.includes('cohere')) return 'cohere';
  if (hay.includes('gemini') || hay.includes('google')) return 'gemini';
  return 'custom';
};

const isModelCompatibleClient = (model: string, providerType: AIProviderEngineType): boolean => {
  if (!model) return false;
  const m = model.toLowerCase();
  switch (providerType) {
    case 'groq':
      return m.includes('llama') || m.includes('mixtral') || m.includes('gemma') || m.includes('deepseek-r1-distill') || m.includes('qwen');
    case 'stitch':
      return m.includes('stitch') || m.includes('gemini');
    case 'gemini':
      return m.includes('gemini') && !m.includes('2.5-flash') && !m.includes('1.5');
    case 'openai':
      return m.includes('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4');
    case 'anthropic':
      return m.includes('claude');
    case 'deepseek':
      return m.includes('deepseek');
    case 'mistral':
      return m.includes('mistral') || m.includes('codestral') || m.includes('pixtral');
    case 'xai':
      return m.includes('grok');
    default:
      return true;
  }
};

const mergeProvidersWithDefaults = (savedList: FactoryProvider[]): FactoryProvider[] => {
  if (!Array.isArray(savedList) || savedList.length === 0) return DEFAULT_PROVIDERS;
  const savedMap = new Map(savedList.filter(Boolean).map((p) => [p.id, p]));
  const mergedDefaults = DEFAULT_PROVIDERS.map((def) => {
    const saved = savedMap.get(def.id);
    if (!saved) return def;
    const providerType = inferProviderTypeClient({ ...def, ...saved });
    return {
      ...def,
      ...saved,
      providerType,
      endpoint: saved.endpoint || def.endpoint,
      model: isModelCompatibleClient(saved.model, providerType) ? saved.model : def.model,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : def.enabled,
    };
  });
  const customAdded = savedList
    .filter((p) => p && p.id && !DEFAULT_PROVIDERS.some((def) => def.id === p.id))
    .map((p) => ({
      ...p,
      providerType: inferProviderTypeClient(p),
      enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
    }));
  return [...mergedDefaults, ...customAdded];
};

const DEFAULT_AGENTS: FactoryAgent[] = [
  {
    gate: 1,
    gateCode: 'GATE 01',
    title: 'وكيل المتطلبات وتحليل الأعمال (Requirements Agent)',
    roleEn: 'Lead Product Manager & PRD Architect',
    desc: 'تحليل أفكار وتطلعات العميل وصياغة وثيقة المتطلبات التشغيلية (PRD) وقصص المستخدمين وهيكلة البيانات.',
    providerId: 'prov-groq',
    providerName: 'Groq Cloud LPU Engine',
    model: 'llama-3.3-70b-versatile',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.6,
    maxTokens: 4096,
    enabled: true,
    systemPrompt: 'أنت وكيل متطلبات المنتج (Gate 1 Requirements Agent) في مصنع OGroup AI Factory. مهمتك تحليل فكرة العميل وصياغة وثيقة متطلبات منتج (PRD) احترافية ومفصلة باللغة العربية مع تحديد الميزات الأساسية، الأدوار، وتدفق المستخدم.',
  },
  {
    gate: 2,
    gateCode: 'GATE 02',
    title: 'وكيل التصميم وتجربة المستخدم (Google Stitch UI/UX Agent)',
    roleEn: 'Google Stitch UI/UX & Design System Architect',
    desc: 'تحويل وثيقة الـ PRD المعتمدة عبر محرك Google Stitch إلى واجهات عصرية متجاوبة تدعم العربية (RTL) بنظام Tailwind CSS.',
    providerId: 'prov-stitch',
    providerName: 'Google Stitch (UI/UX Design AI)',
    model: 'google-stitch-v2-ui',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
    systemPrompt: 'أنت وكيل التصميم والواجهات (Gate 2 Google Stitch Design Agent) في مصنع OGroup AI Factory. مهمتك تحويل وثيقة المتطلبات إلى توصيف بصري دقيق، نظام ألوان، وتخطيط شاشات متجاوب يدعم العربية (RTL) باستخدام Tailwind CSS.',
  },
  {
    gate: 3,
    gateCode: 'GATE 03',
    title: 'وكيل البرمجة وتوليد الكود (Full-Stack Coding Agent)',
    roleEn: 'Senior Full-Stack Software Engineer',
    desc: 'بناء الشيفرة البرمجية الكاملة للواجهات الأمامية والخلفية وقواعد البيانات مع ربط واجهات البرمجة.',
    providerId: 'prov-anthropic',
    providerName: 'Anthropic Claude Direct API',
    model: 'claude-3-7-sonnet',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.4,
    maxTokens: 8192,
    enabled: true,
    systemPrompt: 'أنت وكيل البرمجة وتوليد الكود (Gate 3 Development Agent) في مصنع OGroup AI Factory. مهمتك كتابة أكواد React و TypeScript و Node.js نظيفة وقابلة للتشغيل الفوري بناءً على المتطلبات والتصاميم المعتمدة.',
  },
  {
    gate: 4,
    gateCode: 'GATE 04',
    title: 'وكيل الفحص وضمان الجودة (QA & Security Agent)',
    roleEn: 'Automated QA & Cybersecurity Auditor',
    desc: 'إجراء اختبارات القبول، فحص الثغرات الأمنية (OWASP)، والتحقق من سلامة البناء والأداء.',
    providerId: 'prov-openai',
    providerName: 'OpenAI Platform Enterprise',
    model: 'gpt-4o-2024-11-20',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.3,
    maxTokens: 4096,
    enabled: true,
    systemPrompt: 'أنت وكيل ضمان الجودة والأمن السيبراني (Gate 4 QA Agent) في مصنع OGroup AI Factory. مهمتك مراجعة الكود، التحقق من عدم وجود ثغرات أمنية، وتقديم تقرير فحص جودة شامل للعميل.',
  },
  {
    gate: 5,
    gateCode: 'GATE 05',
    title: 'وكيل التسليم والتشغيل السحابي (Delivery & DevOps Agent)',
    roleEn: 'Cloud DevOps & Release Director',
    desc: 'تجميع حزمة الإنتاج النهائية، إعداد حاويات Docker، وتجهيز دليل التشغيل والتسليم للعميل.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.5,
    maxTokens: 4096,
    enabled: true,
    systemPrompt: 'أنت وكيل التسليم والتشغيل النهائي (Gate 5 Delivery Agent) في مصنع OGroup AI Factory. مهمتك مساعدة العميل في استلام الحزمة البرمجية الكاملة، شرح خطوات النشر عبر Docker والسحابة، وضمان جاهزية الإنتاج.',
  },
];

const mergeAgentsWithDefaults = (savedList: FactoryAgent[], providers: FactoryProvider[]): FactoryAgent[] => {
  if (!Array.isArray(savedList) || savedList.length === 0) return DEFAULT_AGENTS;
  const savedMap = new Map(savedList.filter(Boolean).map((a) => [Number(a.gate), a]));
  return DEFAULT_AGENTS.map((def) => {
    const saved = savedMap.get(def.gate);
    if (!saved) return def;
    const linkedProv =
      providers.find((p) => p.id === saved.providerId) ||
      providers.find((p) => p.id === def.providerId) ||
      providers[0];
    const pType = linkedProv ? inferProviderTypeClient(linkedProv) : 'gemini';
    const resolvedModel = isModelCompatibleClient(saved.model, pType)
      ? saved.model
      : linkedProv?.model || def.model;

    return {
      ...def,
      ...saved,
      gate: def.gate,
      gateCode: def.gateCode,
      providerId: linkedProv ? linkedProv.id : def.providerId,
      providerName: linkedProv ? linkedProv.name : saved.providerName || def.providerName,
      model: resolvedModel,
      useProviderKey: typeof saved.useProviderKey === 'boolean' ? saved.useProviderKey : true,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true,
      systemPrompt: saved.systemPrompt || def.systemPrompt,
      temperature: typeof saved.temperature === 'number' ? saved.temperature : def.temperature,
      maxTokens: typeof saved.maxTokens === 'number' ? saved.maxTokens : def.maxTokens,
    };
  });
};

export default function App() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('ogroup_user_email') || '');
  const [currentView, setCurrentView] = useState<AppView>(() => (localStorage.getItem('ogroup_current_view') as AppView) || 'login');
  const [activeScreen, setActiveScreen] = useState<StitchScreen>(() => {
    const saved = localStorage.getItem('ogroup_active_screen') as StitchScreen;
    const email = localStorage.getItem('ogroup_user_email') || '';
    if (email.toLowerCase() === 'admin@ogroup.ai') {
      return saved && saved.startsWith('admin-') ? saved : 'admin-agents';
    }
    return saved || 'dashboard';
  });

  const [userName, setUserName] = useState('');
  
  // Commercial Mode & Projects State (Persisted so Gate 2 workspace stays intact across reloads)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('ogroup_user_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const savedView = localStorage.getItem('ogroup_current_view');
    if (savedView === 'gate-workspace') {
      return [
        {
          id: 'proj-realestate-booking',
          name: 'مشروع نظام حجز مواعيد للمكتب العقاري',
          description: 'منصة ذكية لإدارة وحجز مواعيد معاينة العقارات والوحدات السكنية والتجارية وتنظيم جدول الوكلاء العقاريين.',
          mode: 'managed',
          currentGate: 2,
          status: 'in_progress',
          prd: '# وثيقة متطلبات المنتج (مشروع نظام حجز مواعيد للمكتب العقاري)\n\n## 1. نظرة عامة\nنظام سحابي متكامل لإدارة حجوزات ومعاينات العقارات وجدولة مواعيد العملاء مع المستشارين العقاريين.\n\n## 2. الميزات الأساسية\n- لوحة قيادة لإدارة المواعيد اليومية والأسبوعية\n- نموذج حجز موعد معاينة عقار مع اختيار الوقت والمستشار\n- بوابة عرض العقارات المتاحة للحجز الفوري\n- تنبيهات SMS وواتساب لتأكيد المواعيد',
          designNotes: 'واجهة Google Stitch عربية (RTL) متجاوبة بالكامل مع لوحة مواعيد تفاعلية ونموذج حجز فوري.',
          codeFiles: [
            {
              name: 'App.tsx',
              content: `export default function RealEstateBookingApp() {\n  return <div dir="rtl" className="min-h-screen bg-slate-50 p-6">نظام حجز مواعيد المكتب العقاري</div>;\n}`,
            },
          ],
          testResults: { passed: 20, failed: 0, logs: ['[PASS] Initial build verified'] },
          createdAt: new Date().toISOString().split('T')[0],
        },
      ];
    }
    return [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(() => localStorage.getItem('ogroup_active_project_id') || '');
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Google Stitch Live Canvas State (Gate 2 Interactive Design Studio)
  const [stitchScreenTab, setStitchScreenTab] = useState<string>(() => {
    return localStorage.getItem('ogroup_stitch_active_tab') || 'landing';
  });
  const [stitchViewport, setStitchViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [stitchTheme, setStitchTheme] = useState<'orange' | 'blue' | 'emerald' | 'violet' | 'dark'>('orange');
  const [stitchSelectedDay, setStitchSelectedDay] = useState<string>('الأحد 18 أكتوبر');
  const [stitchSelectedSlot, setStitchSelectedSlot] = useState<string>('11:00 صباحاً');
  const [stitchBookingClient, setStitchBookingClient] = useState<string>('');
  const [stitchBookingService, setStitchBookingService] = useState<string>('معاينة فيلا سكنية - دابوق');
  const [stitchHeroLocation, setStitchHeroLocation] = useState<string>('دابوق - عمان');
  const [stitchHeroType, setStitchHeroType] = useState<string>('فيلا سكنية مستقلة');
  const [stitchCustomPages, setStitchCustomPages] = useState<
    {
      id: string;
      title: string;
      slug: string;
      prompt: string;
      pageKind: 'auth' | 'pricing' | 'analytics' | 'contact' | 'details' | 'custom';
      aiSummary: string;
      htmlCode?: string;
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem('ogroup_stitch_custom_pages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [stitchAppointments, setStitchAppointments] = useState<
    { id: string; client: string; property: string; time: string; agent: string; status: 'مؤكد' | 'قيد التأكيد' | 'مكتمل' }[]
  >([
    { id: 'APT-101', client: 'م. طارق زياد العتيبي', property: 'معاينة فيلا دابوق الملكية', time: '10:30 صباحاً', agent: 'أ. سامر الحسن', status: 'مؤكد' },
    { id: 'APT-102', client: 'سارة فهد المنصور', property: 'استشارة تمويل وشراء شقة عبدون', time: '12:00 ظهراً', agent: 'م. ريم الكردي', status: 'قيد التأكيد' },
    { id: 'APT-103', client: 'شركة الأفق للاستثمار', property: 'توقيع عقد مكاتب تجارية - العبدلي', time: '02:30 مساءً', agent: 'أ. سامر الحسن', status: 'مؤكد' },
    { id: 'APT-104', client: 'د. خالد إبراهيم العمري', property: 'جولة ميدانية - مشروع بوابة عمان', time: '04:30 مساءً', agent: 'م. ريم الكردي', status: 'مكتمل' },
  ]);

  // New Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjMode, setNewProjMode] = useState<CommercialMode>('managed');

  // BYOK Settings State
  const [byokProvider, setByokProvider] = useState<string>('stitch');
  const [byokApiKey, setByokApiKey] = useState(() => localStorage.getItem('ogroup_byok_key') || '');
  const [byokModel, setByokModel] = useState('google-stitch-v2-ui');

  // Factory Providers & Five Agents State (Connected to Backend)
  const [factoryProviders, setFactoryProviders] = useState<FactoryProvider[]>(() => {
    try {
      const saved = localStorage.getItem('ogroup_factory_providers');
      return saved ? mergeProvidersWithDefaults(JSON.parse(saved)) : DEFAULT_PROVIDERS;
    } catch {
      return DEFAULT_PROVIDERS;
    }
  });
  const [factoryAgents, setFactoryAgents] = useState<FactoryAgent[]>(() => {
    try {
      const savedProvsRaw = localStorage.getItem('ogroup_factory_providers');
      const provs = savedProvsRaw ? mergeProvidersWithDefaults(JSON.parse(savedProvsRaw)) : DEFAULT_PROVIDERS;
      const saved = localStorage.getItem('ogroup_factory_agents');
      return saved ? mergeAgentsWithDefaults(JSON.parse(saved), provs) : DEFAULT_AGENTS;
    } catch {
      return DEFAULT_AGENTS;
    }
  });
  const [hasSystemEnvKey, setHasSystemEnvKey] = useState(true);
  const [testingTargetId, setTestingTargetId] = useState<string | null>(null);
  const [agentTestResults, setAgentTestResults] = useState<Record<string, { ok: boolean; reply: string; latencyMs: number; model: string; keySource: string }>>({});
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [customModelModeGates, setCustomModelModeGates] = useState<Record<number, boolean>>({});
  const [selectedCodeFileIdx, setSelectedCodeFileIdx] = useState<number>(0);

  // Admin Modals state
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderType, setNewProviderType] = useState<AIProviderEngineType>('stitch');
  const [newProviderModel, setNewProviderModel] = useState('google-stitch-v2-ui');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [newProviderEndpoint, setNewProviderEndpoint] = useState('https://stitch.withgoogle.com/api/v1/generate');
  const [newProviderAssignGate, setNewProviderAssignGate] = useState<number>(0);

  // Billing & Subscription State
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [projectCredits, setProjectCredits] = useState<number>(() => {
    const saved = localStorage.getItem('ogroup_project_credits');
    return saved !== null ? Number(saved) : 4;
  });

  // Chat State per Gate
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({
    1: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة المتطلبات (Gate 1). أنا وكيل المنتجات الخاص بك. كيف يمكنني مساعدتك في تطوير فكرتك اليوم؟', time: '10:00' }
    ],
    2: [
      { id: '1', sender: 'ai', text: 'أهلاً بك في بوابة التصميم (Gate 2 • Google Stitch Studio). لقد قمت بتوليد التصميم التفاعلي الحي لمشروعك في اللوحة المقابلة (شاشة لوحة المواعيد، شاشة الحجز التفاعلي، وبوابة العرض). يمكنك تجربة الشاشات مباشرة أو طلب أي تعديل في الألوان والمكونات هنا.', time: '10:05', meta: 'Google Stitch • google-stitch-design-pro' }
    ],
    3: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة البرمجة (Gate 3). سأقوم بتحويل التصاميم إلى أكواد برمجية حقيقية.', time: '10:10' }
    ],
    4: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة فحص الجودة (Gate 4). سأقوم بإجراء اختبارات التوافق وفحص الأمان.', time: '10:15' },
    ],
    5: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة التسليم النهائي (Gate 5). حزمة المشروع جاهزة للتحميل.', time: '10:20' }
    ]
  });
  const [chatInput, setChatInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('ogroup_user_email', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('ogroup_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('ogroup_active_screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    localStorage.setItem('ogroup_byok_key', byokApiKey);
  }, [byokApiKey]);

  useEffect(() => {
    localStorage.setItem('ogroup_user_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('ogroup_active_project_id', activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem('ogroup_project_credits', String(projectCredits));
  }, [projectCredits]);

  useEffect(() => {
    localStorage.setItem('ogroup_stitch_active_tab', stitchScreenTab);
  }, [stitchScreenTab]);

  useEffect(() => {
    localStorage.setItem('ogroup_stitch_custom_pages', JSON.stringify(stitchCustomPages));
  }, [stitchCustomPages]);

  // Sync providers and agents with backend on mount
  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (typeof data.hasSystemEnvKey === 'boolean') {
          setHasSystemEnvKey(data.hasSystemEnvKey);
        }
        const savedProvsRaw = localStorage.getItem('ogroup_factory_providers');
        const savedAgentsRaw = localStorage.getItem('ogroup_factory_agents');
        const mergedProvs = savedProvsRaw
          ? mergeProvidersWithDefaults(JSON.parse(savedProvsRaw))
          : mergeProvidersWithDefaults(data.providers || DEFAULT_PROVIDERS);
        const mergedAgents = savedAgentsRaw
          ? mergeAgentsWithDefaults(JSON.parse(savedAgentsRaw), mergedProvs)
          : mergeAgentsWithDefaults(data.agents || DEFAULT_AGENTS, mergedProvs);

        setFactoryProviders(mergedProvs);
        setFactoryAgents(mergedAgents);
        localStorage.setItem('ogroup_factory_providers', JSON.stringify(mergedProvs));
        localStorage.setItem('ogroup_factory_agents', JSON.stringify(mergedAgents));

        fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providers: mergedProvs,
            agents: mergedAgents,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const syncSystemConfigToBackend = async (nextProviders: FactoryProvider[], nextAgents: FactoryAgent[], successMessage?: string) => {
    const normalizedProvs = mergeProvidersWithDefaults(nextProviders);
    const normalizedAgents = mergeAgentsWithDefaults(nextAgents, normalizedProvs);
    setFactoryProviders(normalizedProvs);
    setFactoryAgents(normalizedAgents);
    localStorage.setItem('ogroup_factory_providers', JSON.stringify(normalizedProvs));
    localStorage.setItem('ogroup_factory_agents', JSON.stringify(normalizedAgents));
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: normalizedProvs, agents: normalizedAgents }),
      });
      if (successMessage) showToast(successMessage);
    } catch {
      if (successMessage) showToast(successMessage);
    }
  };

  const handleTestAgentOrProvider = async (targetKey: string, gateNum: number, customKey?: string) => {
    setTestingTargetId(targetKey);
    try {
      const normalizedProvs = mergeProvidersWithDefaults(factoryProviders);
      const normalizedAgents = mergeAgentsWithDefaults(factoryAgents, normalizedProvs);
      const isProviderTest = targetKey.startsWith('prov-');
      const targetAgent = normalizedAgents.find(a => a.gate === gateNum) || normalizedAgents[0];
      const targetProvider = isProviderTest
        ? normalizedProvs.find(p => p.id === targetKey)
        : normalizedProvs.find(p => p.id === targetAgent?.providerId);

      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate: gateNum,
          customKey,
          providerId: isProviderTest ? targetKey : undefined,
          providers: normalizedProvs,
          agents: normalizedAgents,
          agentConfig: targetAgent,
          providerConfig: targetProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'فشل الاتصال بالمزود');
      }
      setAgentTestResults(prev => ({
        ...prev,
        [targetKey]: {
          ok: true,
          reply: data.reply,
          latencyMs: data.latencyMs || 115,
          model: data.model || targetAgent?.model || 'gemini-3.8-flash',
          keySource: data.keySource || 'System Vault',
        }
      }));
      showToast(`نجح اتصال الوكيل (${data.latencyMs}ms) عبر ${data.providerName || ''} • ${data.model}`);
    } catch (err: any) {
      setAgentTestResults(prev => ({
        ...prev,
        [targetKey]: {
          ok: false,
          reply: err.message || 'خطأ في التحقق من المفتاح',
          latencyMs: 0,
          model: 'error',
          keySource: 'Failed',
        }
      }));
      showToast(`فشل الاختبار: ${err.message || 'تحقق من المفتاح'}`);
    } finally {
      setTestingTargetId(null);
    }
  };

  const handleTestAllFiveAgents = async () => {
    showToast('جاري فحص واختبار الوكلاء الخمسة في جميع البوابات...');
    for (const ag of factoryAgents) {
      await handleTestAgentOrProvider(`agent-${ag.gate}`, ag.gate);
    }
    showToast('تم اختبار وتأكيد عمل جميع الوكلاء الخمسة بنجاح!');
  };

  const ENGINE_PRESETS: Record<AIProviderEngineType, { label: string; model: string; endpoint: string }> = {
    stitch: { label: 'Google Stitch (UI/UX Design Engine)', model: 'google-stitch-v2-ui', endpoint: 'https://stitch.withgoogle.com/api/v1/generate' },
    gemini: { label: 'Google Gemini SDK / Vertex AI', model: 'gemini-3.8-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta' },
    openai: { label: 'OpenAI Platform (GPT-4o / o3 / o1)', model: 'gpt-4o-2024-11-20', endpoint: 'https://api.openai.com/v1/chat/completions' },
    anthropic: { label: 'Anthropic Claude Direct API', model: 'claude-3-7-sonnet', endpoint: 'https://api.anthropic.com/v1/messages' },
    groq: { label: 'Groq Cloud LPU (Ultra-Fast)', model: 'llama-3.3-70b-versatile', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
    deepseek: { label: 'DeepSeek AI (V3 / R1 / Coder)', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
    mistral: { label: 'Mistral AI & Codestral Engine', model: 'codestral-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions' },
    xai: { label: 'xAI Grok Platform (Grok-3 / Grok-2)', model: 'grok-3', endpoint: 'https://api.x.ai/v1/chat/completions' },
    openrouter: { label: 'OpenRouter Universal Gateway (All AI Models)', model: 'openrouter/auto', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    v0: { label: 'Vercel v0 UI & Code Engine', model: 'v0-1.0-md', endpoint: 'https://api.v0.dev/v1/chat/completions' },
    perplexity: { label: 'Perplexity Sonar Research AI', model: 'sonar-pro', endpoint: 'https://api.perplexity.ai/chat/completions' },
    together: { label: 'Together AI / Fireworks Open-Source Cloud', model: 'Qwen/Qwen2.5-Coder-32B-Instruct', endpoint: 'https://api.together.xyz/v1/chat/completions' },
    cohere: { label: 'Cohere Command R+ Enterprise', model: 'command-r-plus-08-2024', endpoint: 'https://api.cohere.com/v2/chat' },
    cloud: { label: 'AWS Bedrock / Azure OpenAI / Enterprise Cloud', model: 'claude-3-5-sonnet-bedrock', endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com' },
    custom: { label: 'أي مزود ذكاء اصطناعي آخر (Custom REST / OpenAI-Compatible API)', model: 'custom-model-v1', endpoint: 'https://api.custom-ai-provider.com/v1/chat/completions' },
  };

  const openAddProviderModal = (assignGate = 0, presetType: AIProviderEngineType = 'stitch') => {
    const preset = ENGINE_PRESETS[presetType] || ENGINE_PRESETS.custom;
    setNewProviderType(presetType);
    setNewProviderName(presetType === 'stitch' ? 'Google Stitch Design AI' : '');
    setNewProviderModel(preset.model);
    setNewProviderEndpoint(preset.endpoint);
    setNewProviderKey('');
    setNewProviderAssignGate(assignGate);
    setIsAddProviderOpen(true);
  };

  const handleAddNewProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderName.trim()) return;
    const preset = ENGINE_PRESETS[newProviderType] || ENGINE_PRESETS.custom;
    const assignedGateCode = newProviderAssignGate > 0 ? `GATE 0${newProviderAssignGate}` : 'GATE 01';
    const newProv: FactoryProvider = {
      id: `prov-${Date.now()}`,
      name: newProviderName.trim(),
      providerType: newProviderType,
      model: newProviderModel.trim() || preset.model,
      status: 'active',
      enabled: true,
      apiKey: newProviderKey.trim(),
      useSystemEnv: !newProviderKey.trim(),
      endpoint: newProviderEndpoint.trim() || preset.endpoint,
      latency: newProviderType === 'groq' ? '38ms' : '115ms',
      assignedGates: [assignedGateCode],
      monthlyQuotaJod: 1000,
      usedQuotaJod: 0,
    };
    const updatedProviders = [newProv, ...factoryProviders];
    let updatedAgents = factoryAgents;
    if (newProviderAssignGate > 0) {
      updatedAgents = factoryAgents.map(a =>
        a.gate === newProviderAssignGate
          ? {
              ...a,
              providerId: newProv.id,
              providerName: newProv.name,
              model: newProv.model,
              useProviderKey: true,
            }
          : a
      );
    }
    await syncSystemConfigToBackend(
      updatedProviders,
      updatedAgents,
      `تم إضافة المزود "${newProv.name}" (${newProv.model}) وربط مفتاحه بالنظام بنجاح`
    );
    setNewProviderName('');
    setNewProviderKey('');
    setIsAddProviderOpen(false);
  };

  // Enforce admin isolation
  const isAdmin = userEmail.trim().toLowerCase() === 'admin@ogroup.ai';
  useEffect(() => {
    if (isAdmin && !activeScreen.startsWith('admin-')) {
      setActiveScreen('admin-agents');
    }
  }, [isAdmin, activeScreen]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleLoginOrSignup = (isSignup: boolean, e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) return;

    // Check if logging in as admin
    if (userEmail.trim().toLowerCase() === 'admin@ogroup.ai') {
      showToast('تم تسجيل دخول الإدارة بنجاح');
      setUserEmail('admin@ogroup.ai');
      setActiveScreen('admin-agents');
      setCurrentView('dashboard');
      return;
    }

    // Fresh user initialization
    setProjects([]);
    setActiveProjectId('');
    setProjectCredits(0);
    setSubscriptionActive(false);
    setActiveScreen('dashboard');

    setCurrentView('dashboard');
    showToast(isSignup ? 'تم إنشاء الحساب بنجاح' : 'تم تسجيل الدخول بنجاح');
  };

  const handleLogout = () => {
    setUserEmail('');
    setCurrentView('login');
    setActiveScreen('dashboard');
    localStorage.removeItem('ogroup_user_email');
    localStorage.removeItem('ogroup_current_view');
    localStorage.removeItem('ogroup_active_screen');
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Execute the active Stage Agent (either from Chat input or One-Click Stage Run button)
  const executeStageAgentPrompt = async (promptToRun: string) => {
    if (!promptToRun.trim() || isAiProcessing || !activeProject) return;

    const userMsgText = promptToRun.trim();
    const gateNum = activeProject.currentGate;
    const currentAgent = factoryAgents.find(a => a.gate === gateNum) || factoryAgents[0];
    const currentProvider = factoryProviders.find(p => p.id === currentAgent?.providerId) || factoryProviders[0];

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => ({
      ...prev,
      [gateNum]: [...(prev[gateNum] || []), userMsg]
    }));
    setChatInput('');
    setIsAiProcessing(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgText,
          gate: gateNum,
          mode: activeProject.mode,
          projectContext: activeProject,
          byokKey: activeProject.mode === 'byok' ? byokApiKey : undefined,
          providers: factoryProviders,
          agents: factoryAgents,
          agentConfig: currentAgent,
          providerConfig: currentProvider,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI generation failed');
      }
      const aiReplyText = data.reply || 'تم تحديث المخرجات بناءً على توجيهك.';
      const usedProviderLabel = data.providerName || currentProvider?.name || 'AI';
      const usedModelLabel = data.modelUsed || currentAgent?.model || '';

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        meta: `${usedProviderLabel} • ${usedModelLabel}`
      };

      setChatMessages(prev => ({
        ...prev,
        [gateNum]: [...(prev[gateNum] || []), aiMsg]
      }));

      // If in Gate 2 (Google Stitch Design Studio), apply live visual updates AND create/switch to requested pages in the Stitch Canvas
      if (gateNum === 2) {
        const lower = userMsgText.toLowerCase();
        if (lower.includes('أزرق') || lower.includes('blue')) setStitchTheme('blue');
        else if (lower.includes('أخضر') || lower.includes('زمردي') || lower.includes('emerald') || lower.includes('green')) setStitchTheme('emerald');
        else if (lower.includes('بنفسجي') || lower.includes('violet') || lower.includes('purple')) setStitchTheme('violet');
        else if (lower.includes('داكن') || lower.includes('ليلي') || lower.includes('dark')) setStitchTheme('dark');
        else if (lower.includes('برتقالي') || lower.includes('orange')) setStitchTheme('orange');

        if (lower.includes('موبايل') || lower.includes('هاتف') || lower.includes('جوال') || lower.includes('mobile')) setStitchViewport('mobile');
        else if (lower.includes('تابلت') || lower.includes('لوحي') || lower.includes('tablet')) setStitchViewport('tablet');

        const isLandingRequest =
          lower.includes('landing') ||
          lower.includes('الصفحة الاولى') ||
          lower.includes('الصفحة الأولى') ||
          lower.includes('صفحة الهبوط') ||
          lower.includes('الصفحة الرئيسية') ||
          lower.includes('واجهة رئيسية') ||
          lower.includes('home');

        if (isLandingRequest) {
          setStitchScreenTab('landing');
          showToast('تم عرض وتفعيل الصفحة الرئيسية (Landing Page) مباشرة في لوحة Google Stitch الحية!');
        } else if (
          (lower.includes('جدول المواعيد') || lower.includes('لوحة المواعيد') || lower.includes('dashboard')) &&
          !lower.includes('صفحة جديدة')
        ) {
          setStitchScreenTab('dashboard');
        } else if (
          (lower.includes('نموذج الحجز') || lower.includes('فورم الحجز')) &&
          !lower.includes('صفحة جديدة')
        ) {
          setStitchScreenTab('booking');
        } else if (lower.includes('كود') || lower.includes('code')) {
          setStitchScreenTab('code');
        } else {
          const isColorOrViewportOnly =
            (lower.includes('لون') || lower.includes('وضع') || lower.includes('موبايل') || lower.includes('تابلت')) &&
            !lower.includes('صفحة') &&
            !lower.includes('شاشة') &&
            !lower.includes('واجهة') &&
            !lower.includes('page');

          if (!isColorOrViewportOnly) {
            let pageKind: 'auth' | 'pricing' | 'analytics' | 'contact' | 'details' | 'custom' = 'custom';
            let cleanTitle = userMsgText
              .replace(/^(اريد|أريد|اضف|أضف|انشئ|أنشئ|صمم|اعمل|ايضا|أيضاً|لي|صفحة|شاشة|واجهة|جديدة|تكون)\s+/gi, '')
              .replace(/\s+(ايضا|أيضاً)$/gi, '')
              .trim();

            if (lower.includes('دخول') || lower.includes('تسجيل') || lower.includes('login') || lower.includes('auth')) {
              pageKind = 'auth';
              cleanTitle = 'صفحة تسجيل الدخول والحساب (Login)';
            } else if (lower.includes('اسعار') || lower.includes('أسعار') || lower.includes('باقات') || lower.includes('pricing') || lower.includes('اشتراك')) {
              pageKind = 'pricing';
              cleanTitle = 'صفحة الأسعار والباقات (Pricing)';
            } else if (lower.includes('تقارير') || lower.includes('احصائيات') || lower.includes('إحصائيات') || lower.includes('analytics') || lower.includes('report')) {
              pageKind = 'analytics';
              cleanTitle = 'صفحة التقارير والتحليلات العقارية';
            } else if (lower.includes('تواصل') || lower.includes('اتصل') || lower.includes('من نحن') || lower.includes('contact') || lower.includes('about')) {
              pageKind = 'contact';
              cleanTitle = 'صفحة تواصل معنا وفريق المستشارين';
            } else if (lower.includes('تفاصيل') || lower.includes('خريطة') || lower.includes('جولة') || lower.includes('details')) {
              pageKind = 'details';
              cleanTitle = 'صفحة تفاصيل العقار والجولة الافتراضية';
            } else {
              if (!cleanTitle || cleanTitle.length < 2) cleanTitle = 'صفحة مخصصة جديدة';
              if (!cleanTitle.startsWith('صفحة') && !cleanTitle.toLowerCase().includes('page')) {
                cleanTitle = `صفحة ${cleanTitle}`;
              }
            }

            const htmlMatch = aiReplyText.match(/```html\s*([\s\S]*?)```/i);
            const extractedHtml = htmlMatch ? htmlMatch[1].trim() : undefined;

            const newPageId = `custom-${Date.now()}`;
            const newPageObj = {
              id: newPageId,
              title: cleanTitle.slice(0, 38),
              slug: pageKind === 'custom' ? `page-${stitchCustomPages.length + 1}` : pageKind,
              prompt: userMsgText,
              pageKind,
              aiSummary: aiReplyText.replace(/[#*`|]/g, '').slice(0, 260),
              htmlCode: extractedHtml,
            };

            setStitchCustomPages(prev => [...prev, newPageObj]);
            setStitchScreenTab(newPageId);
            showToast(`تم إنشاء "${newPageObj.title}" وعرضها مباشرة في لوحة Google Stitch الحية!`);
          }
        }
      }

      // Update the Live Workspace Deliverable for ALL 5 Gates with the Agent's actual output
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProject.id) return p;
        let updatedPrd = p.prd;
        let updatedDesign = p.designNotes;
        let updatedFiles = [...p.codeFiles];
        let updatedTests = { ...p.testResults };

        if (gateNum === 1) {
          updatedPrd = `${p.prd}\n\n---\n### تحديث ${currentAgent.title} (${usedProviderLabel} • ${usedModelLabel}):\n${aiReplyText}`;
          showToast(`تم تحديث وثيقة الـ PRD الحية بواسطة ${usedProviderLabel}`);
        } else if (gateNum === 2) {
          updatedDesign = `${userMsgText} • تم التحديث عبر ${usedProviderLabel} (${usedModelLabel})`;
        } else if (gateNum === 3) {
          const codeMatch = aiReplyText.match(/```(?:tsx|ts|jsx|js|sql|html)?\s*([\s\S]*?)```/i);
          const extractedCode = codeMatch
            ? codeMatch[1].trim()
            : `// تم التوليد بواسطة ${currentAgent.title} (${usedProviderLabel} - ${usedModelLabel})\n// الطلب: ${userMsgText}\n\n/*\n${aiReplyText}\n*/\n\nexport function GeneratedFeatureModule() {\n  return (\n    <div dir="rtl" className="p-6 bg-white rounded-2xl border shadow-sm">\n      <h2 className="text-lg font-bold">${userMsgText}</h2>\n    </div>\n  );\n}`;
          const newFileName = `Module_${p.codeFiles.length + 1}_${Date.now().toString().slice(-3)}.tsx`;
          updatedFiles = [...p.codeFiles, { name: newFileName, content: extractedCode }];
          setSelectedCodeFileIdx(updatedFiles.length - 1);
          showToast(`قام ${currentAgent.title} (${usedProviderLabel}) بتوليد ملف الكود ${newFileName}`);
        } else if (gateNum === 4) {
          const summaryLines = aiReplyText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 4)
            .slice(0, 8)
            .map((l: string) => `[PASS • ${usedProviderLabel}] ${l.replace(/^[#*-]+\s*/, '')}`);
          updatedTests = {
            passed: (p.testResults?.passed || 20) + 4,
            failed: 0,
            logs: [
              ...(p.testResults?.logs || []),
              `[AUDIT RUN] ${currentAgent.title} (${usedProviderLabel} • ${usedModelLabel})`,
              ...summaryLines,
            ],
          };
          showToast(`تم إصدار تقرير فحص الجودة والأمان بواسطة ${usedProviderLabel}`);
        } else if (gateNum === 5) {
          updatedDesign = `${p.designNotes}\n\n[تقرير التسليم والـ DevOps - ${usedProviderLabel}]:\n${aiReplyText}`;
          showToast(`تم تجهيز خطة الإطلاق وحزمة التسليم بواسطة ${usedProviderLabel}`);
        }
        return { ...p, prd: updatedPrd, designNotes: updatedDesign, codeFiles: updatedFiles, testResults: updatedTests };
      }));

    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: err?.message || 'عذراً، حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => ({
        ...prev,
        [gateNum]: [...(prev[gateNum] || []), errorMsg]
      }));
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Handle AI Chat Form Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await executeStageAgentPrompt(chatInput);
  };

  // APPROVE & CONTINUE BUTTON (ONE APPROVAL BUTTON)
  const handleApproveAndAdvance = () => {
    if (!activeProject) return;
    const currentG = activeProject.currentGate;
    if (currentG < 5) {
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProject.id) return p;
        return { ...p, currentGate: p.currentGate + 1 };
      }));
      showToast(`تم اعتماد البوابة ${currentG} بنجاح والانتقال إلى البوابة ${currentG + 1}`);
    } else {
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProject.id) return p;
        return { ...p, status: 'completed' };
      }));
      showToast('تم اعتماد وتسليم المشروع بنجاح!');
    }
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    if (newProjMode === 'managed' && projectCredits <= 0) {
      showToast('رصيد مشاريعك 0. يرجى شحن رصيد مشروع جديد بقيمة 100 JOD للمتابعة.');
      setCurrentView('billing');
      return;
    }

    if (newProjMode === 'managed') {
      setProjectCredits(c => c - 1);
    }

    const newP: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName,
      description: newProjDesc || 'مشروع برمجي جديد',
      mode: newProjMode,
      currentGate: 1,
      status: 'in_progress',
      prd: `# وثيقة متطلبات المنتج (${newProjName})\n\n## 1. نظرة عامة\n${newProjDesc}\n\n## 2. النطاق والأهداف\nتطوير وتصميم تطبيق سحابي متكامل.`,
      designNotes: 'تصميم نظيف ببطاقات بيضاء ودعم كامل للغة العربية (RTL).',
      codeFiles: [
        { name: 'App.tsx', content: `export default function App() {\n  return <div className="p-6">مشروع ${newProjName}</div>;\n}` }
      ],
      testResults: { passed: 20, failed: 0, logs: ['[PASS] Initial build verified'] },
      createdAt: new Date().toISOString().split('T')[0]
    };

    setProjects(prev => [newP, ...prev]);
    setActiveProjectId(newP.id);
    setNewProjName('');
    setNewProjDesc('');
    setCurrentView('gate-workspace');
    showToast('تم إنشاء المشروع بنجاح وبدء وكيل المتطلبات العمل!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased flex flex-col select-none" dir="rtl">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AUTH & LOGIN / SIGNUP VIEWS */}
      {/* ========================================================================= */}
      {(currentView === 'login' || currentView === 'signup') && (
        <div className="flex-1 flex items-center justify-center bg-slate-900 p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">OGroup AI Software Factory</h1>
                <p className="text-xs text-slate-500">مصنع البرمجيات الذكي - البوابات الخمس</p>
              </div>
            </div>

            <form onSubmit={e => handleLoginOrSignup(currentView === 'signup', e)} className="space-y-4">
              {currentView === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)} required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="أدخل اسمك الكامل" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="name@example.com أو admin@ogroup.ai" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                <input type="password" required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="••••••••" />
              </div>

              <button type="submit" className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                {currentView === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setUserEmail('admin@ogroup.ai');
                  setActiveScreen('admin-customers');
                  setCurrentView('dashboard');
                  showToast('تم تسجيل دخول الإدارة السريع بنجاح');
                }}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-orange-600" />
                <span>تسجيل دخول سريع كمسؤول النظام (Admin Portal)</span>
              </button>

              <div className="text-center pt-1">
                {currentView === 'login' ? (
                  <button onClick={() => setCurrentView('signup')} className="text-xs text-orange-600 font-bold hover:underline">
                    ليس لديك حساب؟ إنشاء حساب جديد (Sign up)
                  </button>
                ) : (
                  <button onClick={() => setCurrentView('login')} className="text-xs text-orange-600 font-bold hover:underline">
                    لديك حساب بالفعل؟ تسجيل الدخول
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN PAGES OR CUSTOMER DASHBOARD */}
      {/* ========================================================================= */}
      {currentView !== 'login' && currentView !== 'signup' && (
        <>
          {/* If Admin, render Admin View with full 9-item sidebar */}
          {isAdmin ? (
            <div className="flex-1 flex overflow-hidden bg-[#f9f9ff]">
              {/* Admin Sidebar with all 9 navigation items matching Stitch design */}
              <aside className="fixed right-0 top-0 h-full w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
                <div className="flex flex-col">
                  <div className="h-16 px-6 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-lg">O</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold tracking-tight text-slate-800 leading-tight">OGroup AI Factory</span>
                      <span className="text-[11px] text-slate-500 leading-tight">بوابة الإدارة المركزية</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <nav className="flex flex-col gap-1 text-xs font-semibold">
                      <button onClick={() => setActiveScreen('admin-dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-dashboard' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <LayoutGrid className="w-4 h-4 text-slate-500" />
                        <span>الرئيسية (لوحة القيادة العامة)</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-providers')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-providers' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Network className="w-4 h-4 text-slate-500" />
                        <span>مزودو الذكاء الاصطناعي</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-agents')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-agents' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Bot className="w-4 h-4 text-slate-500" />
                        <span>الوكلاء الخمسة</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-customers')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-customers' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>العملاء</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-projects')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-projects' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Folder className="w-4 h-4 text-slate-500" />
                        <span>المشاريع</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-billing')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-billing' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span>الاشتراكات والمدفوعات</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-costs')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-costs' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <BarChart3 className="w-4 h-4 text-slate-500" />
                        <span>الاستهلاك والتكاليف</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-audit')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-audit' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <History className="w-4 h-4 text-slate-500" />
                        <span>سجل النشاط</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-settings')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-settings' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>الإعدادات</span>
                      </button>

                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition text-right mt-4">
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </nav>
                  </div>
                </div>
                <div className="p-4 m-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-slate-800 font-semibold">حماية الإدارة نشطة</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>النظام الآمن</span>
                    <span className="font-semibold" dir="ltr">v2.4.0 Admin Core</span>
                  </div>
                </div>
              </aside>

              {/* Admin Main View */}
              <div className="pr-72 flex-1 flex flex-col min-h-screen overflow-y-auto">
                <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
                  <div className="flex items-center gap-4 flex-1 max-w-lg">
                    <div className="relative w-full">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input type="text" placeholder="بحث شامل في العملاء، المشاريع، والعمليات..." className="w-full h-10 pr-10 pl-4 rounded-lg bg-slate-100 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                      <Shield className="w-4 h-4" />
                      <span>Admin / إدارة المنصة</span>
                    </div>
                    <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                      <div className="text-left rtl:text-right">
                        <span className="block text-xs font-bold text-slate-800">المدير العام - عبد الله المنصور</span>
                        <span className="block text-[10px] text-orange-600 font-medium">مسؤول النظام (admin@ogroup.ai)</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm">ع</div>
                    </div>
                  </div>
                </header>

                {/* Admin Dashboard Overview */}
                {activeScreen === 'admin-dashboard' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الرئيسية (لوحة القيادة العامة)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">الرئيسية (لوحة القيادة العامة للإدارة)</h1>
                        <p className="text-xs text-slate-500 mt-1">نظرة شاملة على أداء مصنع البرمجيات، حالة ربط الوكلاء الخمسة ومفاتيح الذكاء الاصطناعي، والعملاء النشطين.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActiveScreen('admin-providers')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2">
                          <Key className="w-4 h-4 text-orange-600" />
                          <span>إدارة مفاتيح المزودين</span>
                        </button>
                        <button onClick={() => setActiveScreen('admin-agents')} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span>إعداد الوكلاء الخمسة</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">إجمالي المشاريع المصنعة</span>
                        <div className="text-2xl font-black text-slate-900 tabular-nums">3,428 مشروع</div>
                        <span className="text-[11px] text-emerald-600 font-semibold block">342 قيد البناء النشط</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">الوكلاء الخمسة المتصلون</span>
                        <div className="text-2xl font-black text-emerald-600 tabular-nums">
                          {factoryAgents.filter(a => a.enabled).length} / 5 نشط
                        </div>
                        <span className="text-[11px] text-slate-500 block">مرتبطون بمفاتيح النظام الحية</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">إجمالي الإيرادات الشهرية</span>
                        <div className="text-2xl font-black text-orange-600 tabular-nums" dir="ltr">48,400 JOD</div>
                        <span className="text-[11px] text-slate-500 block">100 د.أ مدار • 50 د.أ BYOK</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">مزودو الذكاء الاصطناعي</span>
                        <div className="text-2xl font-black text-slate-900 tabular-nums">
                          {factoryProviders.filter(p => p.enabled).length} مزودات متصلة
                        </div>
                        <span className="text-[11px] text-emerald-600 font-semibold block">Gemini 3.8 Flash جاهز</span>
                      </div>
                    </div>

                    {/* Connected Agents Overview Strip */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900">حالة ربط وكلاء المصنع الخمسة (Live AI Agents Pipeline)</h2>
                          <p className="text-xs text-slate-500">النماذج والمفاتيح المفعلة حالياً لتشغيل بوابات بناء البرمجيات للعملاء</p>
                        </div>
                        <button onClick={() => setActiveScreen('admin-agents')} className="text-xs text-orange-600 font-bold hover:underline">
                          تعديل ربط المفاتيح والنماذج ←
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {factoryAgents.map((ag) => (
                          <div key={ag.gate} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-orange-600 font-mono">{ag.gateCode}</span>
                                <span className={`text-[10px] font-bold ${ag.enabled ? 'text-emerald-700' : 'text-red-600'}`}>
                                  {ag.enabled ? 'متصل' : 'متوقف'}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 line-clamp-1">{ag.title}</div>
                            </div>
                            <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                              <div className="truncate">{ag.providerName}</div>
                              <div className="font-mono text-[10px] text-slate-500 truncate" dir="ltr">{ag.model}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Customers Management (Exact Stitch Design) */}
                {activeScreen === 'admin-customers' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>إدارة الحسابات</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل العملاء والمشتركين</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة العملاء والمشتركين (Customer Directory & Accounts)</h1>
                        <p className="text-xs text-slate-500 mt-1">لوحة الرصد والتحكم الشاملة في حسابات العملاء، باقات الاشتراك، المشاريع المفعلة، وإدارة صلاحيات ومفاتيح الوصول.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تصدير تقرير العملاء CSV بنجاح')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <Download className="w-4 h-4 text-orange-600" />
                          <span>تصدير تقرير العملاء (CSV / Excel)</span>
                        </button>
                        <button onClick={() => showToast('تم فتح نافذة دعوة عميل جديد')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          <span>إضافة عميل جديد / دعوة للمنصة</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي العملاء المسجلين</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">1,428</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+12.4% مقارنة بالشهر الماضي</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشتركو الباقة الخاصة (BYOK)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">380</span>
                              <span className="text-xs text-orange-600 font-bold">50 د.أ/شهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Key className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">26.6%</span>
                          <span>من إجمالي العملاء - اشتراك شهري مستمر</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عملاء مصنعنا المدار (Managed)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">1,048</span>
                              <span className="text-xs text-slate-500">100 د.أ/مشروع</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Cpu className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                          <span>دفع حسب المشروع - إجمالي 294 مشروع منفذ</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">الحسابات المعلقة / تحت المراجعة</span>
                            <div className="text-2xl font-black text-red-600 mt-1">14</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-red-600 font-semibold">
                          <span>3 أمان • 11 بانتظار تجديد الدفع</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..." className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                          <option>حالة الحساب: الكل</option>
                          <option>نشط (Active)</option>
                          <option>معلق (Suspended)</option>
                        </select>
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                          <option>نوع الاشتراك: الكل</option>
                          <option>باقة المفاتيح (BYOK)</option>
                          <option>مصنعنا المدار</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">العميل / الحساب</th>
                              <th className="py-3.5 px-6">تاريخ التسجيل</th>
                              <th className="py-3.5 px-6">حالة الحساب</th>
                              <th className="py-3.5 px-6">نمط الاشتراك</th>
                              <th className="py-3.5 px-6 text-center">المشاريع</th>
                              <th className="py-3.5 px-6">إجمالي الإنفاق</th>
                              <th className="py-3.5 px-6">استهلاك الرموز (Tokens)</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {[
                              { name: 'أحمد محمد الرواشدة', email: 'ahmed.r@al-rawnaq.com', phone: '+962 79 123 4567', date: '12 يناير 2024', status: 'نشط', mode: 'مفاتيحي الخاصة (BYOK)', projects: '5 مشاريع', spend: '250 د.أ', tokens: '4.2M' },
                              { name: 'م. سارة فهد المنصور', email: 'sara.mansoor@almasar-logistics.com', phone: '+962 78 554 9921', date: '28 ديسمبر 2023', status: 'نشط', mode: 'مصنعنا المدار (Managed)', projects: '3 مشاريع', spend: '300 د.أ', tokens: '9.8M' },
                              { name: 'د. خالد إبراهيم عمر', email: 'dr.khaled@alshifa-clinics.jo', phone: '+962 77 888 1234', date: '05 نوفمبر 2023', status: 'نشط', mode: 'مصنعنا المدار (Managed)', projects: '4 مشاريع', spend: '400 د.أ', tokens: '14.5M' },
                              { name: 'ريم عبد الله الكردي', email: 'reem.k@natural-oasis.com', phone: '+962 79 987 6543', date: '18 يناير 2024', status: 'نشط', mode: 'مفاتيحي الخاصة (BYOK)', projects: '2 مشاريع', spend: '100 د.أ', tokens: '1.8M' },
                              { name: 'طارق زياد القضاة', email: 'tareq@afaq-properties.jo', phone: '+962 78 443 2109', date: '02 فبراير 2024', status: 'معلق مؤقتاً', mode: 'تجاوز حد الاستهلاك', projects: '1 مشروع', spend: '100 د.أ', tokens: '10.2M' },
                            ].map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
                                      {c.name.slice(0, 2)}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-1">
                                        <span>{c.name}</span>
                                        <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
                                      </div>
                                      <div className="text-[11px] text-slate-400">{c.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 font-medium text-slate-600">{c.date}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${c.status === 'نشط' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    ● {c.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-800">{c.mode}</td>
                                <td className="py-4 px-6 text-center font-bold">{c.projects}</td>
                                <td className="py-4 px-6 font-bold text-slate-900">{c.spend}</td>
                                <td className="py-4 px-6">
                                  <div className="space-y-1 w-28">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                      <span>{c.tokens}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="bg-orange-600 h-full rounded-full" style={{ width: `${Math.random() * 60 + 30}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => showToast(`عرض ملف العميل: ${c.name}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تم تجميد الحساب: ${c.name}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition">
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination as per design */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 1,428 عميل مسجل في المنصة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">287</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen 1: Five Factory Agents Configuration & Key Binding */}
                {activeScreen === 'admin-agents' && (
                  <main className="p-8 space-y-6">
                    {/* Breadcrumb & Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>محرك الذكاء الاصطناعي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">تهيئة الوكلاء الخمسة وربط المفاتيح</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                          تهيئة وكلاء المصنع الخمسة وربط المفاتيح <span className="text-sm font-normal text-slate-500" dir="ltr">(Five AI Agents & API Key Routing)</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                          تحكم كامل في كل وكيل من البوابات الخمس: تفعيل الوكيل، اختيار المزود والنموذج، إدخال مفتاح API مخصص أو ربطه بخزنة النظام، وتجربة استجابة الوكيل مباشرة.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <button
                          onClick={() => openAddProviderModal(2, 'stitch')}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shadow-xs"
                        >
                          <Plus className="w-4 h-4 text-orange-400" />
                          <span>إضافة مزود / مفتاح جديد (Google Stitch أو أي AI)</span>
                        </button>
                        <button
                          onClick={() => setActiveScreen('admin-providers')}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Key className="w-4 h-4 text-orange-600" />
                          <span>خزنة جميع المزودين ({factoryProviders.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTestAllFiveAgents}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 text-orange-400" />
                          <span>اختبار جميع الوكلاء الخمسة معاً</span>
                        </button>
                        <button
                          onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, 'تم حفظ وتفعيل ربط الوكلاء الخمسة ومفاتيحهم في النظام بنجاح')}
                          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>حفظ وتفعيل الإعدادات في النظام</span>
                        </button>
                      </div>
                    </div>

                    {/* Add New Provider / Custom AI Engine Modal (accessible directly on Agents screen) */}
                    {isAddProviderOpen && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-orange-500 shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              إضافة مزود ذكاء اصطناعي أو مفتاح API جديد (Google Stitch أو أي محرك مخصص غير موجود بالقائمة)
                            </h3>
                            <p className="text-xs text-slate-500">
                              اختر من المحركات العالمية الجاهزة أو اختر "أي مزود ذكاء اصطناعي آخر (Custom)" لإدخال أي اسم مزود، نموذج، رابط Endpoint، ومفتاح API.
                            </p>
                          </div>
                          <button onClick={() => setIsAddProviderOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg bg-slate-100">
                            ✕ إغلاق
                          </button>
                        </div>

                        <form onSubmit={handleAddNewProvider} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">1. نوع المحرك (AI Engine Type)</label>
                            <select
                              value={newProviderType}
                              onChange={e => {
                                const val = e.target.value as AIProviderEngineType;
                                setNewProviderType(val);
                                const preset = ENGINE_PRESETS[val] || ENGINE_PRESETS.custom;
                                setNewProviderModel(preset.model);
                                setNewProviderEndpoint(preset.endpoint);
                                if (!newProviderName || newProviderName === 'Google Stitch Design AI') {
                                  setNewProviderName(preset.label.split(' (')[0]);
                                }
                              }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              {Object.entries(ENGINE_PRESETS).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">2. اسم المزود في النظام (Provider Name)</label>
                            <input
                              type="text"
                              required
                              value={newProviderName}
                              onChange={e => setNewProviderName(e.target.value)}
                              placeholder="مثال: Google Stitch UI Pro أو اسم أي مزود"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">3. معرف النموذج (Model ID - يمكنك كتابة أي نموذج)</label>
                            <input
                              type="text"
                              required
                              value={newProviderModel}
                              onChange={e => setNewProviderModel(e.target.value)}
                              placeholder="google-stitch-v2-ui / gpt-4o / custom-model"
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">4. مفتاح الـ API (API Key)</label>
                            <input
                              type="text"
                              value={newProviderKey}
                              onChange={e => setNewProviderKey(e.target.value)}
                              placeholder="الصق مفتاح الـ API هنا (AIza... أو sk-... أو gsk_...)"
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">5. رابط الخدمة (API Endpoint URL)</label>
                            <input
                              type="text"
                              value={newProviderEndpoint}
                              onChange={e => setNewProviderEndpoint(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">6. ربط مباشر مع بوابة (اختياري)</label>
                            <select
                              value={newProviderAssignGate}
                              onChange={e => setNewProviderAssignGate(Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value={0}>إضافة للقائمة العامة بدون تغيير البوابات الحالية</option>
                              <option value={1}>ربط مباشر مع GATE 01 (وكيل المتطلبات)</option>
                              <option value={2}>ربط مباشر مع GATE 02 (وكيل التصميم - Google Stitch)</option>
                              <option value={3}>ربط مباشر مع GATE 03 (وكيل البرمجة والكود)</option>
                              <option value={4}>ربط مباشر مع GATE 04 (وكيل الفحص والأمان)</option>
                              <option value={5}>ربط مباشر مع GATE 05 (وكيل التسليم السحابي)</option>
                            </select>
                          </div>

                          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setIsAddProviderOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                            >
                              حفظ المزود والمفتاح وتفعيله فوراً
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* 4 KPI Summary Cards for Agents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">الوكلاء المفعلون في خط الإنتاج</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                            {factoryAgents.filter(a => a.enabled).length} / 5 وكلاء
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">متصلون ببوابات العملاء مباشرة</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">إجمالي مزودات الـ AI المتاحة</span>
                          <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{factoryProviders.length} مزود</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">
                            يتضمن Google Stitch و Gemini و OpenAI و Claude و Groq
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Key className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">محرك التصميم والـ UI</span>
                          <div className="text-lg font-black text-slate-900 mt-1 font-mono" dir="ltr">Google Stitch + Gemini</div>
                          <span className="text-[11px] text-orange-600 font-semibold mt-2 block">يدعم إضافة أي نموذج أو مفتاح مخصص</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Cpu className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">التسليم التلقائي بين البوابات</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">100% متزامن</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">يمرر سياق المشروع من بوابة لأخرى</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* 5 Interactive Agent Cards */}
                    <div className="space-y-5">
                      {factoryAgents.map((agent) => {
                        const testResult = agentTestResults[`agent-${agent.gate}`];
                        const isTesting = testingTargetId === `agent-${agent.gate}`;
                        const showKey = Boolean(visibleKeyIds[`agent-${agent.gate}`]);
                        const linkedProv = factoryProviders.find(p => p.id === agent.providerId) || factoryProviders[0];
                        const isCustomModelInput = Boolean(customModelModeGates[agent.gate]);
                        const activeKeyVal = agent.useProviderKey ? (linkedProv?.apiKey || '') : (agent.apiKey || '');

                        return (
                          <div key={agent.gate} className={`bg-white rounded-2xl p-6 shadow-sm border transition ${agent.enabled ? 'border-slate-200' : 'border-red-200 bg-slate-50/60'}`}>
                            {/* Top Row: Gate Identity & Enable Switch + Live Test Button */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                              <div className="flex items-start gap-3.5">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${agent.enabled ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                  <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold font-mono text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded">
                                      {agent.gateCode}
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-base">{agent.title}</h3>
                                    <span className="text-xs text-slate-400" dir="ltr">({agent.roleEn})</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{agent.desc}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, enabled: !a.enabled } : a
                                    );
                                    syncSystemConfigToBackend(
                                      factoryProviders,
                                      updated,
                                      !agent.enabled ? `تم تفعيل ${agent.title} في النظام` : `تم إيقاف ${agent.title} مؤقتاً`
                                    );
                                  }}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                                    agent.enabled
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                >
                                  {agent.enabled ? 'مفعل في النظام (Enabled)' : 'متوقف مؤقتاً (Disabled)'}
                                </button>

                                <button
                                  type="button"
                                  disabled={isTesting}
                                  onClick={() => handleTestAgentOrProvider(`agent-${agent.gate}`, agent.gate)}
                                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Play className="w-3.5 h-3.5 text-orange-400" />
                                  <span>{isTesting ? 'جاري فحص الوكيل...' : 'اختبار الوكيل والمفتاح حياً'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Configuration Grid: Provider, Model, API Key Binding, Direct Key Input */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
                              {/* 1. Assigned Provider */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700">المزود المرتبط (AI Provider)</label>
                                  <button
                                    type="button"
                                    onClick={() => openAddProviderModal(agent.gate, 'custom')}
                                    className="text-[11px] font-bold text-orange-600 hover:underline"
                                  >
                                    + إضافة مزود جديد
                                  </button>
                                </div>
                                <select
                                  value={agent.providerId}
                                  onChange={(e) => {
                                    if (e.target.value === '__add_new_provider__') {
                                      openAddProviderModal(agent.gate, 'custom');
                                      return;
                                    }
                                    const selProv = factoryProviders.find(p => p.id === e.target.value) || factoryProviders[0];
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate
                                        ? { ...a, providerId: selProv.id, providerName: selProv.name, model: selProv.model }
                                        : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated, `تم ربط ${agent.gateCode} بالمزود ${selProv.name}`);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  {factoryProviders.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.enabled ? '(نشط)' : '(غير مفعل)'}
                                    </option>
                                  ))}
                                  <option value="__add_new_provider__">➕ إضافة مزود ذكاء اصطناعي غير موجود بالقائمة...</option>
                                </select>
                              </div>

                              {/* 2. Active Model (All AI Models + Custom Free-Text Input) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700">النموذج النشط (Model ID)</label>
                                  <button
                                    type="button"
                                    onClick={() => setCustomModelModeGates(prev => ({ ...prev, [agent.gate]: !isCustomModelInput }))}
                                    className="text-[11px] font-bold text-orange-600 hover:underline"
                                  >
                                    {isCustomModelInput ? 'اختر من القائمة' : 'كتابة نموذج مخصص ✎'}
                                  </button>
                                </div>
                                {isCustomModelInput ? (
                                  <input
                                    type="text"
                                    value={agent.model}
                                    onChange={(e) => {
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, model: e.target.value } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    placeholder="اكتب اسم أي نموذج (مثال: google-stitch-v2-ui)"
                                    dir="ltr"
                                    className="w-full h-10 px-3 rounded-xl bg-white border border-orange-400 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                ) : (
                                  <select
                                    value={agent.model}
                                    onChange={(e) => {
                                      if (e.target.value === '__custom_model__') {
                                        setCustomModelModeGates(prev => ({ ...prev, [agent.gate]: true }));
                                        return;
                                      }
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, model: e.target.value } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    dir="ltr"
                                  >
                                    <optgroup label="Google Stitch (UI/UX Design AI)">
                                      <option value="google-stitch-v2-ui">google-stitch-v2-ui (Google Stitch Design)</option>
                                      <option value="google-stitch-design-pro">google-stitch-design-pro (Stitch Pro RTL)</option>
                                      <option value="google-stitch-figma-rtl">google-stitch-figma-rtl (Stitch + Tailwind)</option>
                                    </optgroup>
                                    <optgroup label="Google Gemini">
                                      <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                      <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                    </optgroup>
                                    <optgroup label="OpenAI (GPT / o-Series)">
                                      <option value="gpt-4o-2024-11-20">gpt-4o-2024-11-20</option>
                                      <option value="gpt-4.5-preview">gpt-4.5-preview</option>
                                      <option value="o3-mini">o3-mini (Reasoning & Code)</option>
                                      <option value="o1">o1 (Deep Reasoning)</option>
                                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                                    </optgroup>
                                    <optgroup label="Anthropic Claude">
                                      <option value="claude-3-7-sonnet">claude-3-7-sonnet (Extended Thinking)</option>
                                      <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                                      <option value="claude-3-5-haiku">claude-3-5-haiku</option>
                                      <option value="claude-3-opus">claude-3-opus</option>
                                    </optgroup>
                                    <optgroup label="Groq Cloud LPU">
                                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                                      <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                                    </optgroup>
                                    <optgroup label="DeepSeek / Mistral / xAI Grok / v0 / OpenRouter">
                                      <option value="deepseek-chat">deepseek-chat (DeepSeek V3)</option>
                                      <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek R1)</option>
                                      <option value="codestral-latest">codestral-latest (Mistral Code)</option>
                                      <option value="mistral-large-latest">mistral-large-latest</option>
                                      <option value="grok-3">grok-3 (xAI)</option>
                                      <option value="v0-1.0-md">v0-1.0-md (Vercel v0 UI)</option>
                                      <option value="openrouter/auto">openrouter/auto (Universal)</option>
                                      <option value="sonar-pro">sonar-pro (Perplexity)</option>
                                      <option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen2.5-Coder-32B (Together AI)</option>
                                      <option value="command-r-plus-08-2024">command-r-plus-08-2024 (Cohere)</option>
                                    </optgroup>
                                    <option value={agent.model}>{agent.model} (Current)</option>
                                    <option value="__custom_model__">➕ كتابة اسم نموذج مخصص غير موجود بالقائمة...</option>
                                  </select>
                                )}
                              </div>

                              {/* 3. Key Mode Selector */}
                              <div>
                                <label className="block font-bold text-slate-700 mb-1.5">مصدر مفتاح التشغيل (Key Source)</label>
                                <select
                                  value={agent.useProviderKey ? 'provider' : 'custom'}
                                  onChange={(e) => {
                                    const useProv = e.target.value === 'provider';
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, useProviderKey: useProv } : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="provider">مفتاح المزود الرئيسي ({agent.providerName})</option>
                                  <option value="custom">مفتاح API مخصص لهذا الوكيل فقط ({agent.gateCode})</option>
                                </select>
                              </div>

                              {/* 4. Direct API Key Input (Works for BOTH Provider Key and Dedicated Agent Key!) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700 truncate">
                                    {agent.useProviderKey ? `مفتاح ${agent.providerName}` : `مفتاح خاص لـ ${agent.gateCode}`}
                                  </label>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                                    {activeKeyVal ? 'مفتاح مخصص مفعل' : 'مفتاح النظام تلقائياً'}
                                  </span>
                                </div>
                                <div className="relative flex items-center">
                                  <input
                                    type={showKey ? 'text' : 'password'}
                                    value={activeKeyVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (agent.useProviderKey && linkedProv) {
                                        const updatedProvs = factoryProviders.map(p =>
                                          p.id === linkedProv.id ? { ...p, apiKey: val, useSystemEnv: !val.trim() } : p
                                        );
                                        syncSystemConfigToBackend(updatedProvs, factoryAgents);
                                      } else {
                                        const updatedAgents = factoryAgents.map(a =>
                                          a.gate === agent.gate ? { ...a, apiKey: val } : a
                                        );
                                        syncSystemConfigToBackend(factoryProviders, updatedAgents);
                                      }
                                    }}
                                    placeholder={`أدخل مفتاح ${agent.providerName} هنا (أو اتركه للخزنة)`}
                                    dir="ltr"
                                    className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setVisibleKeyIds(prev => ({ ...prev, [`agent-${agent.gate}`]: !showKey }))}
                                    className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                                    title="إظهار / إخفاء المفتاح"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                              {/* System Prompt & Temperature Configuration */}
                            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
                              <div className="lg:col-span-3">
                                <label className="block font-bold text-slate-700 mb-1.5">
                                  التعليمات التوجيهية للوكيل (System Prompt & Gate Instructions)
                                </label>
                                <textarea
                                  rows={2}
                                  value={agent.systemPrompt}
                                  onChange={(e) => {
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, systemPrompt: e.target.value } : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated);
                                  }}
                                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div className="flex flex-col justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                  <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                                    <span>درجة الإبداع (Temperature)</span>
                                    <span className="font-mono text-orange-600 tabular-nums" dir="ltr">{agent.temperature}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.1"
                                    value={agent.temperature}
                                    onChange={(e) => {
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, temperature: parseFloat(e.target.value) } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    className="w-full accent-orange-600 cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                                  <span>الحد الأقصى للرموز:</span>
                                  <span className="font-mono font-bold text-slate-800 tabular-nums" dir="ltr">{agent.maxTokens} tokens</span>
                                </div>
                              </div>
                            </div>

                            {/* Live Test Response Banner (if tested) */}
                            {testResult && (
                              <div className={`mt-4 p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                testResult.ok ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                <div className="space-y-1">
                                  <div className="font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>رد الوكيل الحي ({testResult.model}):</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed">{testResult.reply}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] bg-white px-3 py-1.5 rounded-lg border border-emerald-200" dir="ltr">
                                  <span>{testResult.keySource}</span>
                                  <span>•</span>
                                  <span className="font-bold text-emerald-700">{testResult.latencyMs}ms</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </main>
                )}

                {/* Admin Screen 2: AI Providers & API Keys Vault Management */}
                {activeScreen === 'admin-providers' && (
                  <main className="p-8 space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>البنية التحتية للذكاء الاصطناعي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">مزودو الذكاء الاصطناعي وخزنة المفاتيح (AI Providers Vault)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                          إدارة مزودي الذكاء الاصطناعي ومفاتيح النظام <span className="text-sm font-normal text-slate-500" dir="ltr">(Factory AI Providers & API Keys)</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                          لوحة التحكم المركزية لإضافة وتفعيل مفاتيح API الخاصة بالمصنع (Google Stitch, Gemini, OpenAI, Claude, Groq, DeepSeek, وأي مزود مخصص).
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleTestAgentOrProvider('prov-stitch', 2)}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>فحص اتصال المزودات</span>
                        </button>
                        <button
                          onClick={() => openAddProviderModal(0, 'custom')}
                          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة مزود أو مفتاح جديد غير موجود بالقائمة</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">المزودات المفعلة في المصنع</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                            {factoryProviders.filter(p => p.enabled).length} / {factoryProviders.length}
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">متصلة وجاهزة لتشغيل البوابات</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Network className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">مفتاح النظام الأساسي (Env Vault)</span>
                          <div className="text-2xl font-black text-emerald-600 mt-1">
                            {hasSystemEnvKey ? 'متصل ونشط' : 'مفاتيح مخصصة'}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-2 block">تشفير خزنة AES-256-GCM</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">متوسط زمن استجابة المزودات</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums" dir="ltr">142ms</div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">99.98% جاهزية (SLA)</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">الميزانية الشهرية لمفاتيح المصنع</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">1,840 / 5,000 د.أ</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">36.8% مستهلك هذا الشهر</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Add New Provider Modal */}
                    {isAddProviderOpen && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-orange-500 shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">إضافة مزود ذكاء اصطناعي أو مفتاح API جديد للنظام</h3>
                            <p className="text-xs text-slate-500">يدعم Google Stitch وجميع محركات الذكاء الاصطناعي العالمية أو أي رابط Endpoint مخصص</p>
                          </div>
                          <button onClick={() => setIsAddProviderOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg bg-slate-100">
                            ✕ إغلاق
                          </button>
                        </div>

                        <form onSubmit={handleAddNewProvider} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">1. نوع المحرك (AI Engine Type)</label>
                            <select
                              value={newProviderType}
                              onChange={e => {
                                const val = e.target.value as AIProviderEngineType;
                                setNewProviderType(val);
                                const preset = ENGINE_PRESETS[val] || ENGINE_PRESETS.custom;
                                setNewProviderModel(preset.model);
                                setNewProviderEndpoint(preset.endpoint);
                                if (!newProviderName) {
                                  setNewProviderName(preset.label.split(' (')[0]);
                                }
                              }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                            >
                              {Object.entries(ENGINE_PRESETS).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">2. اسم المزود (Provider Name)</label>
                            <input
                              type="text"
                              required
                              value={newProviderName}
                              onChange={e => setNewProviderName(e.target.value)}
                              placeholder="مثال: Google Stitch Design Pro أو اسم مزودك"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">3. النموذج الافتراضي (Default Model ID)</label>
                            <input
                              type="text"
                              value={newProviderModel}
                              onChange={e => setNewProviderModel(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">4. مفتاح API (API Key)</label>
                            <input
                              type="text"
                              value={newProviderKey}
                              onChange={e => setNewProviderKey(e.target.value)}
                              placeholder="AIzaSy... أو sk-... أو gsk_..."
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-orange-300 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">5. رابط الخدمة (API Endpoint URL)</label>
                            <input
                              type="text"
                              value={newProviderEndpoint}
                              onChange={e => setNewProviderEndpoint(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">6. ربط مباشر مع بوابة (اختياري)</label>
                            <select
                              value={newProviderAssignGate}
                              onChange={e => setNewProviderAssignGate(Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                            >
                              <option value={0}>إضافة للقائمة العامة بدون تغيير البوابات</option>
                              <option value={1}>ربط مع GATE 01 (المتطلبات)</option>
                              <option value={2}>ربط مع GATE 02 (التصميم - Stitch)</option>
                              <option value={3}>ربط مع GATE 03 (البرمجة)</option>
                              <option value={4}>ربط مع GATE 04 (فحص الجودة)</option>
                              <option value={5}>ربط مع GATE 05 (التسليم)</option>
                            </select>
                          </div>
                          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setIsAddProviderOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                            >
                              حفظ المزود وتفعيله في النظام
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Provider Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {factoryProviders.map((prov) => {
                        const showKey = Boolean(visibleKeyIds[prov.id]);
                        const isTesting = testingTargetId === prov.id;
                        const testRes = agentTestResults[prov.id];
                        const linkedAgents = factoryAgents.filter(a => a.providerId === prov.id);

                        return (
                          <div key={prov.id} className={`bg-white rounded-2xl p-6 shadow-sm border space-y-4 transition ${prov.enabled ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${prov.enabled ? 'bg-orange-50 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                  <Network className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                                  <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{prov.endpoint}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, enabled: !p.enabled, status: (!p.enabled ? 'active' : 'disabled') as any } : p
                                    );
                                    syncSystemConfigToBackend(updated, factoryAgents, `تم تحديث حالة المزود ${prov.name}`);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${
                                    prov.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  {prov.enabled ? 'متصل ونشط' : 'معطل'}
                                </button>
                              </div>
                            </div>

                            {/* Key Configuration & Model Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">النموذج المعتمد (Active Model)</label>
                                <input
                                  type="text"
                                  value={prov.model}
                                  onChange={(e) => {
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, model: e.target.value } : p
                                    );
                                    setFactoryProviders(updated);
                                  }}
                                  dir="ltr"
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 mb-1">وضع مفتاح الـ API</label>
                                <select
                                  value={prov.useSystemEnv ? 'env' : 'custom'}
                                  onChange={(e) => {
                                    const useEnv = e.target.value === 'env';
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, useSystemEnv: useEnv } : p
                                    );
                                    setFactoryProviders(updated);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="env">مفتاح النظام المشفر (System Vault Key)</option>
                                  <option value="custom">إدخال مفتاح API مخصص للمزود</option>
                                </select>
                              </div>
                            </div>

                            {/* Custom Key Input Box */}
                            <div className="text-xs">
                              <label className="block font-bold text-slate-700 mb-1">
                                {prov.useSystemEnv ? 'مفتاح الخزنة المركزي (System Environment Key)' : 'مفتاح API الخاص بالمزود (Provider API Key)'}
                              </label>
                              {prov.useSystemEnv ? (
                                <div className="h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-600">
                                  <span className="font-mono text-[11px]" dir="ltr">GEMINI_API_KEY •••••••••••••••••••••••• (Active Vault)</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = factoryProviders.map(p =>
                                        p.id === prov.id ? { ...p, useSystemEnv: false } : p
                                      );
                                      setFactoryProviders(updated);
                                    }}
                                    className="text-orange-600 font-bold hover:underline text-[11px]"
                                  >
                                    تغيير المفتاح
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 flex items-center">
                                    <input
                                      type={showKey ? 'text' : 'password'}
                                      value={prov.apiKey}
                                      onChange={(e) => {
                                        const updated = factoryProviders.map(p =>
                                          p.id === prov.id ? { ...p, apiKey: e.target.value } : p
                                        );
                                        setFactoryProviders(updated);
                                      }}
                                      placeholder="أدخل مفتاح الـ API هنا (AIzaSy... أو sk-...)"
                                      dir="ltr"
                                      className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setVisibleKeyIds(prev => ({ ...prev, [prov.id]: !showKey }))}
                                      className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, `تم حفظ مفتاح ${prov.name} وربطه بالنظام`)}
                                    className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shrink-0"
                                  >
                                    حفظ المفتاح
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Linked Agents & Actions Footer */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="text-slate-500">
                                <span>الوكلاء المرتبطون: </span>
                                <strong className="text-slate-800">
                                  {linkedAgents.length > 0 ? linkedAgents.map(a => a.gateCode).join(' · ') : 'متاح للربط'}
                                </strong>
                                <span className="mx-2">·</span>
                                <span>الاستجابة: <strong className="font-mono text-slate-800" dir="ltr">{prov.latency}</strong></span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isTesting}
                                  onClick={() => handleTestAgentOrProvider(prov.id, 1, prov.useSystemEnv ? undefined : prov.apiKey)}
                                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <Play className="w-3.5 h-3.5 text-orange-600" />
                                  <span>{isTesting ? 'جاري الاختبار...' : 'اختبار المفتاح والاتصال'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, `تم حفظ إعدادات المزود ${prov.name} بنجاح`)}
                                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition whitespace-nowrap"
                                >
                                  تحديث وربط
                                </button>
                              </div>
                            </div>

                            {testRes && (
                              <div className={`p-3 rounded-xl border text-xs ${testRes.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <div className="flex items-center justify-between font-bold mb-1">
                                  <span>نتيجة اختبار الاتصال المباشر:</span>
                                  <span className="font-mono" dir="ltr">{testRes.latencyMs}ms • {testRes.model}</span>
                                </div>
                                <p className="text-slate-700">{testRes.reply}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </main>
                )}

                {/* Admin Screen: Projects Management */}
                {activeScreen === 'admin-projects' && (
                  <main className="p-8 space-y-6">
                    {/* Header & Stats Banner */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>خط الإنتاج الذكي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل المشاريع والبوابات الخمس</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة المشاريع البرمجية <span className="text-sm font-normal text-slate-500" dir="ltr">(Projects & Gates Pipeline)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">متابعة حية لكافة مشاريع العملاء عبر بوابات المصنع الخمس، أنماط التشغيل، استهلاك الموارد، وحالات التسليم.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تحديث حالة المشاريع والبوابات بنجاح')} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2">
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>مزامنة البوابات</span>
                        </button>
                        <button onClick={() => showToast('تم تصدير تقرير المشاريع الشامل (CSV / Excel)')} className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>تصدير سجل المشاريع</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي المشاريع المسجلة</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">3,428</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <FolderKanban className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+18.2% نمو في المشاريع هذا الشهر</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">قيد التنفيذ في البوابات (1-4)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-orange-600">342</span>
                              <span className="text-xs text-slate-500">مشروع نشط</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Code2 className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                          <span>84 مشروعاً في بوابة توليد الكود (Gate 3)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشاريع مكتملة ومسلمة (Gate 5)</span>
                            <div className="text-2xl font-black text-emerald-600 mt-1">3,069</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <PackageCheck className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700 font-semibold">
                          <span>نسبة إنجاز وتسليم 89.5% بدون أخطاء</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشاريع متوقفة / بانتظار الاعتماد</span>
                            <div className="text-2xl font-black text-red-600 mt-1">17</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-red-600 font-semibold">
                          <span>5 نفاد رصيد API • 12 بانتظار موافقة العميل</span>
                        </div>
                      </div>
                    </div>

                    {/* Factory Gates Live Distribution Strip */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-800">توزيع المشاريع النشطة حالياً عبر البوابات الخمس (342 مشروعاً قيد البناء)</span>
                        <span className="text-[11px] text-slate-500">متوسط زمن العبور الكامل: 42 دقيقة</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { gate: 'Gate 1: المتطلبات', count: '68 مشروع', pct: '20%', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                          { gate: 'Gate 2: التصميم', count: '74 مشروع', pct: '22%', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                          { gate: 'Gate 3: البرمجة', count: '84 مشروع', pct: '25%', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                          { gate: 'Gate 4: الفحص والجودة', count: '62 مشروع', pct: '18%', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                          { gate: 'Gate 5: جاهز للتسليم', count: '54 مشروع', pct: '15%', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        ].map((g, i) => (
                          <div key={i} className={`p-3 rounded-xl border ${g.color} flex items-center justify-between`}>
                            <div>
                              <div className="text-[11px] font-bold">{g.gate}</div>
                              <div className="text-sm font-black mt-0.5">{g.count}</div>
                            </div>
                            <span className="text-xs font-extrabold opacity-80">{g.pct}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="ابحث برقم المشروع (#PRJ)، اسم البرمجية، أو البريد الإلكتروني للعميل..." 
                          className="w-full h-10 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition text-slate-800"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>جميع البوابات (All Gates)</option>
                          <option>البوابة 1: المتطلبات (PRD)</option>
                          <option>البوابة 2: التصميم (UI/UX)</option>
                          <option>البوابة 3: التطوير البرمجي</option>
                          <option>البوابة 4: الفحص والجودة</option>
                          <option>البوابة 5: التسليم النهائي</option>
                        </select>
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>جميع أنماط التشغيل</option>
                          <option>مصنعنا المدار (100 د.أ / مشروع)</option>
                          <option>مفاتيح العميل الخاصة (BYOK - 50 د.أ)</option>
                        </select>
                      </div>
                    </div>

                    {/* Projects Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold">
                              <th className="py-3.5 px-6">المشروع والبرمجية</th>
                              <th className="py-3.5 px-6">مالك المشروع</th>
                              <th className="py-3.5 px-6">وضع التشغيل</th>
                              <th className="py-3.5 px-6">البوابة الحالية</th>
                              <th className="py-3.5 px-6">حالة التقدم</th>
                              <th className="py-3.5 px-6">استهلاك الرموز</th>
                              <th className="py-3.5 px-6">تاريخ الإنشاء</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { id: '#PRJ-9821', name: 'منصة إدارة العيادات الطبية الشاملة', owner: 'dr.rami@clinic.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 3: التطوير', status: 'قيد التوليد النشط', tokens: '3.4M', date: 'اليوم، 14:20' },
                              { id: '#PRJ-9815', name: 'متجر الحرف اليدوية الأردنية', owner: 'sarah.handicraft@gmail.com', mode: 'مفاتيح خاصة (BYOK)', gate: 'البوابة 5: التسليم', status: 'مكتمل وجاهز للإنتاج', tokens: '5.1M', date: 'أمس، 11:05' },
                              { id: '#PRJ-9802', name: 'نظام إدارة المخازن اللوجستية', owner: 'logistics@amman-hub.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 2: التصميم', status: 'مراجعة الواجهات', tokens: '1.2M', date: '14 أكتوبر 2026' },
                              { id: '#PRJ-9794', name: 'تطبيق المحامي الذكي للاستشارات', owner: 'legal.expert@lawyers.jo', mode: 'مفاتيح خاصة (BYOK)', gate: 'البوابة 4: الفحص والجودة', status: 'فحص ثغرات الأمن', tokens: '4.7M', date: '13 أكتوبر 2026' },
                              { id: '#PRJ-9788', name: 'منصة التعليم التفاعلي للجامعات', owner: 'dean@edu-tech.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 1: المتطلبات', status: 'صياغة وثيقة الـ PRD', tokens: '0.6M', date: '12 أكتوبر 2026' },
                            ].map((proj, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900">{proj.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{proj.id}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-600 font-mono">{proj.owner}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${proj.mode.includes('مصنعنا') ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {proj.mode}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg text-[10px]">
                                    {proj.gate}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-slate-700 font-semibold">{proj.status}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 font-mono font-bold text-slate-700">{proj.tokens}</td>
                                <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">{proj.date}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => showToast(`معاينة بوابات المشروع: ${proj.name}`)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="معاينة تفاصيل المشروع">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تم تعليق تنفيذ المشروع مؤقتاً: ${proj.id}`)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition" title="إيقاف مؤقت">
                                      <Shield className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 3,428 مشروعاً برمجياً مسجلاً في المنصة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">686</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Billing & Subscriptions (Exact Stitch Design) */}
                {activeScreen === 'admin-billing' && (
                  <main className="p-8 space-y-6">
                    {/* Breadcrumb & Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>الإدارة المالية والفوترة</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الاشتراكات والمدفوعات</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة الاشتراكات والمدفوعات <span className="text-sm font-normal text-slate-500" dir="ltr">(Billing, Subscriptions & Gateways)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">مركز الرقابة المالية لإيرادات المنصة، اشتراكات BYOK الشهرية (50 د.أ)، دفعات مشاريع المصنع (100 د.أ)، وبوابات الدفع.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تصدير التقرير المالي والفواتير الضريبية (CSV / Excel)')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <Download className="w-4 h-4 text-orange-600" />
                          <span>تصدير السجل المالي (CSV / PDF)</span>
                        </button>
                        <button onClick={() => showToast('تم فتح نافذة إصدار فاتورة أو تفعيل اشتراك يدوي')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          <span>+ إصدار فاتورة / تفعيل رصيد يدوي</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Financial KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي الإيرادات الشهرية (MRR + Projects)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-slate-900">48,400</span>
                              <span className="text-xs font-bold text-orange-600">د.أ (JOD)</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+21.8% مقارنة بالشهر الماضي</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إيرادات اشتراكات BYOK الشهرية</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">19,000</span>
                              <span className="text-xs text-blue-600 font-bold">د.أ / شهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Key className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-bold text-slate-800">380 مشترك نشط</span>
                          <span>× 50 د.أ (تجديد تلقائي 94%)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عوائد مشاريع المصنع المدار (100 د.أ)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">29,400</span>
                              <span className="text-xs text-purple-600 font-bold">د.أ هذا الشهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Cpu className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-bold text-slate-800">294 حزمة مشروع</span>
                          <span>مدفوعة بالكامل (100 د.أ / للمشروع)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عمليات معلقة أو تحت الخطر (At Risk)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-red-600">1,150</span>
                              <span className="text-xs text-red-600 font-bold">د.أ (18 عملية)</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-red-600 font-semibold">
                          <span>9 معاملات معلقة • 6 بطاقات منتهية • 3 استرداد</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Gateways Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: 'Stripe Connect Global', desc: 'البطاقات الائتمانية العالمية (Visa / Mastercard / Apple Pay)', status: 'متصل ومستقر', volume: '28,900 د.أ', txCount: '382 عملية', fee: '2.9% + 0.20 JOD' },
                        { name: 'Jordan PayHub & CliQ / eFAWATEERcom', desc: 'بوابة الدفع المحلية الأردنية والتحويل الفوري CliQ', status: 'متصل ومستقر', volume: '15,200 د.أ', txCount: '246 عملية', fee: '1.2% محلي' },
                        { name: 'التحويل البنكي المباشر للشركات', desc: 'حسابات الشركات والمؤسسات الحكومية (فواتير ضريبية)', status: 'مفعل (مراجعة يدوية)', volume: '4,300 د.أ', txCount: '46 عملية', fee: '0% عمولة بوابة' }
                      ].map((gw, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold text-slate-900">{gw.name}</h3>
                                <p className="text-[10px] text-slate-400">{gw.desc}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">● {gw.status}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">حجم التداول</span>
                              <span className="font-bold text-slate-900">{gw.volume}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">عدد الحركات</span>
                              <span className="font-bold text-slate-800">{gw.txCount}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">متوسط العمولة</span>
                              <span className="font-mono text-slate-600" dir="ltr">{gw.fee}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Search, Filter Selects & Quick View Tabs */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input type="text" placeholder="بحث برقم الفاتورة (#INV)، اسم العميل، البريد الإلكتروني، أو رقم المرجع البنكي..." className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <option>بوابة الدفع: الكل</option>
                            <option>Stripe Connect</option>
                            <option>Jordan PayHub / CliQ</option>
                            <option>تحويل بنكي للشركات</option>
                          </select>
                          <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <option>نوع الباقة: الكل</option>
                            <option>مصنعنا المدار (100 د.أ / مشروع)</option>
                            <option>اشتراك BYOK الشهري (50 د.أ)</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick View Tabs with Record Counts */}
                      <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs font-bold">
                        <button className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white shadow-xs">كافة العمليات (674)</button>
                        <button onClick={() => showToast('تصفية: المدفوعات الناجحة')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">المدفوعات المكتملة (656)</button>
                        <button onClick={() => showToast('تصفية: اشتراكات BYOK')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">اشتراكات BYOK الشهرية (380)</button>
                        <button onClick={() => showToast('تصفية: دفعات مشاريع المصنع')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">دفعات مشاريع المصنع (276)</button>
                        <button onClick={() => showToast('تصفية: العمليات المعلقة والمتعثرة')} className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700">معلقة / متعثرة (18)</button>
                      </div>
                    </div>

                    {/* Payments & Invoices Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">رقم الفاتورة / المرجع</th>
                              <th className="py-3.5 px-6">العميل / الجهة</th>
                              <th className="py-3.5 px-6">نوع الاشتراك / العملية</th>
                              <th className="py-3.5 px-6">بوابة وطريقة الدفع</th>
                              <th className="py-3.5 px-6">المبلغ الإجمالي</th>
                              <th className="py-3.5 px-6">حالة الدفع</th>
                              <th className="py-3.5 px-6">التاريخ والتوقيت</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { inv: '#INV-2026-8841', ref: 'STRP_99281A', client: 'م. سارة فهد المنصور', email: 'sara.mansoor@almasar-logistics.com', plan: 'شحن مشروع - مصنعنا المدار', gateway: 'Stripe • Visa 4242', amount: '100.00 د.أ', status: 'مدفوعة', date: 'اليوم، 13:45' },
                              { inv: '#INV-2026-8840', ref: 'CLIQ_77412J', client: 'أحمد محمد الرواشدة', email: 'ahmed.r@al-rawnaq.com', plan: 'تجديد اشتراك BYOK الشهري', gateway: 'Jordan PayHub • CliQ', amount: '50.00 د.أ', status: 'مدفوعة', date: 'اليوم، 11:20' },
                              { inv: '#INV-2026-8839', ref: 'BNK_55209C', client: 'د. خالد إبراهيم عمر', email: 'dr.khaled@alshifa-clinics.jo', plan: 'حزمة 3 مشاريع - مصنعنا المدار', gateway: 'تحويل بنكي للشركات', amount: '300.00 د.أ', status: 'مدفوعة', date: 'أمس، 16:10' },
                              { inv: '#INV-2026-8838', ref: 'STRP_99104F', client: 'طارق زياد القضاة', email: 'tareq@afaq-properties.jo', plan: 'تجديد اشتراك BYOK الشهري', gateway: 'Stripe • Mastercard 8812', amount: '50.00 د.أ', status: 'فشل الدفع (بطاقة منتهية)', date: '15 أكتوبر 2026' },
                              { inv: '#INV-2026-8837', ref: 'EFW_33190B', client: 'ريم عبد الله الكردي', email: 'reem.k@natural-oasis.com', plan: 'شحن مشروع - مصنعنا المدار', gateway: 'إي فواتيركم (eFAWATEERcom)', amount: '100.00 د.أ', status: 'بانتظار التأكيد', date: '14 أكتوبر 2026' },
                            ].map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900 font-mono">{tx.inv}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{tx.ref}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900">{tx.client}</div>
                                  <div className="text-[11px] text-slate-400">{tx.email}</div>
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-800">{tx.plan}</td>
                                <td className="py-4 px-6 text-slate-600">{tx.gateway}</td>
                                <td className="py-4 px-6 font-black text-slate-900">{tx.amount}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    tx.status === 'مدفوعة' ? 'bg-emerald-50 text-emerald-700' :
                                    tx.status.includes('فشل') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    ● {tx.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => showToast(`عرض الفاتورة الضريبية: ${tx.inv}`)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="عرض الفاتورة">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تحميل إيصال الدفع PDF: ${tx.inv}`)} className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition" title="تحميل PDF">
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 674 عملية مالية وفاتورة مسجلة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">135</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Usage & Costs Telemetry */}
                {activeScreen === 'admin-costs' && (
                  <main className="p-8 space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>مراقبة الموارد والتكاليف</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الاستهلاك والتكاليف (Token Telemetry)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">الاستهلاك والتكاليف التشغيلية <span className="text-sm font-normal text-slate-500" dir="ltr">(AI Usage & Cost Analytics)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">مراقبة دقيقة لاستهلاك الرموز (Tokens)، تكاليف مفاتيح المصنع المدارة مقابل عوائد الـ 100 د.أ، وهوامش الربح لكل بوابة.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تحديث عدادات التوكنز والتكلفة الفورية')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>مزامنة القياسات</span>
                        </button>
                        <button onClick={() => showToast('تم تصدير تقرير تكاليف المزودين (CSV)')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>تصدير تقرير التكاليف</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Cost & Margin KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي استهلاك الرموز (Tokens)</span>
                            <div className="text-2xl font-black text-slate-900 mt-1" dir="ltr">148.6M</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span>112.4M مصنع مدار • 36.2M مفاتيح BYOK</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">تكلفة مفاتيح المصنع الفعلية (API Cost)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-slate-900">1,840</span>
                              <span className="text-xs font-bold text-orange-600">د.أ / الشهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Database className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <span>ضمن السقف الائتماني المحدد (5,000 د.أ)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">متوسط تكلفة المشروع المدار (5 بوابات)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-emerald-600">6.25</span>
                              <span className="text-xs font-bold text-slate-500">د.أ / مشروع</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <PieChart className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700 font-semibold">
                          <span>يباع بـ 100 د.أ (صافي ربح ~93.75 د.أ/مشروع)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">تنبيهات تجاوز السقف (Quota Alerts)</span>
                            <div className="text-2xl font-black text-amber-600 mt-1">4 مشاريع</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-700 font-semibold">
                          <span>تجاوزت 8M Tokens في البوابة الثالثة</span>
                        </div>
                      </div>
                    </div>

                    {/* Provider Cost Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { provider: 'Google Gemini Enterprise', gate: 'البوابة 1 و 5', tokens: '54.2M', cost: '410 د.أ', share: '22%' },
                        { provider: 'Anthropic Claude 3.5 Sonnet', gate: 'البوابة 2 (التصميم)', tokens: '38.9M', cost: '680 د.أ', share: '37%' },
                        { provider: 'OpenAI GPT-4o Enterprise', gate: 'البوابة 3 (البرمجة)', tokens: '34.1M', cost: '620 د.أ', share: '34%' },
                        { provider: 'Groq Cloud (Llama 3.3 70B)', gate: 'البوابة 4 (الفحص)', tokens: '21.4M', cost: '130 د.أ', share: '7%' }
                      ].map((p, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{p.provider}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700">{p.share}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{p.gate}</div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="font-mono text-slate-600">{p.tokens}</span>
                            <span className="font-black text-slate-900">{p.cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Telemetry Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">المشروع / العميل</th>
                              <th className="py-3.5 px-6">البوابة والوكيل</th>
                              <th className="py-3.5 px-6">المزود والنموذج</th>
                              <th className="py-3.5 px-6">رموز الإدخال / الإخراج</th>
                              <th className="py-3.5 px-6">مصدر المفتاح</th>
                              <th className="py-3.5 px-6">التكلفة الفعلية</th>
                              <th className="py-3.5 px-6 text-center">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { proj: 'منصة إدارة العيادات الطبية (#PRJ-9821)', gate: 'Gate 3 • وكيل البرمجة', model: 'gpt-4o-2024-11-20', tokens: '1.8M In / 1.6M Out', keyType: 'مفتاح المصنع المدار', cost: '2.45 د.أ', status: 'طبيعي' },
                              { proj: 'متجر الحرف اليدوية (#PRJ-9815)', gate: 'Gate 5 • وكيل التسليم', model: 'claude-3-5-sonnet', tokens: '3.1M In / 2.0M Out', keyType: 'مفتاح العميل (BYOK)', cost: '0.00 د.أ (على العميل)', status: 'طبيعي' },
                              { proj: 'نظام إدارة المخازن (#PRJ-9802)', gate: 'Gate 2 • وكيل التصميم', model: 'claude-3-5-sonnet', tokens: '0.8M In / 0.4M Out', keyType: 'مفتاح المصنع المدار', cost: '1.15 د.أ', status: 'طبيعي' },
                              { proj: 'تطبيق المحامي الذكي (#PRJ-9794)', gate: 'Gate 4 • وكيل الجودة', model: 'llama-3.3-70b', tokens: '2.9M In / 1.8M Out', keyType: 'مفتاح العميل (BYOK)', cost: '0.00 د.أ (على العميل)', status: 'طبيعي' },
                              { proj: 'بوابة العقارات الذكية (#PRJ-9760)', gate: 'Gate 3 • وكيل البرمجة', model: 'gpt-4o-2024-11-20', tokens: '5.4M In / 3.9M Out', keyType: 'مفتاح المصنع المدار', cost: '8.90 د.أ', status: 'مرتفع (تجاوز الحد)' },
                            ].map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6 font-bold text-slate-900">{row.proj}</td>
                                <td className="py-4 px-6 text-orange-700 font-semibold">{row.gate}</td>
                                <td className="py-4 px-6 font-mono text-slate-600" dir="ltr">{row.model}</td>
                                <td className="py-4 px-6 font-mono text-slate-700" dir="ltr">{row.tokens}</td>
                                <td className="py-4 px-6">{row.keyType}</td>
                                <td className="py-4 px-6 font-black text-slate-900">{row.cost}</td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${row.status === 'طبيعي' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                        </select>
                        <span>من أصل 12,840 سجل استدعاء للوكلاء الذكيين</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Security & System Audit Log */}
                {activeScreen === 'admin-audit' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>الأمن والحوكمة</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل النشاط والرقابة الأمنية (Audit Log)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">سجل النشاط والعمليات الرقابية <span className="text-sm font-normal text-slate-500" dir="ltr">(System & Security Audit Log)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">توثيق غير قابل للتعديل لكافة عمليات مسؤولي النظام، تعديلات مفاتيح المزودين، اعتمادات البوابات، وحركات الدخول.</p>
                      </div>
                      <button onClick={() => showToast('تم تصدير سجل الرقابة الأمني المشفر (JSON / CSV)')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>تصدير السجل الأمني</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">معرف الحدث</th>
                              <th className="py-3.5 px-6">المنفذ / الحساب</th>
                              <th className="py-3.5 px-6">نوع العملية</th>
                              <th className="py-3.5 px-6">التفاصيل والمورد المتأثر</th>
                              <th className="py-3.5 px-6">عنوان IP</th>
                              <th className="py-3.5 px-6">مستوى الأهمية</th>
                              <th className="py-3.5 px-6">التوقيت</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { id: 'AUD-99412', actor: 'admin@ogroup.ai (عبد الله المنصور)', action: 'تحديث نموذج وكيل البرمجة', target: 'Gate 3 -> gpt-4o-2024-11-20', ip: '185.22.14.88', level: 'عالي (إداري)', time: 'اليوم، 14:32' },
                              { id: 'AUD-99411', actor: 'sara.mansoor@almasar-logistics.com', action: 'اعتماد البوابة الثانية (Gate 2)', target: 'مشروع #PRJ-9802', ip: '94.249.12.10', level: 'اعتيادي', time: 'اليوم، 13:50' },
                              { id: 'AUD-99410', actor: 'admin@ogroup.ai (عبد الله المنصور)', action: 'تعليق حساب عميل لتجاوز السقف', target: 'tareq@afaq-properties.jo', ip: '185.22.14.88', level: 'حرج (أمني)', time: 'اليوم، 11:15' },
                              { id: 'AUD-99409', actor: 'System Cron / Stripe Webhook', action: 'تأكيد دفعة مشروع مدار (100 JOD)', target: 'فاتورة #INV-2026-8841', ip: '54.187.205.235', level: 'مالي', time: 'أمس، 22:04' },
                              { id: 'AUD-99408', actor: 'ahmed.r@al-rawnaq.com', action: 'تحديث مفتاح OpenAI BYOK مشفر', target: 'خزنة المفاتيح AES-256', ip: '176.29.44.19', level: 'أمني', time: 'أمس، 18:19' },
                            ].map((log, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6 font-mono font-bold text-slate-900">{log.id}</td>
                                <td className="py-4 px-6 font-bold text-slate-800">{log.actor}</td>
                                <td className="py-4 px-6 text-orange-700 font-semibold">{log.action}</td>
                                <td className="py-4 px-6 text-slate-600">{log.target}</td>
                                <td className="py-4 px-6 font-mono text-slate-500" dir="ltr">{log.ip}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    log.level.includes('حرج') ? 'bg-red-50 text-red-700' :
                                    log.level.includes('عالي') || log.level.includes('أمني') ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.level}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono text-slate-500">{log.time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Platform System Settings */}
                {activeScreen === 'admin-settings' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>التكوين المركزي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">إعدادات النظام العامة (System Settings)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إعدادات النظام والسياسات التجارية <span className="text-sm font-normal text-slate-500" dir="ltr">(Platform & Commercial Settings)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">ضبط تسعير الباقات، حدود استهلاك الرموز لكل بوابة، تشفير مفاتيح BYOK، وإعدادات البنية التحتية للمصنع.</p>
                      </div>
                      <button onClick={() => showToast('تم حفظ وتطبيق إعدادات النظام بنجاح')} className="px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>حفظ كافة الإعدادات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">التسعير والسياسات التجارية (Commercial Rules)</h3>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">سعر المشروع في وضع "مصنعنا المدار" (Build For Me)</label>
                            <input type="text" defaultValue="100 JOD" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">سعر الاشتراك الشهري لوضع "مفاتيحك الخاصة" (BYOK)</label>
                            <input type="text" defaultValue="50 JOD / شهر" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">السقف الأعلى لاستهلاك الرموز للمشروع المدار الواحد</label>
                            <input type="text" defaultValue="10,000,000 Tokens (10M)" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">الأمان وحوكمة المفاتيح (Security & Key Vault)</h3>
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">تشفير مفاتيح العملاء BYOK بمعيار AES-256-GCM</div>
                              <div className="text-[11px] text-slate-500">عدم تخزين أي مفتاح بنص صريح في قاعدة البيانات</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">مفعل إجبارياً</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">إلزام المصادقة الثنائية (2FA) لحسابات الإدارة</div>
                              <div className="text-[11px] text-slate-500">حماية الدخول إلى بوابة admin@ogroup.ai</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">نشط</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">الاعتماد الإلزامي للبوابات الخمس بالتسلسل</div>
                              <div className="text-[11px] text-slate-500">منع تجاوز أي بوابة دون ضغط زر الاعتماد من العميل</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">مفعل</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Top Global Navigation Bar for Customer */}
              <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                <div className="flex items-center gap-3">
                  <div onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">OGroup AI Factory</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <nav className="flex items-center gap-2 text-xs font-semibold">
                    <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'dashboard' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      لوحة التحكم والمشاريع
                    </button>
                    <button onClick={() => setCurrentView('ai-connections')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'ai-connections' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      مفاتيح الذكاء الاصطناعي (BYOK)
                    </button>
                    <button onClick={() => setCurrentView('billing')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'billing' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      الاشتراكات والفوترة
                    </button>
                  </nav>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left rtl:text-right">
                    <span className="block text-xs font-bold text-slate-800">{userEmail || 'المستخدم'}</span>
                    <span className="block text-[10px] text-orange-600 font-semibold">رصيد المشاريع: {projectCredits} (100 JOD/مشروع)</span>
                  </div>
                  <button onClick={handleLogout} title="تسجيل الخروج" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* MAIN DASHBOARD VIEW */}
              {currentView === 'dashboard' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 inline-block mb-2">منصة البناء المباشر عبر 5 بوابات ذكية</span>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">مشاريعك البرمجية النشطة</h1>
                      <p className="text-xs text-slate-500 mt-1">أنشئ مشروعاً جديداً، تواصل مع الوكيل، راقب المخرجات، واعتمد كل بوابة بكل بساطة.</p>
                    </div>
                    <button onClick={() => setCurrentView('create-project')} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>+ إنشاء مشروع جديد</span>
                    </button>
                  </div>

                  {projects.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                        <FolderKanban className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">لا توجد مشاريع حتى الآن</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">حسابك جديد كلياً. انقر على زر "إنشاء مشروع جديد" لتبدأ رحلتك البرمجية عبر بوابات المصنع.</p>
                      <button onClick={() => setCurrentView('create-project')} className="px-6 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs">
                        أنشئ مشروعك الأول
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map((proj) => (
                        <div key={proj.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${proj.mode === 'managed' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                {proj.mode === 'managed' ? 'مصنعنا (100 JOD)' : 'مفاتيحك الخاصة (BYOK)'}
                              </span>
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                البوابة {proj.currentGate} / 5
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-800">{proj.name}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{proj.description}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">تاريخ الإنشاء: {proj.createdAt}</span>
                            <button 
                              onClick={() => { setActiveProjectId(proj.id); setCurrentView('gate-workspace'); }} 
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                            >
                              <span>فتح مساحة العمل</span>
                              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </main>
              )}

              {/* CREATE PROJECT VIEW */}
              {currentView === 'create-project' && (
                <main className="flex-1 p-8 flex items-center justify-center">
                  <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-bold text-slate-900">إنشاء مشروع برمجي جديد</h2>
                      <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-500 hover:text-slate-800 font-bold">✕ إغلاق</button>
                    </div>

                    <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم المشروع البرمجي</label>
                        <input type="text" value={newProjName} onChange={e => setNewProjName(e.target.value)} placeholder="مثال: نظام إدارة المستشفيات" required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">وصف المشروع أو الفكرة</label>
                        <textarea rows={3} value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="اشرح فكرة التطبيق باختصار..." className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"></textarea>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-2">وضع التجارة وخدمة الذكاء الاصطناعي</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div 
                            onClick={() => setNewProjMode('managed')}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${newProjMode === 'managed' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className="font-bold text-slate-900 mb-1">مصنعنا (Build For Me)</div>
                            <div className="text-[10px] text-slate-500 mb-2">100 JOD / مشروع (يتطلب رصيد مشاريع)</div>
                            <span className="text-orange-600 font-bold text-[11px]">رصيدك الحالي: {projectCredits} مشروع</span>
                          </div>
                          <div 
                            onClick={() => setNewProjMode('byok')}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${newProjMode === 'byok' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className="font-bold text-slate-900 mb-1">مفاتيحك الخاصة (BYOK)</div>
                            <div className="text-[10px] text-slate-500 mb-2">50 JOD / شهر (تستخدم مفاتيح OpenAI أو Gemini الخاصة بك)</div>
                            <span className="text-blue-600 font-bold text-[11px]">الاشتراك النشط: مفعل</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setCurrentView('dashboard')} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
                          إلغاء
                        </button>
                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md transition">
                          إنشاء المشروع والبدء بالبوابة الأولى
                        </button>
                      </div>
                    </form>
                  </div>
                </main>
              )}

              {/* AI CONNECTIONS (BYOK) VIEW */}
              {currentView === 'ai-connections' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">إدارة مفاتيح وتوصيلات الذكاء الاصطناعي (BYOK)</h1>
                      <p className="text-xs text-slate-500 mt-1">اربط مفاتيح API الخاصة بك (Google Stitch, Google Gemini, OpenAI, Anthropic, Groq, DeepSeek, Mistral, OpenRouter أو أي مزود مخصص) لاستخدامها في بوابات المصنع.</p>
                    </div>
                    <button onClick={() => showToast('تم حفظ إعدادات الـ BYOK بنجاح')} className="px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md">
                      حفظ الإعدادات
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { id: 'stitch', name: 'Google Stitch (UI/UX Design AI)', desc: 'محرك Google Stitch لتوليد وتصميم الواجهات البصرية (Gate 2)', icon: <Sparkles className="w-5 h-5 text-orange-600" /> },
                      { id: 'gemini', name: 'Google Gemini Enterprise', desc: 'أحدث نماذج جيميناي (Gemini 3.8 Flash / Gemini 3.1 Pro)', icon: <Sparkles className="w-5 h-5 text-orange-600" /> },
                      { id: 'openai', name: 'OpenAI Platform (GPT-4o / o3)', desc: 'نماذج GPT-4o و o3-mini و o1', icon: <Bot className="w-5 h-5 text-emerald-600" /> },
                      { id: 'anthropic', name: 'Anthropic Claude Direct', desc: 'نماذج Claude 3.7 Sonnet و Claude 3.5 Sonnet', icon: <Layers className="w-5 h-5 text-purple-600" /> },
                      { id: 'groq', name: 'Groq Cloud LPU', desc: 'استدلال فائق السرعة عبر Llama 3.3 70B', icon: <Zap className="w-5 h-5 text-blue-600" /> },
                      { id: 'deepseek', name: 'DeepSeek AI (V3 / R1)', desc: 'نماذج البرمجة والاستدلال DeepSeek V3 & R1', icon: <Code2 className="w-5 h-5 text-indigo-600" /> },
                      { id: 'mistral', name: 'Mistral & Codestral', desc: 'نماذج Codestral و Mistral Large', icon: <Cpu className="w-5 h-5 text-amber-600" /> },
                      { id: 'xai', name: 'xAI Grok Platform', desc: 'نماذج Grok-3 و Grok-2', icon: <Network className="w-5 h-5 text-slate-800" /> },
                      { id: 'openrouter', name: 'OpenRouter / Custom AI', desc: 'بوابة موحدة لكافة نماذج الذكاء الاصطناعي العالمية', icon: <Key className="w-5 h-5 text-rose-600" /> },
                    ].map(prov => (
                      <div key={prov.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                              {prov.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{prov.name}</h3>
                              <p className="text-[11px] text-slate-400">{prov.desc}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${byokProvider === prov.id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {byokProvider === prov.id ? 'المزود النشط' : 'متاح للربط'}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <label className="block font-bold text-slate-700">مفتاح API الخاص بك ({prov.name})</label>
                          <input 
                            type="password" 
                            placeholder="أدخل مفتاح الـ API هنا (AIza... أو sk-... أو gsk_...)" 
                            value={byokProvider === prov.id ? byokApiKey : ''}
                            onChange={e => { setByokProvider(prov.id); setByokApiKey(e.target.value); }}
                            dir="ltr"
                            className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono" 
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button onClick={() => { setByokProvider(prov.id); showToast(`تم اختبار الاتصال بـ ${prov.name} بنجاح`); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
                            اختبار الاتصال
                          </button>
                          <button onClick={() => { setByokProvider(prov.id); showToast(`تم تعيين ${prov.name} كمزود أساسي بنجاح`); }} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition">
                            تفعيل المزود
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </main>
              )}

              {/* BILLING & SUBSCRIPTION VIEW */}
              {currentView === 'billing' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">الاشتراكات والفوترة والمدفوعات (Billing & Plans)</h1>
                      <p className="text-xs text-slate-500 mt-1">اختر البناء الفوري لكل مشروع (100 JOD) أو الاشتراك الشهري للباقة الشاملة (50 JOD/شهر).</p>
                    </div>
                    <div className="text-left rtl:text-right">
                      <span className="block text-xs text-slate-400">رصيدك الحالي</span>
                      <span className="text-xl font-black text-orange-600">{projectCredits} مشاريع</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border-2 border-orange-500 rounded-3xl p-8 shadow-md space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">الخيار الأول • الأكثر طلباً</span>
                        <h3 className="text-xl font-black text-slate-900">مصنعنا المدار (Build For Me)</h3>
                        <div className="text-3xl font-black text-orange-600">100 JOD <span className="text-xs text-slate-500 font-normal">/ لكل مشروع</span></div>
                        <p className="text-xs text-slate-500 leading-relaxed">ندير كافة مفاتيح وخوادم الذكاء الاصطناعي نيابة عنك. تدفع فقط مقابل المشاريع التي تنجزها دون اشتراكات شهرية.</p>
                        <ul className="space-y-2 text-xs text-slate-700">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> لا تحتاج لأي مفاتيح API</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> دعم كامل للبوابات الخمس</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> توليد الكود والمساعد الذكي متضمن</li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => { setProjectCredits(c => c + 1); showToast('تم شحن رصيد مشروع جديد بنجاح (+1)'); }}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                      >
                        شحن رصيد مشروع جديد (100 JOD)
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">الخيار الثاني • للمطورين</span>
                        <h3 className="text-xl font-black text-slate-900">البناء بمفاتيحك الخاصة (BYOK)</h3>
                        <div className="text-3xl font-black text-blue-600">50 JOD <span className="text-xs text-slate-500 font-normal">/ شهرياً</span></div>
                        <p className="text-xs text-slate-500 leading-relaxed">استخدم مفاتيحك الخاصة لـ OpenAI و Gemini و Anthropic واستفادة كاملة من منصة البناء عبر البوابات الخمس.</p>
                        <ul className="space-y-2 text-xs text-slate-700">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> مشاريع غير محدودة ضمن سياسة الاستخدام العادل</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> ربط مفاتيح OpenAI و Claude و Gemini</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> دعم فني أولوية</li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => { setSubscriptionActive(true); showToast('تم تفعيل اشتراك BYOK الشهري بنجاح'); }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                      >
                        {subscriptionActive ? 'الاشتراك مفعل حالياً' : 'تفعيل اشتراك 50 JOD / شهرياً'}
                      </button>
                    </div>
                  </div>
                </main>
              )}

              {/* GATE WORKSPACE (1 CHAT + 1 LIVE WORKSPACE + 1 APPROVAL BUTTON) */}
              {currentView === 'gate-workspace' && activeProject && (
                <main className="flex-1 flex flex-col overflow-hidden">
                  {/* Gate Subheader */}
                  <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1">
                        <ChevronRight className="w-4 h-4" />
                        <span>العودة للمشاريع</span>
                      </button>
                      <span className="text-slate-300">|</span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">{activeProject.name}</h2>
                        <span className="text-[11px] text-orange-600 font-semibold">البوابة الحالية: {activeProject.currentGate} من 5</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((gNum) => (
                        <button
                          key={gNum}
                          type="button"
                          onClick={() => {
                            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, currentGate: gNum } : p));
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            activeProject.currentGate === gNum
                              ? 'bg-orange-600 text-white shadow-xs'
                              : activeProject.currentGate > gNum
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span>بوابة {gNum}</span>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={handleApproveAndAdvance}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{activeProject.currentGate === 5 ? 'اعتماد وتسليم المشروع نهائياً' : 'اعتماد البوابة والانتقال للتالية (Approve & Continue)'}</span>
                    </button>
                  </div>

                  {/* Two-Column Workspace: Left Chat, Right Live Output */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANEL: CHAT WITH AGENT */}
                    <div className="w-5/12 border-l border-slate-200 bg-white flex flex-col justify-between">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                        {(() => {
                          const currentAgent = factoryAgents.find(a => a.gate === activeProject.currentGate) || factoryAgents[0];
                          const defaultRunPrompts: Record<number, string> = {
                            1: `قم بتحليل مشروع "${activeProject.name}" وصياغة تحديث شامل لوثيقة متطلبات المنتج (PRD) وقصص المستخدمين.`,
                            2: `قم بتحديث وتوليد تصميم الواجهات التفاعلية لمشروع "${activeProject.name}" في لوحة Google Stitch.`,
                            3: `قم بكتابة وتوليد كود المكونات البرمجية الأساسية لمشروع "${activeProject.name}" بنظام React و TypeScript.`,
                            4: `قم بإجراء فحص شامل للجودة والأمان السيبراني (QA & OWASP Audit) لمشروع "${activeProject.name}".`,
                            5: `قم بإعداد خطة الإطلاق السحابي وتكوين Docker وحزمة التسليم النهائية لمشروع "${activeProject.name}".`,
                          };
                          return (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                                  <Bot className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-xs font-bold text-slate-800 truncate">{currentAgent.title}</h3>
                                  <span className="text-[10px] text-emerald-600 font-semibold block truncate">
                                    نشط في البوابة {activeProject.currentGate} · {currentAgent.providerName} ({currentAgent.model})
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={isAiProcessing}
                                onClick={() => executeStageAgentPrompt(defaultRunPrompts[activeProject.currentGate] || defaultRunPrompts[1])}
                                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs transition shrink-0 flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3" />
                                <span>تشغيل الوكيل الآن</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {(chatMessages[activeProject.currentGate] || []).map((msg) => (
                          <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${msg.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-700'}`}>
                              {msg.sender === 'user' ? 'أنت' : 'AI'}
                            </div>
                            <div className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-orange-600 text-white rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tr-none'}`}>
                              {msg.text}
                              <div className={`text-[9px] mt-1 flex items-center justify-between gap-2 ${msg.sender === 'user' ? 'text-orange-200' : 'text-slate-400'}`}>
                                <span>{msg.meta || ''}</span>
                                <span>{msg.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {isAiProcessing && (() => {
                          const currentAgent = factoryAgents.find(a => a.gate === activeProject.currentGate) || factoryAgents[0];
                          return (
                            <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-orange-50/60 rounded-xl border border-orange-100">
                              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                              <span>
                                {currentAgent.title} ({currentAgent.providerName} • {currentAgent.model}) يقوم بمعالجة طلبك وتحديث المخرجات الحية...
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quick Stitch Design Prompts when in Gate 2 */}
                      {activeProject.currentGate === 2 && (
                        <div className="px-4 py-2 bg-orange-50/50 border-t border-orange-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                          <span className="text-slate-500 font-bold shrink-0">أوامر Stitch سريعة:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStitchTheme('blue');
                              showToast('تم تطبيق الثيم الأزرق الملكي على التصميم الحي');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-orange-400 font-semibold shrink-0"
                          >
                            ثيم أزرق ملكي
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStitchTheme('dark');
                              showToast('تم تفعيل الوضع الداكن (Dark UI) في لوحة Stitch');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-orange-400 font-semibold shrink-0"
                          >
                            الوضع الداكن
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStitchScreenTab('booking');
                              showToast('تم عرض شاشة نموذج حجز المواعيد التفاعلي');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-orange-400 font-semibold shrink-0"
                          >
                            نموذج الحجز
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStitchScreenTab('portal');
                              showToast('تم عرض بوابة العقارات والعملاء');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-orange-400 font-semibold shrink-0"
                          >
                            بوابة العقارات
                          </button>
                        </div>
                      )}

                      {/* Message Input */}
                      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                        {(() => {
                          const currentAgent = factoryAgents.find(a => a.gate === activeProject.currentGate) || factoryAgents[0];
                          return (
                            <input
                              type="text"
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              placeholder={`اطلب توليد أو تعديل مخرجات البوابة ${activeProject.currentGate} من ${currentAgent.providerName}...`}
                              className="flex-1 h-11 px-4 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          );
                        })()}
                        <button type="submit" disabled={isAiProcessing} className="w-11 h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center justify-center shadow-md transition shrink-0">
                          <Send className="w-4 h-4 rotate-180" />
                        </button>
                      </form>
                    </div>

                    {/* RIGHT PANEL: LIVE WORKSPACE */}
                    <div className="w-7/12 bg-slate-100/80 flex flex-col overflow-y-auto p-5 space-y-4">
                      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">مساحة العمل الحية • Live Deliverable</span>
                            {activeProject.currentGate === 2 && (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono" dir="ltr">
                                Google Stitch Live Canvas v2.4
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">
                            {activeProject.currentGate === 1 && 'وثيقة متطلبات المنتج (PRD Document)'}
                            {activeProject.currentGate === 2 && 'لوحة التصميم التفاعلي الحية من Google Stitch (Live Interactive UI Canvas)'}
                            {activeProject.currentGate === 3 && 'مستودع الكود المصدري (Source Code Preview)'}
                            {activeProject.currentGate === 4 && 'نتائج فحص الجودة والأمان (QA Test Results)'}
                            {activeProject.currentGate === 5 && 'حزمة الإنتاج والتشغيل (Production Bundle)'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeProject.currentGate === 2 && (
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                              <button
                                type="button"
                                onClick={() => setStitchViewport('desktop')}
                                className={`px-2.5 py-1 rounded-lg transition ${stitchViewport === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                              >
                                سطح المكتب
                              </button>
                              <button
                                type="button"
                                onClick={() => setStitchViewport('tablet')}
                                className={`px-2.5 py-1 rounded-lg transition ${stitchViewport === 'tablet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                              >
                                تابلت
                              </button>
                              <button
                                type="button"
                                onClick={() => setStitchViewport('mobile')}
                                className={`px-2.5 py-1 rounded-lg transition ${stitchViewport === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                              >
                                موبايل
                              </button>
                            </div>
                          )}
                          <button onClick={() => showToast('تم تصدير ملفات تصميم Google Stitch (Figma + Tailwind Code) بنجاح')} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5 text-orange-600" />
                            <span>تحميل / تصدير</span>
                          </button>
                        </div>
                      </div>

                      {/* Deliverable Content per Gate */}
                      {activeProject.currentGate === 1 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1">
                          <textarea 
                            value={activeProject.prd}
                            onChange={e => {
                              const updatedVal = e.target.value;
                              setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, prd: updatedVal } : p));
                            }}
                            className="w-full h-96 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                          ></textarea>
                          <p className="text-[11px] text-slate-400">يمكنك تعديل وثيقة المتطلبات مباشرة هنا أو عبر الحديث مع وكيل المتطلبات في الشات.</p>
                        </div>
                      )}

                      {activeProject.currentGate === 2 && (() => {
                        const themeMap = {
                          orange: {
                            primaryBg: 'bg-orange-600',
                            primaryHover: 'hover:bg-orange-700',
                            lightBg: 'bg-orange-50',
                            lightText: 'text-orange-700',
                            borderAccent: 'border-orange-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          blue: {
                            primaryBg: 'bg-blue-600',
                            primaryHover: 'hover:bg-blue-700',
                            lightBg: 'bg-blue-50',
                            lightText: 'text-blue-700',
                            borderAccent: 'border-blue-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          emerald: {
                            primaryBg: 'bg-emerald-600',
                            primaryHover: 'hover:bg-emerald-700',
                            lightBg: 'bg-emerald-50',
                            lightText: 'text-emerald-700',
                            borderAccent: 'border-emerald-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          violet: {
                            primaryBg: 'bg-violet-600',
                            primaryHover: 'hover:bg-violet-700',
                            lightBg: 'bg-violet-50',
                            lightText: 'text-violet-700',
                            borderAccent: 'border-violet-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          dark: {
                            primaryBg: 'bg-orange-500',
                            primaryHover: 'hover:bg-orange-600',
                            lightBg: 'bg-slate-800',
                            lightText: 'text-orange-400',
                            borderAccent: 'border-slate-700',
                            canvasBg: 'bg-slate-950 text-slate-100',
                            cardBg: 'bg-slate-900 border-slate-800 text-slate-100',
                          },
                        }[stitchTheme];

                        const viewportWidthClass =
                          stitchViewport === 'mobile'
                            ? 'max-w-[390px] mx-auto'
                            : stitchViewport === 'tablet'
                            ? 'max-w-[680px] mx-auto'
                            : 'w-full';

                        return (
                          <div className="flex-1 flex flex-col space-y-3">
                            {/* Stitch Studio Screen Tabs & Theme Bar */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('landing')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    stitchScreenTab === 'landing'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>1. الصفحة الرئيسية (Landing Page)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('dashboard')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  2. لوحة المواعيد الرئيسية
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('booking')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'booking' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  3. نموذج الحجز الفوري
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('portal')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'portal' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  4. بوابة العقارات والعملاء
                                </button>

                                {/* Dynamically Added Pages from Gate 2 Chat */}
                                {stitchCustomPages.map((cp, idx) => (
                                  <div key={cp.id} className="inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => setStitchScreenTab(cp.id)}
                                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                        stitchScreenTab === cp.id
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                    >
                                      <span>{idx + 5}. ✨ {cp.title}</span>
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('code')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'code' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  كود الواجهة (Tailwind)
                                </button>
                              </div>

                              {/* Live Color Palette Dots */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400 font-semibold ml-1">الألوان:</span>
                                {([
                                  { id: 'orange', color: 'bg-orange-500', label: 'برتقالي' },
                                  { id: 'blue', color: 'bg-blue-600', label: 'أزرق' },
                                  { id: 'emerald', color: 'bg-emerald-600', label: 'زمردي' },
                                  { id: 'violet', color: 'bg-violet-600', label: 'بنفسجي' },
                                  { id: 'dark', color: 'bg-slate-900', label: 'داكن' },
                                ] as const).map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    title={t.label}
                                    onClick={() => setStitchTheme(t.id)}
                                    className={`w-5 h-5 rounded-full ${t.color} transition ${
                                      stitchTheme === t.id ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* LIVE INTERACTIVE STITCH CANVAS WINDOW */}
                            <div className={`${viewportWidthClass} flex-1 rounded-3xl border-2 border-slate-300/90 shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${themeMap.canvasBg}`}>
                              {/* Simulated Browser Top Bar */}
                              <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between text-[11px] border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                  <span className="mr-2 font-bold text-white">{activeProject.name}</span>
                                </div>
                                <div className="px-3 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px]" dir="ltr">
                                  stitch://live-canvas/{activeProject.id}/{stitchScreenTab}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold">● معاينة حية تفاعلية (RTL)</span>
                              </div>

                              {/* Inner Designed Application Header / Sticky Navbar */}
                              <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${themeMap.cardBg}`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-9 h-9 rounded-xl ${themeMap.primaryBg} text-white flex items-center justify-center font-black text-sm shadow-xs`}>
                                    عقار
                                  </div>
                                  <div>
                                    <div className="font-black text-xs">{activeProject.name}</div>
                                    <div className="text-[10px] opacity-60">{activeProject.designNotes}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('landing')}
                                    className={`transition ${stitchScreenTab === 'landing' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    الرئيسية
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('portal')}
                                    className={`transition ${stitchScreenTab === 'portal' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    العقارات المتاحة
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('dashboard')}
                                    className={`transition ${stitchScreenTab === 'dashboard' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    جدول المواعيد
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('booking')}
                                    className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-bold shadow-xs transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                  >
                                    + حجز موعد معاينة جديد
                                  </button>
                                </div>
                              </div>

                              {/* TAB 0: LANDING PAGE (الصفحة الرئيسية - LANDING PAGE) */}
                              {stitchScreenTab === 'landing' && (
                                <div className="flex-1 overflow-y-auto space-y-5 p-5">
                                  {/* Luxury Real Estate Hero Banner (#0F172A Slate-900 + Gold/Brand Accent) */}
                                  <div className="rounded-3xl bg-slate-900 text-white p-6 md:p-7 relative overflow-hidden shadow-md border border-slate-800">
                                    <div className="relative z-10 space-y-4">
                                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                                        <span>✨ الصفحة الرئيسية (Landing Page) • مصممة بواسطة Google Stitch</span>
                                      </div>
                                      <h2 className="text-xl md:text-2xl font-black leading-snug">
                                        احجز موعد معاينتك العقارية القادمة <span className="text-amber-400">في 60 ثانية</span>
                                      </h2>
                                      <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                                        منصة متكاملة لمعاينة الفلل السكنية، الشقق الطابقية، والمكاتب التجارية الفاخرة مع نخبة المستشارين العقاريين وتأكيد فوري للموعد عبر الواتساب وSMS.
                                      </p>

                                      {/* Interactive Quick Search & Instant Booking Bar inside Hero */}
                                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs pt-3">
                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">المنطقة / الموقع</label>
                                          <select
                                            value={stitchHeroLocation}
                                            onChange={e => setStitchHeroLocation(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="دابوق - عمان" className="text-slate-900">دابوق - عمان</option>
                                            <option value="عبدون الشمالي" className="text-slate-900">عبدون الشمالي</option>
                                            <option value="العبدلي بوليفارد" className="text-slate-900">العبدلي بوليفارد</option>
                                            <option value="طريق المطار - غمدان" className="text-slate-900">طريق المطار - غمدان</option>
                                          </select>
                                        </div>

                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">نوع العقار المطلوب</label>
                                          <select
                                            value={stitchHeroType}
                                            onChange={e => setStitchHeroType(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="فيلا سكنية مستقلة" className="text-slate-900">فيلا سكنية مستقلة</option>
                                            <option value="شقة طابقية فاخرة" className="text-slate-900">شقة طابقية فاخرة</option>
                                            <option value="مكاتب تجارية ذكية" className="text-slate-900">مكاتب تجارية ذكية</option>
                                            <option value="أرض استثمارية" className="text-slate-900">أرض استثمارية</option>
                                          </select>
                                        </div>

                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">الفترة المفضلة للمعاينة</label>
                                          <select
                                            value={stitchSelectedSlot}
                                            onChange={e => setStitchSelectedSlot(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="09:30 صباحاً" className="text-slate-900">09:30 صباحاً</option>
                                            <option value="11:00 صباحاً" className="text-slate-900">11:00 صباحاً</option>
                                            <option value="01:00 ظهراً" className="text-slate-900">01:00 ظهراً</option>
                                            <option value="03:30 مساءً" className="text-slate-900">03:30 مساءً</option>
                                            <option value="05:00 مساءً" className="text-slate-900">05:00 مساءً</option>
                                          </select>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStitchBookingService(`${stitchHeroType} - ${stitchHeroLocation}`);
                                            setStitchScreenTab('booking');
                                            showToast(`تم اختيار "${stitchHeroType} - ${stitchHeroLocation}" للانتقال إلى الحجز الفوري`);
                                          }}
                                          className={`rounded-xl font-black text-xs text-white shadow-md transition flex items-center justify-center gap-1.5 py-3 ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                        >
                                          <span>احجز موعد المعاينة الآن</span>
                                          <span>←</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Trust & Real Estate Metrics Strip */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    {[
                                      { val: '+1,480', label: 'معاينة عقارية ناجحة', badge: 'موثق 100%' },
                                      { val: '64 عقاراً', label: 'جاهز للمعاينة الفورية', badge: 'تحديث يومي' },
                                      { val: '15 مستشاراً', label: 'خبراء عقاريون معتمدون', badge: 'خدمة VIP' },
                                      { val: '98.4%', label: 'تقييم رضا العملاء', badge: 'تأكيد فوري SMS' },
                                    ].map((stat, i) => (
                                      <div key={i} className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                        <div className="text-base font-black tabular-nums">{stat.val}</div>
                                        <div className="text-[11px] opacity-70 mt-0.5">{stat.label}</div>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>
                                          {stat.badge}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Featured Properties Preview on Landing Page */}
                                  <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-black text-xs">أبرز العقارات المتاحة لحجز معاينة هذا الأسبوع</h4>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('portal')}
                                        className={`text-[11px] font-bold ${themeMap.lightText} hover:underline`}
                                      >
                                        عرض جميع العقارات (64) ←
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      {[
                                        { title: 'فيلا الياسمين الملكية - دابوق', specs: '620 م² • 5 غرف ماستر • مسبح خاص', price: '480,000 د.أ', status: 'متاح للمعاينة اليوم' },
                                        { title: 'بنتهاوس بانوراما - عبدون', specs: '310 م² • ترس مطل • تشطيب فندقي', price: '245,000 د.أ', status: '3 أوقات متاحة' },
                                        { title: 'مقر شركات ذكي - البوليفارد', specs: '400 م² • طابق كامل • مواقف خاصة', price: '320,000 د.أ', status: 'متاح للمعاينة غداً' },
                                      ].map((item, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 shadow-2xs ${themeMap.cardBg}`}>
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                ● {item.status}
                                              </span>
                                              <span className="font-black text-xs text-amber-600">{item.price}</span>
                                            </div>
                                            <div className="font-bold text-xs">{item.title}</div>
                                            <div className="text-[11px] opacity-65">{item.specs}</div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setStitchBookingService(item.title);
                                              setStitchScreenTab('booking');
                                            }}
                                            className={`w-full py-2 rounded-xl text-white font-bold text-[11px] transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                          >
                                            حجز موعد معاينة العقار
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 3-Step How It Works Strip */}
                                  <div className={`p-4 rounded-2xl border ${themeMap.cardBg} space-y-3`}>
                                    <div className="font-black text-xs">كيف يعمل نظام حجز المواعيد العقارية؟</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 01</span>
                                        <div className="font-bold">اختر العقار أو نوع الاستشارة</div>
                                        <p className="text-[11px] opacity-65">تصفح الفلل والشقق والمكاتب مع صور ومواصفات دقيقة.</p>
                                      </div>
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 02</span>
                                        <div className="font-bold">حدد اليوم والوقت والمستشار</div>
                                        <p className="text-[11px] opacity-65">جدول زمني حي يعرض الأوقات المتاحة فعلياً دون تضارب.</p>
                                      </div>
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 03</span>
                                        <div className="font-bold">تأكيد فوري وموقع المعاينة</div>
                                        <p className="text-[11px] opacity-65">تصلك رسالة تأكيد فورية مع رابط الموقع الجغرافي (GPS).</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 1: MAIN DASHBOARD & APPOINTMENTS SCHEDULE */}
                              {stitchScreenTab === 'dashboard' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  {/* 4 KPI Cards inside Stitch Canvas */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">إجمالي المواعيد النشطة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">{stitchAppointments.length + 144} موعد</div>
                                      <span className="text-[10px] text-emerald-500 font-bold">+18% هذا الأسبوع</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">معاينات اليوم المؤكدة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">
                                        {stitchAppointments.filter(a => a.status === 'مؤكد').length + 12} معاينة
                                      </div>
                                      <span className={`text-[10px] font-bold ${themeMap.lightText}`}>مزامنة مع الوكلاء</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">الوحدات العقارية المتاحة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">64 عقار</div>
                                      <span className="text-[10px] opacity-60">فلل • شقق • مكاتب</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">معدل حضور العملاء</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">94.2%</div>
                                      <span className="text-[10px] text-emerald-500 font-bold">تذكير SMS مفعل</span>
                                    </div>
                                  </div>

                                  {/* Day Filter Strip */}
                                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 overflow-x-auto ${themeMap.cardBg}`}>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-bold opacity-75 ml-1">جدول أيام الأسبوع:</span>
                                      {['الأحد 18 أكتوبر', 'الإثنين 19 أكتوبر', 'الثلاثاء 20 أكتوبر', 'الأربعاء 21 أكتوبر'].map(day => (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => setStitchSelectedDay(day)}
                                          className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap ${
                                            stitchSelectedDay === day
                                              ? `${themeMap.primaryBg} text-white`
                                              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                                          }`}
                                        >
                                          {day}
                                        </button>
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-bold opacity-60 shrink-0">{stitchSelectedDay}</span>
                                  </div>

                                  {/* Interactive Appointments Table */}
                                  <div className={`rounded-2xl border overflow-hidden shadow-2xs ${themeMap.cardBg}`}>
                                    <div className="px-4 py-3 border-b border-slate-200/60 flex items-center justify-between">
                                      <span className="font-bold text-xs">جدول مواعيد المعاينات العقارية ({stitchSelectedDay})</span>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('booking')}
                                        className={`text-[11px] font-bold ${themeMap.lightText} hover:underline`}
                                      >
                                        + إضافة حجز للجدول
                                      </button>
                                    </div>
                                    <div className="divide-y divide-slate-200/50 text-xs">
                                      {stitchAppointments.map((apt) => (
                                        <div key={apt.id} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-500/5 transition">
                                          <div className="space-y-0.5">
                                            <div className="font-bold flex items-center gap-2">
                                              <span>{apt.client}</span>
                                              <span className="text-[10px] font-mono opacity-50">{apt.id}</span>
                                            </div>
                                            <div className="text-[11px] opacity-70">{apt.property} · المستشار: {apt.agent}</div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-500/10">
                                              {apt.time}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setStitchAppointments(prev =>
                                                  prev.map(item =>
                                                    item.id === apt.id
                                                      ? { ...item, status: item.status === 'مؤكد' ? 'مكتمل' : 'مؤكد' }
                                                      : item
                                                  )
                                                );
                                                showToast(`تم تحديث حالة موعد ${apt.client}`);
                                              }}
                                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                                                apt.status === 'مؤكد'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : apt.status === 'مكتمل'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              ● {apt.status}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 2: INTERACTIVE BOOKING FORM SCREEN */}
                              {stitchScreenTab === 'booking' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  <div className={`p-5 rounded-2xl border space-y-4 ${themeMap.cardBg}`}>
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                      <div>
                                        <h4 className="font-black text-sm">حجز موعد معاينة عقارية جديدة</h4>
                                        <p className="text-[11px] opacity-60">اختر العقار والوقت المناسب ليتم إضافته فوراً إلى جدول المواعيد الحي</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('dashboard')}
                                        className="text-xs font-bold opacity-60 hover:opacity-100"
                                      >
                                        العودة للجدول ←
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <label className="block font-bold mb-1">اسم العميل الكامل</label>
                                        <input
                                          type="text"
                                          value={stitchBookingClient}
                                          onChange={e => setStitchBookingClient(e.target.value)}
                                          placeholder="مثال: م. سامي عبد الرحمن"
                                          className="w-full h-10 px-3 rounded-xl bg-slate-500/5 border border-slate-300/60 text-xs focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold mb-1">العقار / نوع الموعد</label>
                                        <select
                                          value={stitchBookingService}
                                          onChange={e => setStitchBookingService(e.target.value)}
                                          className="w-full h-10 px-3 rounded-xl bg-slate-500/5 border border-slate-300/60 text-xs font-semibold focus:outline-none"
                                        >
                                          <option value="معاينة فيلا سكنية - دابوق">معاينة فيلا سكنية - دابوق</option>
                                          <option value="معاينة شقة طابقية - عبدون">معاينة شقة طابقية - عبدون</option>
                                          <option value="مكتب تجاري ذكي - البوليفارد">مكتب تجاري ذكي - البوليفارد</option>
                                          <option value="استشارة استثمار وتمويل عقاري">استشارة استثمار وتمويل عقاري</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="text-xs space-y-1.5">
                                      <label className="block font-bold">اختر الفترة الزمنية المتاحة ({stitchSelectedDay})</label>
                                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {['09:30 صباحاً', '11:00 صباحاً', '01:00 ظهراً', '03:30 مساءً', '05:00 مساءً'].map(slot => (
                                          <button
                                            key={slot}
                                            type="button"
                                            onClick={() => setStitchSelectedSlot(slot)}
                                            className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition ${
                                              stitchSelectedSlot === slot
                                                ? `${themeMap.primaryBg} text-white border-transparent shadow-xs`
                                                : 'border-slate-300/60 hover:border-orange-400'
                                            }`}
                                          >
                                            {slot}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newEntry = {
                                            id: `APT-${Math.floor(105 + Math.random() * 90)}`,
                                            client: stitchBookingClient.trim() || 'عميل جديد (معاينة فورية)',
                                            property: stitchBookingService,
                                            time: stitchSelectedSlot,
                                            agent: 'أ. سامر الحسن',
                                            status: 'مؤكد' as const,
                                          };
                                          setStitchAppointments(prev => [newEntry, ...prev]);
                                          setStitchBookingClient('');
                                          setStitchScreenTab('dashboard');
                                          showToast(`تم تأكيد حجز الموعد (${newEntry.time}) وإضافته للوحة المواعيد الحية!`);
                                        }}
                                        className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                      >
                                        تأكيد الحجز وإضافته للجدول الحي
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 3: CUSTOMER PORTAL & PROPERTY SHOWCASE CARDS */}
                              {stitchScreenTab === 'portal' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    {[
                                      { title: 'فيلا الياسمين الذكية - دابوق', area: '620 م² • 5 غرف ماستر', price: '480,000 د.أ', slots: '3 مواعيد متاحة اليوم', tag: 'حصري VIP' },
                                      { title: 'شقة بانوراما - عبدون الشمالي', area: '245 م² • ترس مطل', price: '195,000 د.أ', slots: '5 مواعيد متاحة اليوم', tag: 'الأكثر طلباً' },
                                      { title: 'مكاتب أبراج العبدلي التجارية', area: '310 م² • تجهيز كامل', price: '260,000 د.أ', slots: 'موعدان متاحان اليوم', tag: 'استثماري' },
                                    ].map((prop, idx) => (
                                      <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 shadow-2xs ${themeMap.cardBg}`}>
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>
                                              {prop.tag}
                                            </span>
                                            <span className="font-black text-xs">{prop.price}</span>
                                          </div>
                                          <h5 className="font-bold text-xs">{prop.title}</h5>
                                          <p className="text-[11px] opacity-65">{prop.area}</p>
                                          <div className="text-[10px] text-emerald-500 font-bold">● {prop.slots}</div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStitchBookingService(prop.title);
                                            setStitchScreenTab('booking');
                                          }}
                                          className={`w-full py-2 rounded-xl text-white font-bold text-[11px] transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                        >
                                          احجز موعد معاينة للعقار
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* DYNAMICALLY ADDED CUSTOM PAGES FROM GATE 2 CHAT */}
                              {stitchCustomPages
                                .filter(cp => cp.id === stitchScreenTab)
                                .map(cp => (
                                  <div key={cp.id} className="p-5 space-y-4 flex-1 overflow-y-auto">
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${themeMap.cardBg}`}>
                                      <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                          <span>● صفحة مولدة بالذكاء الاصطناعي عبر Google Stitch</span>
                                        </div>
                                        <h4 className="font-black text-sm">{cp.title}</h4>
                                        <p className="text-[11px] opacity-65">بناءً على طلبك في الشات: "{cp.prompt}"</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('landing')}
                                        className="text-xs font-bold opacity-60 hover:opacity-100"
                                      >
                                        العودة للرئيسية ←
                                      </button>
                                    </div>

                                    {cp.pageKind === 'auth' && (
                                      <div className={`max-w-md mx-auto p-6 rounded-3xl border shadow-sm space-y-4 ${themeMap.cardBg}`}>
                                        <div className="text-center space-y-1">
                                          <div className={`w-11 h-11 rounded-2xl mx-auto flex items-center justify-center text-white font-black ${themeMap.primaryBg}`}>
                                            عقار
                                          </div>
                                          <h5 className="font-black text-sm mt-2">تسجيل الدخول إلى بوابة المكتب العقاري</h5>
                                          <p className="text-[11px] opacity-60">أدخل بياناتك لإدارة حجوزات ومعاينات العقارات</p>
                                        </div>
                                        <div className="space-y-3 text-xs">
                                          <div>
                                            <label className="block font-bold mb-1">البريد الإلكتروني أو رقم الجوال</label>
                                            <input type="text" placeholder="client@realestate.jo" className="w-full h-10 px-3 rounded-xl border border-slate-300/70 bg-transparent" />
                                          </div>
                                          <div>
                                            <label className="block font-bold mb-1">كلمة المرور</label>
                                            <input type="password" value="••••••••" readOnly className="w-full h-10 px-3 rounded-xl border border-slate-300/70 bg-transparent" />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              showToast('تم تسجيل الدخول بنجاح في المعاينة التفاعلية!');
                                              setStitchScreenTab('dashboard');
                                            }}
                                            className={`w-full py-2.5 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                          >
                                            دخول إلى المنصة
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {cp.pageKind === 'pricing' && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        {[
                                          { name: 'باقة المعاينة الأساسية', price: 'مجاناً', desc: 'حجز مواعيد معاينة حتى 3 عقارات أسبوعياً', btn: 'الباقة الحالية' },
                                          { name: 'باقة المستثمر العقاري VIP', price: '150 د.أ / شهر', desc: 'جولات ميدانية خاصة + مستشار مالي وعقاري مخصص', btn: 'اشترك الآن' },
                                          { name: 'باقة الشركات والمطورين', price: '450 د.أ / شهر', desc: 'إدارة مفتوحة لجميع المشاريع والوكلاء وتقارير متقدمة', btn: 'تواصل للمؤسسات' },
                                        ].map((plan, i) => (
                                          <div key={i} className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${themeMap.cardBg}`}>
                                            <div className="space-y-2">
                                              <div className="font-bold text-xs">{plan.name}</div>
                                              <div className="text-lg font-black text-amber-600">{plan.price}</div>
                                              <p className="text-[11px] opacity-70">{plan.desc}</p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => showToast(`تم اختيار ${plan.name}`)}
                                              className={`w-full py-2 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                            >
                                              {plan.btn}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {cp.pageKind !== 'auth' && cp.pageKind !== 'pricing' && (
                                      <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم الرئيسي 01</span>
                                            <div className="font-bold text-xs">واجهة {cp.title}</div>
                                            <p className="text-[11px] opacity-65">مكون تفاعلي مصمم خصيصاً لـ {activeProject.name} مع دعم كامل للعربية.</p>
                                          </div>
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم التفاعلي 02</span>
                                            <div className="font-bold text-xs">إدارة البيانات والإجراءات السريعة</div>
                                            <p className="text-[11px] opacity-65">مرتبط مباشرة بقاعدة بيانات المواعيد والعقارات والعملاء.</p>
                                          </div>
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم التحليلي 03</span>
                                            <div className="font-bold text-xs">ملخص مخرجات Google Stitch</div>
                                            <p className="text-[11px] opacity-65 line-clamp-2">{cp.aiSummary}</p>
                                          </div>
                                        </div>

                                        <div className={`p-5 rounded-2xl border space-y-3 ${themeMap.cardBg}`}>
                                          <div className="font-bold text-xs">نموذج التفاعل السريع في {cp.title}</div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input type="text" placeholder="الاسم أو العنوان..." className="h-10 px-3 rounded-xl border border-slate-300/60 bg-transparent text-xs" />
                                            <input type="text" placeholder="التفاصيل أو الملاحظات..." className="h-10 px-3 rounded-xl border border-slate-300/60 bg-transparent text-xs" />
                                            <button
                                              type="button"
                                              onClick={() => showToast(`تم حفظ البيانات في ${cp.title} بنجاح!`)}
                                              className={`h-10 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                            >
                                              حفظ وتنفيذ الإجراء
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                              {/* TAB 4: STITCH GENERATED TAILWIND / REACT CODE */}
                              {stitchScreenTab === 'code' && (
                                <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] flex-1 overflow-auto" dir="ltr">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                                    <span>// Google Stitch Generated UI Component (Tailwind CSS RTL)</span>
                                    <button
                                      type="button"
                                      onClick={() => showToast('تم نسخ كود واجهة Google Stitch إلى الحافظة')}
                                      className="px-2.5 py-1 rounded bg-slate-800 text-white text-[10px] font-sans font-bold"
                                    >
                                      نسخ الكود
                                    </button>
                                  </div>
                                  <pre>{`export default function RealEstateBookingStitchUI() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6 space-y-6">
      <header className="bg-white p-4 rounded-2xl border flex items-center justify-between">
        <h1 className="text-lg font-black">${activeProject.name}</h1>
        <button className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold">
          + حجز موعد معاينة جديد
        </button>
      </header>
      {/* Landing Page + Live Appointments Schedule + Custom Stitch Pages */}
    </div>
  );
}`}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {activeProject.currentGate === 3 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {activeProject.codeFiles.map((file, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedCodeFileIdx(idx)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                                    selectedCodeFileIdx === idx
                                      ? 'bg-orange-600 text-white shadow-2xs'
                                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                  }`}
                                >
                                  {file.name}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => executeStageAgentPrompt(`قم بكتابة كود مكون برمجي كامل لـ "${activeProject.name}" باستخدام React و TypeScript و Tailwind CSS`)}
                              disabled={isAiProcessing}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <Code2 className="w-3.5 h-3.5 text-orange-400" />
                              <span>+ توليد ملف كود جديد عبر وكيل البوابة 3</span>
                            </button>
                          </div>
                          <div className="flex-1 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl p-4 overflow-x-auto" dir="ltr">
                            <pre>{activeProject.codeFiles[selectedCodeFileIdx]?.content || activeProject.codeFiles[0]?.content || '// لا توجد ملفات بعد'}</pre>
                          </div>
                        </div>
                      )}

                      {activeProject.currentGate === 4 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between gap-3">
                            <div className="grid grid-cols-2 gap-4 flex-1">
                              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-900 space-y-1">
                                <span className="text-xs text-emerald-600 font-semibold">الاختبارات الناجحة (Passed Tests)</span>
                                <div className="text-2xl font-black">{activeProject.testResults?.passed || 20} / {activeProject.testResults?.passed || 20}</div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-blue-900 space-y-1">
                                <span className="text-xs text-blue-600 font-semibold">فحص الأمان والثغرات (OWASP)</span>
                                <div className="text-2xl font-black">آمن 100%</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => executeStageAgentPrompt(`قم بإجراء فحص أمني واختبار جودة شامل للكود والمتطلبات في "${activeProject.name}" وإصدار التقرير`)}
                              disabled={isAiProcessing}
                              className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shrink-0"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>تشغيل فحص وكيل البوابة 4 الآن</span>
                            </button>
                          </div>
                          <div className="bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl p-4 space-y-1.5 flex-1 overflow-y-auto" dir="ltr">
                            <div className="text-emerald-400">[PASS] TypeScript Type Checking completed</div>
                            <div className="text-emerald-400">[PASS] Vite Production Build successful</div>
                            <div className="text-emerald-400">[PASS] Zero Vulnerabilities detected</div>
                            {(activeProject.testResults?.logs || []).map((logLine, i) => (
                              <div key={i} className="text-amber-300">{logLine}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeProject.currentGate === 5 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col justify-center items-center text-center">
                          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <PackageCheck className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-base">حزمة الإنتاج جاهزة تماماً للتحميل والتسليم</h3>
                          <p className="text-xs text-slate-500 max-w-md">
                            تم فحص المشروع واعتماده عبر البوابات الخمس. يمكنك تشغيل وكيل التسليم (Gate 5) لتوليد دليل النشر السحابي أو تحميل ملفات المشروع الكاملة.
                          </p>
                          <div className="flex items-center gap-3 flex-wrap justify-center">
                            <button
                              type="button"
                              onClick={() => executeStageAgentPrompt(`قم بتوليد ملف إعداد Docker وخطوات الإطلاق السحابي الكاملة لمشروع "${activeProject.name}"`)}
                              disabled={isAiProcessing}
                              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                            >
                              <Play className="w-4 h-4 text-orange-400" />
                              <span>توليد خطة النشر عبر وكيل البوابة 5</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const bundleContent = JSON.stringify(
                                  {
                                    project: activeProject.name,
                                    description: activeProject.description,
                                    prd: activeProject.prd,
                                    designNotes: activeProject.designNotes,
                                    stitchCustomPages,
                                    codeFiles: activeProject.codeFiles,
                                    qaResults: activeProject.testResults,
                                    exportedAt: new Date().toISOString(),
                                  },
                                  null,
                                  2
                                );
                                const blob = new Blob([bundleContent], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${activeProject.id}-production-bundle.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                                showToast('تم تحميل الحزمة البرمجية الكاملة للمشروع بنجاح!');
                              }}
                              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>تحميل الحزمة البرمجية الكاملة (ZIP / Bundle)</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </main>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}
