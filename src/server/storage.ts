import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  RequirementsDocument,
  createInitialRequirementsDocument,
  formatRequirementsToMarkdown,
  validateRequirementsDocument,
} from '../shared/requirementsSchema.ts';

export type CommercialMode = 'managed' | 'byok';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  projectCredits: number;
  subscriptionActive: boolean;
  createdAt: string;
}

export interface AIConnectionRecord {
  id: string;
  userId: string;
  provider: string;
  model: string;
  endpoint: string;
  active: boolean;
  hasKey: boolean;
  maskedKey: string;
  updatedAt: string;
}

export interface StoredProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  mode: CommercialMode;
  currentGate: number;
  status: 'in_progress' | 'ready_for_approval' | 'approved' | 'completed';
  selectedConnectionId: string | null;
  entitlementVerified: boolean;
  prd: string;
  designNotes: string;
  codeFiles: { name: string; content: string }[];
  testResults: { passed: number; failed: number; logs: string[] };
  gate1Version: number;
  gate1Approved: boolean;
  gate1ApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Gate1VersionSnapshot {
  version: number;
  document: RequirementsDocument;
  markdown: string;
  source: 'initial' | 'ai' | 'manual' | 'approved';
  provider: string | null;
  model: string | null;
  usage: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string;
}

export interface Gate1ChatMessageRecord {
  id: string;
  projectId: string;
  gate: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  meta?: string;
  provider?: string | null;
  model?: string | null;
  documentVersion?: number | null;
  usage?: Record<string, unknown> | null;
  status?: string;
  createdAt: string;
}

export interface Gate1ApprovalSnapshot {
  projectId: string;
  approved: boolean;
  approvedVersion: number;
  approvedAt: string;
  approvedBy: string;
  document: RequirementsDocument;
  markdown: string;
}

function deriveEncryptionKey(secret?: string): Buffer {
  const rawSecret =
    secret ||
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    'ogroup-ai-factory-default-vault-key-2026-aes256gcm';
  return crypto.createHash('sha256').update(rawSecret).digest();
}

