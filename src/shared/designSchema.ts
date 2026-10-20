import { RequirementsDocument } from './requirementsSchema.ts';

export interface DesignVisualTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  themePreset: 'orange' | 'blue' | 'emerald' | 'violet' | 'dark';
}

export interface DesignNavigationItem {
  id: string;
  label: string;
  route: string;
  targetScreenId: string;
  role: string;
}

export interface DesignScreenDefinition {
  id: string;
  title: string;
  name: string;
  route: string;
  role: string;
  primaryRole: string;
  purpose: string;
  summary: string;
  layoutType: 'landing' | 'dashboard' | 'form' | 'list' | 'detail' | 'auth' | 'analytics';
  kpis: { label: string; value: string; badge?: string }[];
  sections: { title: string; description: string; items: string[] }[];
  actions: string[];
  htmlContent: string;
}

export interface DesignComponentItem {
  name: string;
  category: string;
  description: string;
  props: string[];
}

export interface DesignUserFlow {
  name: string;
  actor: string;
  steps: string[];
}

export interface DesignFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'time' | 'select' | 'textarea' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface DesignFormDefinition {
  id: string;
  title: string;
  screenId: string;
  submitLabel: string;
  fields: DesignFormField[];
}

export interface DesignUIFile {
  path: string;
  content: string;
  fileType: string;
  screenId?: string;
}

