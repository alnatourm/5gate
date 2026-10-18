export interface RequirementsDocument {
  projectName: string;
  overview: string;
  objectives: string[];
  userRoles: string[];
  features: string[];
  userJourneys: string[];
  businessRules: string[];
  dataRequirements: string[];
  integrations: string[];
  acceptanceCriteria: string[];
  assumptions: string[];
  exclusions: string[];
}

export const REQUIREMENTS_SECTIONS: {
  key: keyof RequirementsDocument;
  labelAr: string;
  labelEn: string;
  isList: boolean;
}[] = [
  { key: 'projectName', labelAr: 'اسم المشروع', labelEn: 'Project Name', isList: false },
  { key: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', isList: false },
  { key: 'objectives', labelAr: 'الأهداف', labelEn: 'Objectives', isList: true },
  { key: 'userRoles', labelAr: 'أدوار المستخدمين', labelEn: 'User Roles', isList: true },
  { key: 'features', labelAr: 'الميزات الأساسية', labelEn: 'Features', isList: true },
  { key: 'userJourneys', labelAr: 'رحلات المستخدم', labelEn: 'User Journeys', isList: true },
  { key: 'businessRules', labelAr: 'قواعد العمل', labelEn: 'Business Rules', isList: true },
  { key: 'dataRequirements', labelAr: 'متطلبات البيانات', labelEn: 'Data Requirements', isList: true },
  { key: 'integrations', labelAr: 'التكاملات والربط الخارجي', labelEn: 'Integrations', isList: true },
  { key: 'acceptanceCriteria', labelAr: 'معايير القبول', labelEn: 'Acceptance Criteria', isList: true },
  { key: 'assumptions', labelAr: 'الافتراضات', labelEn: 'Assumptions', isList: true },
  { key: 'exclusions', labelAr: 'الاستثناءات (خارج النطاق)', labelEn: 'Exclusions', isList: true },
];

export function createInitialRequirementsDocument(projectName: string, description: string): RequirementsDocument {
  const cleanName = (projectName || '').trim() || 'مشروع جديد';
  const cleanDesc = (description || '').trim() || `نظام برمجي متكامل لـ ${cleanName}`;
  return {
    projectName: cleanName,
    overview: cleanDesc,
    objectives: [`بناء وإطلاق ${cleanName} بجودة عالية وتجربة مستخدم عربية متكاملة`],
    userRoles: ['مدير النظام (Admin)', 'المستخدم النهائي (End User)'],
    features: ['إدارة الحسابات والصلاحيات', 'لوحة تحكم رئيسية لمتابعة العمليات'],
    userJourneys: ['تسجيل الدخول واستعراض لوحة التحكم وإتمام العمليات الأساسية'],
    businessRules: ['التحقق من صلاحيات المستخدم قبل تنفيذ أي عملية حساسة'],
    dataRequirements: ['المستخدمون (Users)', 'السجلات والعمليات الأساسية (Core Records)'],
    integrations: ['البريد الإلكتروني / الإشعارات الأساسية'],
    acceptanceCriteria: ['عمل جميع المسارات الأساسية بنجاح واجتياز فحوصات الجودة'],
    assumptions: ['توفر اتصال إنترنت مستقر لدى المستخدمين'],
    exclusions: ['تطبيقات الهواتف الأصلية (Native iOS/Android) في المرحلة الأولى ما لم يُطلب خلاف ذلك'],
  };
}

function normalizeStringArray(val: unknown): string[] | null {
  if (!Array.isArray(val)) return null;
  const result: string[] = [];
  for (const item of val) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) result.push(trimmed);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const parts = [obj.title, obj.name, obj.role, obj.feature, obj.description, obj.summary, obj.rule]
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim());
      if (parts.length > 0) {
        result.push(parts.join(' - '));
      }
    }
  }
  return result;
}