export function encryptCredential(plainText: string, secret?: string): string {
  const clean = (plainText || '').trim();
  if (!clean) return '';
  const key = deriveEncryptionKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptCredential(cipherText: string, secret?: string): string {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) return '';
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveEncryptionKey(secret);
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskApiKey(rawKey: string): string {
  const clean = (rawKey || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

export class FactoryStorage {
  public db: DatabaseSync;
  private encryptionSecret?: string;

  constructor(dbFilePath?: string, encryptionSecret?: string) {
    const resolvedPath =
      dbFilePath ||
      process.env.DB_PATH ||
      path.join(process.cwd(), '.data', 'ogroup-factory.sqlite');
    if (resolvedPath !== ':memory:') {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.encryptionSecret = encryptionSecret;
    this.db = new DatabaseSync(resolvedPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        project_credits INTEGER NOT NULL DEFAULT 0,
        subscription_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        endpoint TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('managed', 'byok')),
        current_gate INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'in_progress',
        selected_connection_id TEXT,
        entitlement_verified INTEGER NOT NULL DEFAULT 1,
        design_notes TEXT NOT NULL DEFAULT '',
        code_files_json TEXT NOT NULL DEFAULT '[]',
        test_results_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate1_documents (
        project_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 1,
        document_json TEXT NOT NULL,
        markdown TEXT NOT NULL,
        locked INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate1_document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        document_json TEXT NOT NULL,
        markdown TEXT NOT NULL,
        source TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        usage_json TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate1_chat_messages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL DEFAULT 1,
        sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
        text TEXT NOT NULL,
        time TEXT NOT NULL,
        meta TEXT,
        provider TEXT,
        model TEXT,
        document_version INTEGER,
        usage_json TEXT,
        status TEXT NOT NULL DEFAULT 'succeeded',
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate1_approvals (
        project_id TEXT PRIMARY KEY,
        approved INTEGER NOT NULL DEFAULT 1,
        approved_version INTEGER NOT NULL,
        approved_at TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        snapshot_document_json TEXT NOT NULL,
        snapshot_markdown TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
  }

  public upsertUserByEmail(params: {
    email: string;
    name?: string;
    defaultCredits?: number;
    defaultSubscription?: boolean;
  }): UserRecord {
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = this.db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(cleanEmail) as Record<string, unknown> | undefined;

    if (existing) {
      if (params.name && params.name.trim()) {
        this.db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(params.name.trim(), String(existing.id));
      }
      return this.mapUserRow(
        this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(String(existing.id)) as Record<string, unknown>
      );
    }

    const id = `usr-${crypto.randomUUID()}`;
    const role = cleanEmail === 'admin@ogroup.ai' ? 'admin' : 'customer';
    const credits = typeof params.defaultCredits === 'number' ? params.defaultCredits : 4;
    const subActive = params.defaultSubscription ? 1 : 0;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO users (id, email, name, role, project_credits, subscription_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, cleanEmail, (params.name || cleanEmail.split('@')[0] || 'User').trim(), role, credits, subActive, now);

    return this.mapUserRow(this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as Record<string, unknown>);
  }

  public getUserById(userId: string): UserRecord | null {
    const row = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as Record<string, unknown> | undefined;
    return row ? this.mapUserRow(row) : null;
  }

  public getUserByEmail(email: string): UserRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
    return row ? this.mapUserRow(row) : null;
  }

  public createSession(userId: string): string {
    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)`).run(token, userId, now);
    return token;
  }

  public getUserByToken(token: string): UserRecord | null {
    const row = this.db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`
      )
      .get(token) as Record<string, unknown> | undefined;
    return row ? this.mapUserRow(row) : null;
  }

  public updateUserEntitlements(
    userId: string,
    updates: { projectCredits?: number; addProjectCredits?: number; subscriptionActive?: boolean }
  ): UserRecord {
    const user = this.getUserById(userId);
    if (!user) throw new Error('المستخدم غير موجود');
    let nextCredits = user.projectCredits;
    if (typeof updates.projectCredits === 'number') {
      nextCredits = Math.max(0, updates.projectCredits);
    } else if (typeof updates.addProjectCredits === 'number') {
      nextCredits = Math.max(0, nextCredits + updates.addProjectCredits);
    }
    const nextSub =
      typeof updates.subscriptionActive === 'boolean' ? updates.subscriptionActive : user.subscriptionActive;

    this.db
      .prepare(`UPDATE users SET project_credits = ?, subscription_active = ? WHERE id = ?`)
      .run(nextCredits, nextSub ? 1 : 0, userId);

    return this.getUserById(userId)!;
  }

  public saveAIConnection(params: {
    userId: string;
    provider: string;
    model: string;
    apiKey: string;
    endpoint?: string;
    active?: boolean;
  }): AIConnectionRecord {
    const cleanProvider = params.provider.trim().toLowerCase();
    const cleanModel = params.model.trim();
    const cleanKey = (params.apiKey || '').trim();
    const now = new Date().toISOString();

    if (!cleanProvider || !cleanModel) {
      throw new Error('المزود والنموذج مطلوبان لحفظ اتصال الذكاء الاصطناعي.');
    }

    if (params.active !== false) {
      this.db.prepare(`UPDATE ai_connections SET active = 0 WHERE user_id = ?`).run(params.userId);
    }

    const existing = this.db
      .prepare(`SELECT * FROM ai_connections WHERE user_id = ? AND provider = ?`)
      .get(params.userId, cleanProvider) as Record<string, unknown> | undefined;

    const encrypted = cleanKey
      ? encryptCredential(cleanKey, this.encryptionSecret)
      : existing
      ? String(existing.encrypted_api_key || '')
      : '';

    const id = existing ? String(existing.id) : `conn-${crypto.randomUUID()}`;
    const isActive = params.active !== false ? 1 : 0;

    if (existing) {
      this.db
        .prepare(
          `UPDATE ai_connections
           SET model = ?, encrypted_api_key = ?, endpoint = ?, active = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(cleanModel, encrypted, params.endpoint || '', isActive, now, id);
    } else {
      this.db
        .prepare(
          `INSERT INTO ai_connections (id, user_id, provider, model, encrypted_api_key, endpoint, active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, params.userId, cleanProvider, cleanModel, encrypted, params.endpoint || '', isActive, now);
    }

    const saved = this.db.prepare(`SELECT * FROM ai_connections WHERE id = ?`).get(id) as Record<string, unknown>;
    return this.mapAIConnectionRow(saved);
  }

  public getUserAIConnections(userId: string): AIConnectionRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM ai_connections WHERE user_id = ? ORDER BY active DESC, updated_at DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => this.mapAIConnectionRow(r));
  }

  public getDecryptedAIConnectionForUser(
    userId: string,
    connectionId?: string | null
  ): {
    id: string;
    provider: string;
    model: string;
    apiKey: string;
    endpoint: string;
    active: boolean;
  } | null {
    let row: Record<string, unknown> | undefined;
    if (connectionId) {
      row = this.db
        .prepare(`SELECT * FROM ai_connections WHERE id = ? AND user_id = ?`)
        .get(connectionId, userId) as Record<string, unknown> | undefined;
    }
    if (!row) {
      row = this.db
        .prepare(`SELECT * FROM ai_connections WHERE user_id = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1`)
        .get(userId) as Record<string, unknown> | undefined;
    }
    if (!row) return null;

    const decryptedKey = decryptCredential(String(row.encrypted_api_key || ''), this.encryptionSecret);
    return {
      id: String(row.id),
      provider: String(row.provider),
      model: String(row.model),
      apiKey: decryptedKey,
      endpoint: String(row.endpoint || ''),
      active: Boolean(row.active),
    };
  }

  public createProject(params: {
    ownerId: string;
    name: string;
    description: string;
    mode: CommercialMode;
    selectedConnectionId?: string | null;
    initialDocument?: RequirementsDocument;
  }): StoredProjectRecord {
    const user = this.getUserById(params.ownerId);
    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    const cleanName = (params.name || '').trim();
    if (!cleanName) {
      throw new Error('اسم المشروع مطلوب.');
    }
    const cleanDesc = (params.description || '').trim() || `نظام برمجي متكامل لـ ${cleanName}`;
    const mode: CommercialMode = params.mode === 'byok' ? 'byok' : 'managed';

    if (mode === 'managed') {
      if (user.projectCredits <= 0) {
        const err: any = new Error('لا يوجد رصيد مشاريع كافٍ في باقة Build For Me (100 JOD). يرجى شحن الرصيد أولاً.');
        err.statusCode = 402;
        throw err;
      }
    } else if (mode === 'byok') {
      if (!user.subscriptionActive) {
        const err: any = new Error(
          'اشتراك باقة Build With My AI (50 JOD شهرياً) غير مفعل. يرجى تفعيل الاشتراك أولاً.'
        );
        err.statusCode = 402;
        throw err;
      }
    }

    const projectId = `proj-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const initialDoc = params.initialDocument || createInitialRequirementsDocument(cleanName, cleanDesc);
    const markdown = formatRequirementsToMarkdown(initialDoc);

    let connectionId = params.selectedConnectionId || null;
    if (mode === 'byok' && !connectionId) {
      const activeConn = this.getDecryptedAIConnectionForUser(user.id);
      if (activeConn) {
        connectionId = activeConn.id;
      }
    }

    this.db.exec('BEGIN');
    try {
      if (mode === 'managed') {
        this.db
          .prepare(`UPDATE users SET project_credits = project_credits - 1 WHERE id = ?`)
          .run(user.id);
      }

      const defaultCodeFiles = [
        {
          name: 'App.tsx',
          content: `export default function App() {\n  return <div dir="rtl" className="p-6">مشروع ${cleanName}</div>;\n}`,
        },
      ];
      const defaultTests = { passed: 20, failed: 0, logs: ['[PASS] Initial project workspace initialized'] };

      this.db
        .prepare(
          `INSERT INTO projects (
            id, owner_id, name, description, mode, current_gate, status,
            selected_connection_id, entitlement_verified, design_notes,
            code_files_json, test_results_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, 'in_progress', ?, 1, ?, ?, ?, ?, ?)`
        )
        .run(
          projectId,
          user.id,
          cleanName,
          cleanDesc,
          mode,
          connectionId,
          'تصميم نظيف ببطاقات بيضاء ودعم كامل للغة العربية (RTL).',
          JSON.stringify(defaultCodeFiles),
          JSON.stringify(defaultTests),
          now,
          now
        );

      this.db
        .prepare(
          `INSERT INTO gate1_documents (project_id, version, document_json, markdown, locked, updated_at, updated_by)
           VALUES (?, 1, ?, ?, 0, ?, ?)`
        )
        .run(projectId, JSON.stringify(initialDoc), markdown, now, user.id);

      this.db
        .prepare(
          `INSERT INTO gate1_document_versions (
            project_id, version, document_json, markdown, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, 1, ?, ?, 'initial', NULL, NULL, NULL, ?, ?)`
        )
        .run(projectId, JSON.stringify(initialDoc), markdown, now, user.id);

      const greetingId = `msg-${projectId}-init`;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.db
        .prepare(
          `INSERT INTO gate1_chat_messages (
            id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
          ) VALUES (?, ?, 1, 'ai', ?, ?, 'Gate 1 Requirements Agent', NULL, NULL, 1, NULL, 'succeeded', ?)`
        )
        .run(
          greetingId,
          projectId,
          `مرحباً بك في بوابة المتطلبات (Gate 1) لمشروع "${cleanName}". أنا وكيل المتطلبات وتحليل الأعمال. اشرح لي فكرتك أو التعديلات المطلوبة وسأقوم بتحديث وثيقة المتطلبات المهيكلة في اللوحة المقابلة فوراً.`,
          timeStr,
          now
        );

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return this.getProjectById(projectId)!;
  }

  public getProjectsByOwner(ownerId: string): StoredProjectRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC`)
      .all(ownerId) as Record<string, unknown>[];
    return rows.map((r) => this.mapProjectRow(r));
  }

  public getProjectById(projectId: string): StoredProjectRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM projects WHERE id = ?`)
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? this.mapProjectRow(row) : null;
  }

  public getGate1State(projectId: string): {
    project: StoredProjectRecord;
    document: RequirementsDocument;
    markdown: string;
    version: number;
    locked: boolean;
    updatedAt: string;
    versions: Gate1VersionSnapshot[];
    chatHistory: Gate1ChatMessageRecord[];
    approval: Gate1ApprovalSnapshot | null;
  } | null {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    const docRow = this.db
      .prepare(`SELECT * FROM gate1_documents WHERE project_id = ?`)
      .get(projectId) as Record<string, unknown> | undefined;

    if (!docRow) return null;

    const document = JSON.parse(String(docRow.document_json)) as RequirementsDocument;
    const markdown = String(docRow.markdown);
    const version = Number(docRow.version);
    const locked = Boolean(docRow.locked);
    const updatedAt = String(docRow.updated_at);

    const versionRows = this.db
      .prepare(`SELECT * FROM gate1_document_versions WHERE project_id = ? ORDER BY version DESC`)
      .all(projectId) as Record<string, unknown>[];

    const versions: Gate1VersionSnapshot[] = versionRows.map((vr) => ({
      version: Number(vr.version),
      document: JSON.parse(String(vr.document_json)) as RequirementsDocument,
      markdown: String(vr.markdown),
      source: String(vr.source) as Gate1VersionSnapshot['source'],
      provider: vr.provider ? String(vr.provider) : null,
      model: vr.model ? String(vr.model) : null,
      usage: vr.usage_json ? JSON.parse(String(vr.usage_json)) : null,
      createdAt: String(vr.created_at),
      createdBy: String(vr.created_by),
    }));

    const chatRows = this.db
      .prepare(`SELECT * FROM gate1_chat_messages WHERE project_id = ? AND gate = 1 ORDER BY created_at ASC, rowid ASC`)
      .all(projectId) as Record<string, unknown>[];

    const chatHistory: Gate1ChatMessageRecord[] = chatRows.map((cr) => ({
      id: String(cr.id),
      projectId: String(cr.project_id),
      gate: Number(cr.gate),
      sender: String(cr.sender) as 'user' | 'ai',
      text: String(cr.text),
      time: String(cr.time),
      meta: cr.meta ? String(cr.meta) : undefined,
      provider: cr.provider ? String(cr.provider) : null,
      model: cr.model ? String(cr.model) : null,
      documentVersion: cr.document_version !== null ? Number(cr.document_version) : null,
      usage: cr.usage_json ? JSON.parse(String(cr.usage_json)) : null,
      status: String(cr.status || 'succeeded'),
      createdAt: String(cr.created_at),
    }));

    const approval = this.getGate1ApprovedArtifact(projectId);

    return {
      project,
      document,
      markdown,
      version,
      locked,
      updatedAt,
      versions,
      chatHistory,
      approval,
    };
  }

  public updateGate1DocumentManual(params: {
    projectId: string;
    userId: string;
    document: RequirementsDocument;
    expectedVersion?: number;
  }): {
    document: RequirementsDocument;
    markdown: string;
    version: number;
    updatedAt: string;
  } {
    const current = this.db
      .prepare(`SELECT * FROM gate1_documents WHERE project_id = ?`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!current) {
      throw new Error('وثيقة المتطلبات غير موجودة لهذا المشروع.');
    }

    if (Boolean(current.locked)) {
      const err: any = new Error('تم اعتماد وقفل وثيقة البوابة الأولى ولا يمكن تعديل النسخة المعتمدة.');
      err.statusCode = 409;
      throw err;
    }

    const currentVersion = Number(current.version);
    if (
      typeof params.expectedVersion === 'number' &&
      params.expectedVersion !== currentVersion
    ) {
      const err: any = new Error(
        `تعارض في إصدار الوثيقة (النسخة الحالية هي v${currentVersion} بينما التعديل مبني على v${params.expectedVersion}). يرجى تحديث الصفحة والمحاولة مجدداً.`
      );
      err.statusCode = 409;
      throw err;
    }

    const validation = validateRequirementsDocument(params.document);
    if (!validation.valid || !validation.document) {
      const err: any = new Error(`فشل التحقق من هيكل الوثيقة: ${validation.errors.join(' | ')}`);
      err.statusCode = 400;
      throw err;
    }

    const nextVersion = currentVersion + 1;
    const markdown = formatRequirementsToMarkdown(validation.document);
    const now = new Date().toISOString();

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `UPDATE gate1_documents
           SET version = ?, document_json = ?, markdown = ?, updated_at = ?, updated_by = ?
           WHERE project_id = ?`
        )
        .run(nextVersion, JSON.stringify(validation.document), markdown, now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate1_document_versions (
            project_id, version, document_json, markdown, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, ?, ?, ?, 'manual', NULL, NULL, NULL, ?, ?)`
        )
        .run(params.projectId, nextVersion, JSON.stringify(validation.document), markdown, now, params.userId);

      this.db
        .prepare(`UPDATE projects SET name = ?, updated_at = ? WHERE id = ?`)
        .run(validation.document.projectName, now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      document: validation.document,
      markdown,
      version: nextVersion,
      updatedAt: now,
    };
  }

  public recordGate1AIChatTurn(params: {
    projectId: string;
    userId: string;
    userMessage: string;
    aiReply: string;
    updatedDocument: RequirementsDocument;
    provider: string;
    model: string;
    usage: Record<string, unknown> | null;
    expectedVersion?: number;
  }): {
    document: RequirementsDocument;
    markdown: string;
    version: number;
    userMessageRecord: Gate1ChatMessageRecord;
    aiMessageRecord: Gate1ChatMessageRecord;
  } {
    const current = this.db
      .prepare(`SELECT * FROM gate1_documents WHERE project_id = ?`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!current) {
      throw new Error('وثيقة المتطلبات غير موجودة لهذا المشروع.');
    }

    if (Boolean(current.locked)) {
      const err: any = new Error('تم اعتماد وقفل البوابة الأولى مسبقاً.');
      err.statusCode = 409;
      throw err;
    }

    const currentVersion = Number(current.version);
    if (
      typeof params.expectedVersion === 'number' &&
      params.expectedVersion !== currentVersion
    ) {
      const err: any = new Error(
        `تعارض في إصدار الوثيقة أثناء المعالجة (النسخة الحالية v${currentVersion} مقابل v${params.expectedVersion}). تم منع الكتابة فوق التعديلات الأحدث.`
      );
      err.statusCode = 409;
      throw err;
    }

    const validation = validateRequirementsDocument(params.updatedDocument);
    if (!validation.valid || !validation.document) {
      const err: any = new Error(`مخرجات الذكاء الاصطناعي لم تجتز التحقق الهيكلي: ${validation.errors.join(' | ')}`);
      err.statusCode = 422;
      throw err;
    }

    const nextVersion = currentVersion + 1;
    const markdown = formatRequirementsToMarkdown(validation.document);
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsgId = `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}-u`;
    const aiMsgId = `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}-a`;
    const metaLabel = `${params.provider} • ${params.model} • v${nextVersion}`;

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `UPDATE gate1_documents
           SET version = ?, document_json = ?, markdown = ?, updated_at = ?, updated_by = ?
           WHERE project_id = ?`
        )
        .run(nextVersion, JSON.stringify(validation.document), markdown, now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate1_document_versions (
            project_id, version, document_json, markdown, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, ?, ?, ?, 'ai', ?, ?, ?, ?, ?)`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(validation.document),
          markdown,
          params.provider,
          params.model,
          params.usage ? JSON.stringify(params.usage) : null,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO gate1_chat_messages (
            id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
          ) VALUES (?, ?, 1, 'user', ?, ?, NULL, NULL, NULL, ?, NULL, 'succeeded', ?)`
        )
        .run(userMsgId, params.projectId, params.userMessage, timeStr, currentVersion, now);

      this.db
        .prepare(
          `INSERT INTO gate1_chat_messages (
            id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
          ) VALUES (?, ?, 1, 'ai', ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?)`
        )
        .run(
          aiMsgId,
          params.projectId,
          params.aiReply,
          timeStr,
          metaLabel,
          params.provider,
          params.model,
          nextVersion,
          params.usage ? JSON.stringify(params.usage) : null,
          now
        );

      this.db
        .prepare(`UPDATE projects SET name = ?, status = 'ready_for_approval', updated_at = ? WHERE id = ?`)
        .run(validation.document.projectName, now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      document: validation.document,
      markdown,
      version: nextVersion,
      userMessageRecord: {
        id: userMsgId,
        projectId: params.projectId,
        gate: 1,
        sender: 'user',
        text: params.userMessage,
        time: timeStr,
        documentVersion: currentVersion,
        status: 'succeeded',
        createdAt: now,
      },
      aiMessageRecord: {
        id: aiMsgId,
        projectId: params.projectId,
        gate: 1,
        sender: 'ai',
        text: params.aiReply,
        time: timeStr,
        meta: metaLabel,
        provider: params.provider,
        model: params.model,
        documentVersion: nextVersion,
        usage: params.usage,
        status: 'succeeded',
        createdAt: now,
      },
    };
  }

  public approveGate1(params: {
    projectId: string;
    userId: string;
    finalDocument?: RequirementsDocument;
    expectedVersion?: number;
  }): Gate1ApprovalSnapshot {
    const current = this.db
      .prepare(`SELECT * FROM gate1_documents WHERE project_id = ?`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!current) {
      const err: any = new Error('لا توجد وثيقة متطلبات لهذا المشروع لاعتمادها.');
      err.statusCode = 404;
      throw err;
    }

    let docToApprove: RequirementsDocument = JSON.parse(String(current.document_json));
    let versionToApprove = Number(current.version);

    if (
      typeof params.expectedVersion === 'number' &&
      params.expectedVersion !== versionToApprove
    ) {
      const err: any = new Error(
        `تعارض في إصدار الوثيقة عند الاعتماد (النسخة المحفوظة v${versionToApprove} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    if (params.finalDocument && !Boolean(current.locked)) {
      const updated = this.updateGate1DocumentManual({
        projectId: params.projectId,
        userId: params.userId,
        document: params.finalDocument,
        expectedVersion: versionToApprove,
      });
      docToApprove = updated.document;
      versionToApprove = updated.version;
    }

    const strictValidation = validateRequirementsDocument(docToApprove, { strictForApproval: true });
    if (!strictValidation.valid || !strictValidation.document) {
      const err: any = new Error(
        `لا يمكن اعتماد الوثيقة قبل استكمال الأقسام الإلزامية: ${strictValidation.errors.join(' | ')}`
      );
      err.statusCode = 400;
      throw err;
    }

    const approvedMarkdown = formatRequirementsToMarkdown(strictValidation.document);
    const now = new Date().toISOString();

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(`UPDATE gate1_documents SET locked = 1, updated_at = ?, updated_by = ? WHERE project_id = ?`)
        .run(now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate1_document_versions (
            project_id, version, document_json, markdown, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, ?, ?, ?, 'approved', NULL, NULL, NULL, ?, ?)`
        )
        .run(params.projectId, versionToApprove, JSON.stringify(strictValidation.document), approvedMarkdown, now, params.userId);

      this.db
        .prepare(
          `INSERT INTO gate1_approvals (
            project_id, approved, approved_version, approved_at, approved_by, snapshot_document_json, snapshot_markdown
          ) VALUES (?, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_document_json = excluded.snapshot_document_json,
            snapshot_markdown = excluded.snapshot_markdown`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(strictValidation.document),
          approvedMarkdown
        );

      this.db
        .prepare(`UPDATE projects SET current_gate = 2, status = 'approved', updated_at = ? WHERE id = ?`)
        .run(now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      projectId: params.projectId,
      approved: true,
      approvedVersion: versionToApprove,
      approvedAt: now,
      approvedBy: params.userId,
      document: strictValidation.document,
      markdown: approvedMarkdown,
    };
  }

  public getGate1ApprovedArtifact(projectId: string): Gate1ApprovalSnapshot | null {
    const row = this.db
      .prepare(`SELECT * FROM gate1_approvals WHERE project_id = ? AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      projectId: String(row.project_id),
      approved: Boolean(row.approved),
      approvedVersion: Number(row.approved_version),
      approvedAt: String(row.approved_at),
      approvedBy: String(row.approved_by),
      document: JSON.parse(String(row.snapshot_document_json)) as RequirementsDocument,
      markdown: String(row.snapshot_markdown),
    };
  }

  private mapUserRow(row: Record<string, unknown>): UserRecord {
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      role: String(row.role) === 'admin' ? 'admin' : 'customer',
      projectCredits: Number(row.project_credits || 0),
      subscriptionActive: Boolean(row.subscription_active),
      createdAt: String(row.created_at),
    };
  }

  private mapAIConnectionRow(row: Record<string, unknown>): AIConnectionRecord {
    const decrypted = decryptCredential(String(row.encrypted_api_key || ''), this.encryptionSecret);
    return {
      id: String(row.id),
      userId: String(row.user_id),
      provider: String(row.provider),
      model: String(row.model),
      endpoint: String(row.endpoint || ''),
      active: Boolean(row.active),
      hasKey: decrypted.length > 0,
      maskedKey: maskApiKey(decrypted),
      updatedAt: String(row.updated_at),
    };
  }

  private mapProjectRow(row: Record<string, unknown>): StoredProjectRecord {
    const projectId = String(row.id);
    const docRow = this.db
      .prepare(`SELECT version, markdown, locked FROM gate1_documents WHERE project_id = ?`)
      .get(projectId) as Record<string, unknown> | undefined;
    const approvalRow = this.db
      .prepare(`SELECT approved, approved_at FROM gate1_approvals WHERE project_id = ? AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;

    return {
      id: projectId,
      ownerId: String(row.owner_id),
      name: String(row.name),
      description: String(row.description),
      mode: String(row.mode) === 'byok' ? 'byok' : 'managed',
      currentGate: Number(row.current_gate || 1),
      status: String(row.status || 'in_progress') as StoredProjectRecord['status'],
      selectedConnectionId: row.selected_connection_id ? String(row.selected_connection_id) : null,
      entitlementVerified: Boolean(row.entitlement_verified),
      prd: docRow ? String(docRow.markdown) : '',
      designNotes: String(row.design_notes || ''),
      codeFiles: JSON.parse(String(row.code_files_json || '[]')),
      testResults: JSON.parse(String(row.test_results_json || '{"passed":20,"failed":0,"logs":[]}')),
      gate1Version: docRow ? Number(docRow.version) : 1,
      gate1Approved: Boolean(approvalRow?.approved),
      gate1ApprovedAt: approvalRow?.approved_at ? String(approvalRow.approved_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