export interface DesignArtifact {
  projectName: string;
  designSummary: string;
  basedOnPrdVersion: number;
  designSpecification: {
    direction: 'rtl' | 'ltr';
    primaryLanguage: string;
    designSystem: string;
    preferredPlatform: string;
    layoutStructure: string;
    responsiveBehavior: string;
    uiPreferences: string[];
  };
  visualTokens: DesignVisualTokens;
  navigationMap: DesignNavigationItem[];
  screenInventory: DesignScreenDefinition[];
  screens: DesignScreenDefinition[];
  componentInventory: DesignComponentItem[];
  components: DesignComponentItem[];
  userFlows: DesignUserFlow[];
  formDefinitions: DesignFormDefinition[];
  uiFiles: DesignUIFile[];
  previewMetadata: {
    defaultScreenId: string;
    supportedViewports: ('desktop' | 'tablet' | 'mobile')[];
    isolatedPreviewHtml: string;
  };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildIsolatedDesignPreviewHtml(artifact: Omit<DesignArtifact, 'previewMetadata'>): string {
  const dir = artifact.designSpecification.direction || 'rtl';
  const primary = artifact.visualTokens.primaryColor || '#FF6B00';
  const bg = artifact.visualTokens.backgroundColor || '#F8FAFC';
  const surface = artifact.visualTokens.surfaceColor || '#FFFFFF';
  const text = artifact.visualTokens.textColor || '#0F172A';

  const navButtonsHtml = artifact.screenInventory
    .map(
      (scr, idx) =>
        `<button class="nav-btn ${idx === 0 ? 'active' : ''}" data-screen="${escapeHtml(scr.id)}" onclick="switchScreen('${escapeHtml(scr.id)}')">${escapeHtml(scr.title)}</button>`
    )
    .join('\n');

  const screensHtml = artifact.screenInventory
    .map((scr, idx) => {
      const kpisHtml =
        scr.kpis && scr.kpis.length > 0
          ? `<div class="kpi-grid">${scr.kpis
              .map(
                (k) => `
              <div class="kpi-card">
                <div class="kpi-label">${escapeHtml(k.label)}</div>
                <div class="kpi-val">${escapeHtml(k.value)}</div>
                ${k.badge ? `<span class="badge">${escapeHtml(k.badge)}</span>` : ''}
              </div>`
              )
              .join('')}</div>`
          : '';

      const sectionsHtml = (scr.sections || [])
        .map(
          (sec) => `
          <div class="section-card">
            <h4>${escapeHtml(sec.title)}</h4>
            <p class="muted">${escapeHtml(sec.description)}</p>
            <ul>
              ${(sec.items || []).map((it) => `<li>✓ ${escapeHtml(it)}</li>`).join('')}
            </ul>
          </div>`
        )
        .join('');

      const matchingForms = (artifact.formDefinitions || []).filter((f) => f.screenId === scr.id);
      const formsHtml = matchingForms
        .map(
          (frm) => `
          <form class="form-card" onsubmit="event.preventDefault(); showNotice('تم حفظ النموذج: ${escapeHtml(frm.title)}');">
            <h4>${escapeHtml(frm.title)}</h4>
            <div class="form-grid">
              ${(frm.fields || [])
                .map((fld) => {
                  if (fld.type === 'select' && fld.options && fld.options.length > 0) {
                    return `<div class="field">
                      <label>${escapeHtml(fld.label)}</label>
                      <select>${fld.options.map((o) => `<option>${escapeHtml(o)}</option>`).join('')}</select>
                    </div>`;
                  }
                  return `<div class="field">
                    <label>${escapeHtml(fld.label)}</label>
                    <input type="${escapeHtml(fld.type || 'text')}" placeholder="${escapeHtml(fld.placeholder || fld.label)}" ${fld.required ? 'required' : ''} />
                  </div>`;
                })
                .join('')}
            </div>
            <button type="submit" class="primary-btn">${escapeHtml(frm.submitLabel || 'حفظ وإرسال')}</button>
          </form>`
        )
        .join('');

      return `
        <section id="screen-${escapeHtml(scr.id)}" class="screen-pane ${idx === 0 ? 'active' : ''}">
          <div class="screen-header">
            <div>
              <span class="badge">${escapeHtml(scr.role)} • ${escapeHtml(scr.route)}</span>
              <h2>${escapeHtml(scr.title)}</h2>
              <p class="muted">${escapeHtml(scr.purpose)}</p>
            </div>
            <div class="actions">
              ${(scr.actions || [])
                .map(
                  (act) =>
                    `<button type="button" class="primary-btn" onclick="showNotice('${escapeHtml(act)}')">${escapeHtml(act)}</button>`
                )
                .join('')}
            </div>
          </div>
          ${kpisHtml}
          <div class="sections-grid">${sectionsHtml}</div>
          ${formsHtml}
        </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${artifact.designSpecification.primaryLanguage || 'ar'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>${escapeHtml(artifact.projectName)} — Design Preview</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; padding: 0; background: ${escapeHtml(bg)}; color: ${escapeHtml(text)}; direction: ${dir}; }
    header { background: ${escapeHtml(surface)}; border-bottom: 1px solid #e2e8f0; padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 15px; }
    .brand-icon { width: 32px; height: 32px; border-radius: 10px; background: ${escapeHtml(primary)}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
    nav { display: flex; gap: 8px; flex-wrap: wrap; }
    .nav-btn { border: 1px solid #e2e8f0; background: #f1f5f9; color: #334155; padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .nav-btn.active { background: ${escapeHtml(primary)}; color: #fff; border-color: ${escapeHtml(primary)}; }
    main { padding: 20px; max-width: 1100px; margin: 0 auto; }
    .screen-pane { display: none; flex-direction: column; gap: 16px; }
    .screen-pane.active { display: flex; }
    .screen-header { background: ${escapeHtml(surface)}; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .screen-header h2 { margin: 6px 0 4px; font-size: 18px; }
    .muted { margin: 0; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; background: #fff7ed; color: ${escapeHtml(primary)}; border: 1px solid #fed7aa; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .kpi-card { background: ${escapeHtml(surface)}; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
    .kpi-label { font-size: 11px; color: #64748b; }
    .kpi-val { font-size: 20px; font-weight: 900; margin: 4px 0; }
    .sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .section-card, .form-card { background: ${escapeHtml(surface)}; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .section-card h4, .form-card h4 { margin: 0 0 6px; font-size: 14px; }
    .section-card ul { list-style: none; padding: 0; margin: 10px 0 0; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 12px 0; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; }
    .field input, .field select { height: 36px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; }
    .primary-btn { background: ${escapeHtml(primary)}; color: #fff; border: none; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    #notice { display: none; position: fixed; bottom: 16px; left: 16px; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">UI</div>
      <div>
        <div>${escapeHtml(artifact.projectName)}</div>
        <div class="muted">${escapeHtml(artifact.designSummary)}</div>
      </div>
    </div>
    <nav>${navButtonsHtml}</nav>
  </header>
  <main>${screensHtml}</main>
  <div id="notice"></div>
  <script>
    function switchScreen(id) {
      document.querySelectorAll('.screen-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      var target = document.getElementById('screen-' + id);
      if (target) target.classList.add('active');
      var btn = document.querySelector('.nav-btn[data-screen="' + id + '"]');
      if (btn) btn.classList.add('active');
    }
    function showNotice(msg) {
      var n = document.getElementById('notice');
      n.textContent = msg;
      n.style.display = 'block';
      setTimeout(function() { n.style.display = 'none'; }, 2500);
    }
  </script>
</body>
</html>`;
}

export function generateScreenComponentSource(
  projectName: string,
  screen: DesignScreenDefinition,
  forms: DesignFormDefinition[],
  tokens: DesignVisualTokens
): string {
  const componentName =
    screen.id
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') + 'Screen';

  const kpisJson = JSON.stringify(screen.kpis || [], null, 2);
  const sectionsJson = JSON.stringify(screen.sections || [], null, 2);
  const formsJson = JSON.stringify(forms || [], null, 2);

  return `import React, { useState } from 'react';

const KPIS = ${kpisJson};
const SECTIONS = ${sectionsJson};
const FORMS = ${formsJson};

export default function ${componentName || 'GeneratedScreen'}() {
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6 space-y-6">
      <header className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            ${screen.role} • ${screen.route}
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-1">${screen.title} — ${projectName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">${screen.purpose}</p>
        </div>
        <div className="flex items-center gap-2">
          ${(screen.actions || [])
            .map(
              (act) =>
                `<button type="button" onClick={() => setStatusBanner(${JSON.stringify(act)})} className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: ${JSON.stringify(tokens.primaryColor || '#FF6B00')} }}>${act}</button>`
            )
            .join('\n          ')}
        </div>
      </header>

      {statusBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          تم تنفيذ الإجراء: {statusBanner}
        </div>
      )}

      {KPIS.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500">{kpi.label}</div>
              <div className="text-xl font-black text-slate-900 mt-1">{kpi.value}</div>
              {kpi.badge && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-bold">
                  {kpi.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((sec, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
            <p className="text-xs text-slate-500">{sec.description}</p>
            <ul className="space-y-1 text-xs text-slate-700 pt-1">
              {(sec.items || []).map((item: string, i: number) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {FORMS.map((frm, fIdx) => (
        <form
          key={fIdx}
          onSubmit={(e) => {
            e.preventDefault();
            setStatusBanner(frm.title);
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">{frm.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {(frm.fields || []).map((field: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <label className="block font-bold text-slate-700">{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder || field.label}
                  required={Boolean(field.required)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
          >
            {frm.submitLabel || 'حفظ البيانات'}
          </button>
        </form>
      ))}
    </div>
  );
}
`;
}

export function validateDesignArtifact(
  raw: unknown,
  fallbackPrd?: RequirementsDocument,
  basedOnPrdVersion = 1,
  _options?: { strictForApproval?: boolean }
): { valid: boolean; errors: string[]; artifact?: DesignArtifact } {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['مخرجات التصميم يجب أن تكون كائناً مهيكلاً صالحاً (JSON Object).'] };
  }

  const obj = raw as Record<string, any>;
  const projectName =
    (typeof obj.projectName === 'string' && obj.projectName.trim()) ||
    fallbackPrd?.projectName ||
    'مشروع برمجي';
  const designSummary =
    (typeof obj.designSummary === 'string' && obj.designSummary.trim()) ||
    `تصميم واجهات وتجربة المستخدم لمشروع ${projectName}`;

  const rawScreensList = Array.isArray(obj.screenInventory) && obj.screenInventory.length > 0
    ? obj.screenInventory
    : Array.isArray(obj.screens) && obj.screens.length > 0
    ? obj.screens
    : [];

  if (rawScreensList.length === 0) {
    errors.push('يجب أن يتضمن التصميم شاشة واحدة على الأقل في قائمة الشاشات (screenInventory).');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const rawTokens =
    obj.visualTokens && typeof obj.visualTokens === 'object'
      ? obj.visualTokens
      : obj.colorPalette && typeof obj.colorPalette === 'object'
      ? {
          primaryColor: obj.colorPalette.primary,
          secondaryColor: obj.colorPalette.secondary,
          accentColor: obj.colorPalette.accent,
          backgroundColor: obj.colorPalette.background,
          surfaceColor: obj.colorPalette.surface,
          textColor: obj.colorPalette.text,
        }
      : {};
  const themePreset = ['orange', 'blue', 'emerald', 'violet', 'dark'].includes(rawTokens.themePreset)
    ? rawTokens.themePreset
    : 'orange';

  const visualTokens: DesignVisualTokens = {
    primaryColor: String(rawTokens.primaryColor || '#FF6B00'),
    secondaryColor: String(rawTokens.secondaryColor || '#0F172A'),
    accentColor: String(rawTokens.accentColor || '#10B981'),
    backgroundColor: String(rawTokens.backgroundColor || '#F8FAFC'),
    surfaceColor: String(rawTokens.surfaceColor || '#FFFFFF'),
    textColor: String(rawTokens.textColor || '#0F172A'),
    fontFamily: String(rawTokens.fontFamily || 'Cairo, Inter, sans-serif'),
    borderRadius: String(rawTokens.borderRadius || '16px'),
    themePreset,
  };

  const screenInventory: DesignScreenDefinition[] = (rawScreensList as any[]).map((scr, idx) => {
    const id =
      typeof scr?.id === 'string' && scr.id.trim()
        ? scr.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-')
        : `screen-${idx + 1}`;
    const rawTitle =
      typeof scr?.title === 'string' && scr.title.trim()
        ? scr.title.trim()
        : typeof scr?.name === 'string' && scr.name.trim()
        ? scr.name.trim()
        : `الشاشة ${idx + 1}`;
    const route = typeof scr?.route === 'string' && scr.route.trim() ? scr.route.trim() : `/${id}`;
    const rawRole =
      typeof scr?.role === 'string' && scr.role.trim()
        ? scr.role.trim()
        : typeof scr?.primaryRole === 'string' && scr.primaryRole.trim()
        ? scr.primaryRole.trim()
        : 'المستخدم';
    const rawPurpose =
      typeof scr?.purpose === 'string' && scr.purpose.trim()
        ? scr.purpose.trim()
        : typeof scr?.summary === 'string' && scr.summary.trim()
        ? scr.summary.trim()
        : `واجهة ${rawTitle} ضمن مشروع ${projectName}`;
    const rawLayout = scr?.layoutType || scr?.screenType;
    const layoutType = ['landing', 'dashboard', 'form', 'list', 'detail', 'auth', 'analytics'].includes(
      rawLayout
    )
      ? rawLayout
      : idx === 0
      ? 'dashboard'
      : 'form';

    const kpis = Array.isArray(scr?.kpis)
      ? scr.kpis
          .filter((k: any) => k && (k.label || k.title))
          .map((k: any) => ({
            label: String(k.label || k.title),
            value: String(k.value || '0'),
            badge: k.badge ? String(k.badge) : undefined,
          }))
      : [];

    const sections = Array.isArray(scr?.sections)
      ? scr.sections
          .filter((s: any) => s && s.title)
          .map((s: any) => ({
            title: String(s.title),
            description: String(s.description || ''),
            items: Array.isArray(s.items) ? s.items.map((it: any) => String(it)) : [],
          }))
      : [
          {
            title: `قسم ${rawTitle}`,
            description: rawPurpose,
            items: fallbackPrd?.features?.slice(0, 4) || ['إدارة البيانات وعرض السجلات'],
          },
        ];

    const actions = Array.isArray(scr?.actions)
      ? scr.actions.map((a: any) => String(a)).filter(Boolean)
      : [`تنفيذ إجراء في ${rawTitle}`];

    const htmlContent =
      typeof scr?.htmlContent === 'string' && scr.htmlContent.trim()
        ? scr.htmlContent.trim()
        : `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>body{font-family:sans-serif;padding:20px;background:#f8fafc;color:#0f172a}h2{color:${escapeHtml(visualTokens.primaryColor)}}</style></head><body><h2>${escapeHtml(rawTitle)}</h2><p>${escapeHtml(rawPurpose)}</p></body></html>`;

    return {
      id,
      title: rawTitle,
      name: rawTitle,
      route,
      role: rawRole,
      primaryRole: rawRole,
      purpose: rawPurpose,
      summary: rawPurpose,
      layoutType,
      kpis,
      sections,
      actions,
      htmlContent,
    };
  });

  const navigationMap: DesignNavigationItem[] =
    Array.isArray(obj.navigationMap) && obj.navigationMap.length > 0
      ? obj.navigationMap.map((n: any, idx: number) => ({
          id: String(n?.id || `nav-${idx + 1}`),
          label: String(n?.label || screenInventory[idx]?.title || `قائمة ${idx + 1}`),
          route: String(n?.route || screenInventory[idx]?.route || `/screen-${idx + 1}`),
          targetScreenId: String(n?.targetScreenId || screenInventory[idx]?.id || screenInventory[0].id),
          role: String(n?.role || screenInventory[idx]?.role || 'الكل'),
        }))
      : screenInventory.map((scr, idx) => ({
          id: `nav-${idx + 1}`,
          label: scr.title,
          route: scr.route,
          targetScreenId: scr.id,
          role: scr.role,
        }));

  const rawComponentsList =
    Array.isArray(obj.componentInventory) && obj.componentInventory.length > 0
      ? obj.componentInventory
      : Array.isArray(obj.components) && obj.components.length > 0
      ? obj.components
      : [];

  const componentInventory: DesignComponentItem[] =
    rawComponentsList.length > 0
      ? rawComponentsList.map((c: any, idx: number) => ({
          name: String(c?.name || `Component${idx + 1}`),
          category: String(c?.category || 'UI'),
          description: String(c?.description || ''),
          props: Array.isArray(c?.props) ? c.props.map((p: any) => String(p)) : ['title', 'data'],
        }))
      : screenInventory.map((scr) => ({
          name: `${scr.id}-view`,
          category: scr.layoutType,
          description: scr.purpose,
          props: ['items', 'onAction'],
        }));

  const userFlows: DesignUserFlow[] =
    Array.isArray(obj.userFlows) && obj.userFlows.length > 0
      ? obj.userFlows.map((uf: any, idx: number) => ({
          name: String(uf?.name || `رحلة المستخدم ${idx + 1}`),
          actor: String(uf?.actor || fallbackPrd?.userRoles?.[0] || 'المستخدم'),
          steps: Array.isArray(uf?.steps) ? uf.steps.map((s: any) => String(s)) : [],
        }))
      : (fallbackPrd?.userJourneys || ['الدخول للنظام وإتمام العملية الأساسية']).map((j, idx) => ({
          name: `تدفق ${idx + 1}`,
          actor: fallbackPrd?.userRoles?.[0] || 'المستخدم',
          steps: [j],
        }));

  const formDefinitions: DesignFormDefinition[] = Array.isArray(obj.formDefinitions)
    ? obj.formDefinitions.map((frm: any, idx: number) => ({
        id: String(frm?.id || `form-${idx + 1}`),
        title: String(frm?.title || `نموذج إدخال ${idx + 1}`),
        screenId: String(frm?.screenId || screenInventory[0].id),
        submitLabel: String(frm?.submitLabel || 'حفظ وإرسال'),
        fields: Array.isArray(frm?.fields)
          ? frm.fields.map((fld: any, fIdx: number) => ({
              name: String(fld?.name || `field_${fIdx + 1}`),
              label: String(fld?.label || `حقل ${fIdx + 1}`),
              type: (['text', 'email', 'tel', 'date', 'time', 'select', 'textarea', 'number'].includes(fld?.type)
                ? fld.type
                : 'text') as DesignFormField['type'],
              required: Boolean(fld?.required ?? true),
              placeholder: fld?.placeholder ? String(fld.placeholder) : undefined,
              options: Array.isArray(fld?.options) ? fld.options.map((o: any) => String(o)) : undefined,
            }))
          : [],
      }))
    : [];

  const rawSpec = obj.designSpecification && typeof obj.designSpecification === 'object' ? obj.designSpecification : {};
  const designSpecification = {
    direction: (rawSpec.direction === 'ltr' ? 'ltr' : 'rtl') as 'rtl' | 'ltr',
    primaryLanguage: String(rawSpec.primaryLanguage || 'ar'),
    designSystem: String(rawSpec.designSystem || 'Tailwind CSS RTL + Stitch Design Tokens'),
    preferredPlatform: String(rawSpec.preferredPlatform || 'Responsive Web Application'),
    layoutStructure: String(
      rawSpec.layoutStructure || 'شريط تنقل علوي وقائمة جانبية يمنى مع بطاقات محتوى متجاوبة'
    ),
    responsiveBehavior: String(
      rawSpec.responsiveBehavior || 'دعم كامل لشاشات سطح المكتب والأجهزة اللوحية والهواتف الذكية'
    ),
    uiPreferences: Array.isArray(rawSpec.uiPreferences)
      ? rawSpec.uiPreferences.map((p: any) => String(p))
      : ['واجهة عربية RTL', 'بطاقات واضحة', 'تباين لوني مريح'],
  };

  // Generate UI source files if not provided or enrich them
  let uiFiles: DesignUIFile[] = [];
  if (Array.isArray(obj.uiFiles) && obj.uiFiles.length > 0) {
    uiFiles = obj.uiFiles
      .filter((f: any) => f && typeof f.path === 'string' && typeof f.content === 'string')
      .map((f: any) => ({
        path: String(f.path).replace(/^\/+/, '').replace(/\.\./g, ''),
        content: String(f.content),
        fileType: String(f.fileType || 'tsx'),
        screenId: f.screenId ? String(f.screenId) : undefined,
      }));
  }

  if (uiFiles.length === 0) {
    uiFiles = screenInventory.map((scr) => {
      const safeFile = scr.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const formsForScreen = formDefinitions.filter((f) => f.screenId === scr.id);
      return {
        path: `src/screens/${safeFile}.tsx`,
        content: generateScreenComponentSource(projectName, scr, formsForScreen, visualTokens),
        fileType: 'tsx',
        screenId: scr.id,
      };
    });
  }

  const baseArtifact: Omit<DesignArtifact, 'previewMetadata'> = {
    projectName,
    designSummary,
    basedOnPrdVersion: Number(obj.basedOnPrdVersion || basedOnPrdVersion || 1),
    designSpecification,
    visualTokens,
    navigationMap,
    screenInventory,
    screens: screenInventory,
    componentInventory,
    components: componentInventory,
    userFlows,
    formDefinitions,
    uiFiles,
  };

  const isolatedPreviewHtml = buildIsolatedDesignPreviewHtml(baseArtifact);
  for (const scr of screenInventory) {
    if (!scr.htmlContent || scr.htmlContent.includes('<!DOCTYPE html><html dir="rtl" lang="ar"><head>')) {
      scr.htmlContent = isolatedPreviewHtml;
    }
  }

  return {
    valid: true,
    errors: [],
    artifact: {
      ...baseArtifact,
      previewMetadata: {
        defaultScreenId: screenInventory[0].id,
        supportedViewports: ['desktop', 'tablet', 'mobile'],
        isolatedPreviewHtml,
      },
    },
  };
}