export function validateRequirementsDocument(
  input: unknown,
  options: { strictForApproval?: boolean } = {}
): { valid: boolean; errors: string[]; document?: RequirementsDocument } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['وثيقة المتطلبات يجب أن تكون كائناً مهيكلاً صالحاً (Structured JSON Object).'] };
  }

  const raw = input as Record<string, unknown>;
  const projectName = typeof raw.projectName === 'string' ? raw.projectName.trim() : '';
  const overview = typeof raw.overview === 'string' ? raw.overview.trim() : '';

  if (!projectName) {
    errors.push('حقل اسم المشروع (projectName) مطلوب ولا يمكن أن يكون فارغاً.');
  }
  if (!overview) {
    errors.push('حقل النظرة العامة (overview) مطلوب ولا يمكن أن يكون فارغاً.');
  }

  const listKeys: (keyof Omit<RequirementsDocument, 'projectName' | 'overview'>)[] = [
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
  ];

  const normalizedLists: Record<string, string[]> = {};
  for (const key of listKeys) {
    const arr = normalizeStringArray(raw[key]);
    if (arr === null) {
      errors.push(`القسم "${key}" يجب أن يكون مصفوفة عناصر نصية.`);
    } else {
      normalizedLists[key] = arr;
      if (options.strictForApproval) {
        const requiredNonEmptyForApproval = [
          'objectives',
          'userRoles',
          'features',
          'userJourneys',
          'businessRules',
          'dataRequirements',
          'acceptanceCriteria',
        ];
        if (requiredNonEmptyForApproval.includes(key) && arr.length === 0) {
          errors.push(`القسم "${key}" مطلوب ولا يمكن أن يكون فارغاً عند اعتماد البوابة الأولى.`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const document: RequirementsDocument = {
    projectName,
    overview,
    objectives: normalizedLists.objectives || [],
    userRoles: normalizedLists.userRoles || [],
    features: normalizedLists.features || [],
    userJourneys: normalizedLists.userJourneys || [],
    businessRules: normalizedLists.businessRules || [],
    dataRequirements: normalizedLists.dataRequirements || [],
    integrations: normalizedLists.integrations || [],
    acceptanceCriteria: normalizedLists.acceptanceCriteria || [],
    assumptions: normalizedLists.assumptions || [],
    exclusions: normalizedLists.exclusions || [],
  };

  return { valid: true, errors: [], document };
}

function mergeUniqueStrings(existing: string[], incoming?: string[], mode: 'merge' | 'replace' = 'merge'): string[] {
  if (!incoming || incoming.length === 0) return existing;
  if (mode === 'replace') return incoming;
  const combined = [...existing];
  for (const item of incoming) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const exists = combined.some((e) => e.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      combined.push(trimmed);
    }
  }
  return combined;
}

/**
 * Merges AI-generated updates into an existing RequirementsDocument while preserving
 * previously confirmed requirements and avoiding overwriting unrelated sections.
 */
export function mergeRequirementsDocument(
  existing: RequirementsDocument,
  patch: Partial<RequirementsDocument>,
  replaceSections: (keyof RequirementsDocument)[] = []
): RequirementsDocument {
  const shouldReplace = (k: keyof RequirementsDocument) => replaceSections.includes(k);

  return {
    projectName:
      typeof patch.projectName === 'string' && patch.projectName.trim().length > 0
        ? patch.projectName.trim()
        : existing.projectName,
    overview:
      typeof patch.overview === 'string' && patch.overview.trim().length > 0
        ? patch.overview.trim()
        : existing.overview,
    objectives: mergeUniqueStrings(
      existing.objectives,
       normalizeStringArray(patch.objectives) || undefined,
      shouldReplace('objectives') ? 'replace' : 'merge'
    ),
    userRoles: mergeUniqueStrings(
      existing.userRoles,
      normalizeStringArray(patch.userRoles) || undefined,
      shouldReplace('userRoles') ? 'replace' : 'merge'
    ),
    features: mergeUniqueStrings(
      existing.features,
      normalizeStringArray(patch.features) || undefined,
      shouldReplace('features') ? 'replace' : 'merge'
    ),
    userJourneys: mergeUniqueStrings(
      existing.userJourneys,
      normalizeStringArray(patch.userJourneys) || undefined,
      shouldReplace('userJourneys') ? 'replace' : 'merge'
    ),
    businessRules: mergeUniqueStrings(
      existing.businessRules,
      normalizeStringArray(patch.businessRules) || undefined,
      shouldReplace('businessRules') ? 'replace' : 'merge'
    ),
    dataRequirements: mergeUniqueStrings(
      existing.dataRequirements,
      normalizeStringArray(patch.dataRequirements) || undefined,
      shouldReplace('dataRequirements') ? 'replace' : 'merge'
    ),
    integrations: mergeUniqueStrings(
      existing.integrations,
      normalizeStringArray(patch.integrations) || undefined,
      shouldReplace('integrations') ? 'replace' : 'merge'
    ),
    acceptanceCriteria: mergeUniqueStrings(
      existing.acceptanceCriteria,
      normalizeStringArray(patch.acceptanceCriteria) || undefined,
      shouldReplace('acceptanceCriteria') ? 'replace' : 'merge'
    ),
    assumptions: mergeUniqueStrings(
      existing.assumptions,
      normalizeStringArray(patch.assumptions) || undefined,
      shouldReplace('assumptions') ? 'replace' : 'merge'
    ),
    exclusions: mergeUniqueStrings(
      existing.exclusions,
      normalizeStringArray(patch.exclusions) || undefined,
      shouldReplace('exclusions') ? 'replace' : 'merge'
    ),
  };
}

export function formatRequirementsToMarkdown(doc: RequirementsDocument): string {
  const formatList = (items: string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- (لم يتم التحديد بعد)';

  return [
    `# وثيقة متطلبات المنتج (PRD): ${doc.projectName}`,
    '',
    `## 1. اسم المشروع (Project Name)`,
    doc.projectName,
    '',
    `## 2. نظرة عامة (Overview)`,
    doc.overview,
    '',
    `## 3. الأهداف (Objectives)`,
    formatList(doc.objectives),
    '',
    `## 4. أدوار المستخدمين (User Roles)`,
    formatList(doc.userRoles),
    '',
    `## 5. الميزات الأساسية (Features)`,
    formatList(doc.features),
    '',
    `## 6. رحلات المستخدم (User Journeys)`,
    formatList(doc.userJourneys),
    '',
    `## 7. قواعد العمل (Business Rules)`,
    formatList(doc.businessRules),
    '',
    `## 8. متطلبات البيانات (Data Requirements)`,
    formatList(doc.dataRequirements),
    '',
    `## 9. التكاملات والربط الخارجي (Integrations)`,
    formatList(doc.integrations),
    '',
    `## 10. معايير القبول (Acceptance Criteria)`,
    formatList(doc.acceptanceCriteria),
    '',
    `## 11. الافتراضات (Assumptions)`,
    formatList(doc.assumptions),
    '',
    `## 12. الاستثناءات خارج النطاق (Exclusions)`,
    formatList(doc.exclusions),
  ].join('\n');
}

export function parseMarkdownToRequirements(
  markdown: string,
  fallbackDoc: RequirementsDocument
): RequirementsDocument {
  const result: RequirementsDocument = {
    projectName: fallbackDoc.projectName,
    overview: fallbackDoc.overview,
    objectives: [...fallbackDoc.objectives],
    userRoles: [...fallbackDoc.userRoles],
    features: [...fallbackDoc.features],
    userJourneys: [...fallbackDoc.userJourneys],
    businessRules: [...fallbackDoc.businessRules],
    dataRequirements: [...fallbackDoc.dataRequirements],
    integrations: [...fallbackDoc.integrations],
    acceptanceCriteria: [...fallbackDoc.acceptanceCriteria],
    assumptions: [...fallbackDoc.assumptions],
    exclusions: [...fallbackDoc.exclusions],
  };

  if (!markdown || !markdown.trim()) {
    return result;
  }

  const sectionMatchers: { key: keyof RequirementsDocument; patterns: RegExp[] }[] = [
    { key: 'projectName', patterns: [/اسم المشروع/i, /project\s*name/i] },
    { key: 'overview', patterns: [/نظرة عامة/i, /overview/i] },
    { key: 'objectives', patterns: [/الأهداف/i, /objectives/i] },
    { key: 'userRoles', patterns: [/أدوار المستخدمين/i, /user\s*roles/i] },
    { key: 'features', patterns: [/الميزات/i, /features/i] },
    { key: 'userJourneys', patterns: [/رحلات المستخدم/i, /user\s*journeys/i] },
    { key: 'businessRules', patterns: [/قواعد العمل/i, /business\s*rules/i] },
    { key: 'dataRequirements', patterns: [/متطلبات البيانات/i, /data\s*requirements/i] },
    { key: 'integrations', patterns: [/التكاملات/i, /integrations/i] },
    { key: 'acceptanceCriteria', patterns: [/معايير القبول/i, /acceptance\s*criteria/i] },
    { key: 'assumptions', patterns: [/الافتراضات/i, /assumptions/i] },
    { key: 'exclusions', patterns: [/الاستثناءات/i, /خارج النطاق/i, /exclusions/i] },
  ];

  const lines = markdown.split(/\r?\n/);
  let currentKey: keyof RequirementsDocument | null = null;
  const collected: Partial<Record<keyof RequirementsDocument, string[]>> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const h1Match = line.match(/^#\s+وثيقة متطلبات المنتج.*?:\s*(.+)$/i);
    if (h1Match && h1Match[1].trim()) {
      result.projectName = h1Match[1].trim();
      continue;
    }

    if (line.startsWith('##')) {
      const headingText = line.replace(/^#+\s*/, '');
      let matched: keyof RequirementsDocument | null = null;
      for (const sm of sectionMatchers) {
        if (sm.patterns.some((p) => p.test(headingText))) {
          matched = sm.key;
          break;
        }
      }
      currentKey = matched;
      if (currentKey && !collected[currentKey]) {
        collected[currentKey] = [];
      }
      continue;
    }

    if (currentKey) {
      if (line.length > 0 && line !== '- (لم يتم التحديد بعد)') {
        collected[currentKey]!.push(line);
      }
    }
  }

  if (collected.projectName && collected.projectName.length > 0) {
    result.projectName = collected.projectName.join(' ').replace(/^[-*]\s*/, '').trim() || result.projectName;
  }
  if (collected.overview && collected.overview.length > 0) {
    result.overview = collected.overview.join('\n').trim() || result.overview;
  }

  const listKeys: (keyof Omit<RequirementsDocument, 'projectName' | 'overview'>)[] = [
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
  ];

  for (const key of listKeys) {
    if (collected[key]) {
      const parsedItems = collected[key]!
        .map((l) => l.replace(/^[-*•\d.)]+\s*/, '').trim())
        .filter(Boolean);
      result[key] = parsedItems;
    }
  }

  return result;
}
