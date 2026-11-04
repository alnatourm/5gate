import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  type RequirementsDocument,
  createInitialRequirementsDocument,
  formatRequirementsToMarkdown,
  validateRequirementsDocument,
} from '../shared/requirementsSchema.ts';
import { type DesignArtifact, validateDesignArtifact } from '../shared/designSchema.ts';
import {
  type CodeArtifact,
  type GeneratedProjectFile,
  validateCodeArtifact,
  validateRelativeFilePath,
} from '../shared/codeSchema.ts';
import type { QAReportArtifact } from './qaRunner.ts';
import type { DeliveryArtifact } from './deliveryPackager.ts';

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
  assignedGate?: number | null;
  hasKey: boolean;
  maskedKey: string;
  updatedAt: string;
}

export interface GateApprovalSummary {
  gate: number;
  approved: boolean;
  approvedVersion: number;
  approvedAt: string | null;
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
  codeFiles: { name: string; path?: string; content: string; fileType?: string; version?: number }[];
  testResults: {
    status?: string;
    passed: number;
    failed: number;
    skipped?: number;
    executed?: number;
    buildSucceeded?: boolean;
    testedCodeVersion?: number;
    logs: string[];
  };
  gate1Version: number;
  gate1Approved: boolean;
  gate1ApprovedAt: string | null;
  gate2Version?: number;
  gate2Approved?: boolean;
  gate2ApprovedAt?: string | null;
  gate3Version?: number;
  gate3Approved?: boolean;
  gate3ApprovedAt?: string | null;
  gate4Version?: number;
  gate4Approved?: boolean;
  gate4ApprovedAt?: string | null;
  gate5Version?: number;
  gate5Approved?: boolean;
  gate5ApprovedAt?: string | null;
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

export interface GateRunRecord {
  runId: string;
  projectId: string;
  gate: number;
  status: 'running' | 'succeeded' | 'failed';
  provider: string;
  configuredModel: string;
  executedModel: string | null;
  inputVersion: number | null;
  outputVersion: number | null;
  latencyMs: number;
  usage: Record<string, unknown> | null;
  errorType: string | null;
  errorMessage: string | null;
  logs: string[];
  createdAt: string;
  completedAt: string | null;
  createdBy: string;
}

export interface GenericGateVersionSnapshot<T = unknown> {
  version: number;
  artifact: T;
  summaryText: string;
  source: 'initial' | 'ai' | 'manual' | 'repair' | 'approved';
  provider: string | null;
  model: string | null;
  usage: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string;
}

export interface GenericGateApprovalSnapshot<T = unknown> {
  projectId: string;
  gate: number;
  approved: boolean;
  approvedVersion: number;
  approvedAt: string;
  approvedBy: string;
  artifact: T;
  summaryText: string;
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
        assigned_gate INTEGER,
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

      -- Shared 5-Gate Engine Tables (Section 10)
      CREATE TABLE IF NOT EXISTS gate_runs (
        run_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
        provider TEXT NOT NULL,
        configured_model TEXT NOT NULL,
        executed_model TEXT,
        input_version INTEGER,
        output_version INTEGER,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        usage_json TEXT,
        error_type TEXT,
        error_message TEXT,
        logs_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate_artifacts (
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        artifact_json TEXT NOT NULL,
        summary_text TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'ai',
        locked INTEGER NOT NULL DEFAULT 0,
        provider TEXT,
        model TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        PRIMARY KEY (project_id, gate),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate_artifact_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL,
        version INTEGER NOT NULL,
        artifact_json TEXT NOT NULL,
        summary_text TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        usage_json TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate_approvals (
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL,
        approved INTEGER NOT NULL DEFAULT 1,
        approved_version INTEGER NOT NULL,
        approved_at TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        snapshot_artifact_json TEXT NOT NULL,
        snapshot_summary TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (project_id, gate),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        gate INTEGER NOT NULL,
        version INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        file_type TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, gate, version, file_path),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS qa_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        tested_code_version INTEGER NOT NULL,
        status TEXT NOT NULL,
        executed_checks INTEGER NOT NULL DEFAULT 0,
        passed_checks INTEGER NOT NULL DEFAULT 0,
        failed_checks INTEGER NOT NULL DEFAULT 0,
        skipped_checks INTEGER NOT NULL DEFAULT 0,
        build_succeeded INTEGER NOT NULL DEFAULT 0,
        repair_attempts INTEGER NOT NULL DEFAULT 0,
        report_json TEXT NOT NULL,
        logs_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS delivery_packages (
        project_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        approved_code_version INTEGER NOT NULL,
        approved_qa_version INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        artifact_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        providers_json TEXT NOT NULL,
        agents_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Safe migration for existing databases where ai_connections might not have assigned_gate
    const cols = this.db.prepare(`PRAGMA table_info(ai_connections)`).all() as Record<string, unknown>[];
    if (!cols.some((c) => c.name === 'assigned_gate')) {
      try {
        this.db.exec(`ALTER TABLE ai_connections ADD COLUMN assigned_gate INTEGER;`);
      } catch {
        // Column already exists
      }
    }
  }

  public saveAdminConfig(providers: any[], agents: any[]) {
    const now = new Date().toISOString();
    const encryptedProviders = (Array.isArray(providers) ? providers : []).map((p) => {
      if (!p || typeof p !== 'object') return p;
      const rawKey = typeof p.apiKey === 'string' ? p.apiKey.trim() : '';
      return {
        ...p,
        apiKey: '',
        encryptedApiKey: rawKey
          ? encryptCredential(rawKey, this.encryptionSecret)
          : typeof p.encryptedApiKey === 'string'
          ? p.encryptedApiKey
          : '',
      };
    });
    const encryptedAgents = (Array.isArray(agents) ? agents : []).map((a) => {
      if (!a || typeof a !== 'object') return a;
      const rawKey = typeof a.apiKey === 'string' ? a.apiKey.trim() : '';
      return {
        ...a,
        apiKey: '',
        encryptedApiKey: rawKey
          ? encryptCredential(rawKey, this.encryptionSecret)
          : typeof a.encryptedApiKey === 'string'
          ? a.encryptedApiKey
          : '',
      };
    });
    this.db
      .prepare(
        `INSERT INTO admin_settings (id, providers_json, agents_json, updated_at)
         VALUES ('default', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           providers_json = excluded.providers_json,
           agents_json = excluded.agents_json,
           updated_at = excluded.updated_at`
      )
      .run(JSON.stringify(encryptedProviders), JSON.stringify(encryptedAgents), now);
  }

  public loadAdminConfig(): { providers: any[]; agents: any[] } | null {
    const row = this.db
      .prepare(`SELECT * FROM admin_settings WHERE id = 'default'`)
      .get() as Record<string, unknown> | undefined;
    if (!row) return null;
    try {
      const rawProviders = JSON.parse(String(row.providers_json || '[]'));
      const rawAgents = JSON.parse(String(row.agents_json || '[]'));
      const providers = (Array.isArray(rawProviders) ? rawProviders : []).map((p) => {
        if (!p || typeof p !== 'object') return p;
        let decryptedKey = '';
        if (typeof p.encryptedApiKey === 'string' && p.encryptedApiKey.trim()) {
          try {
            decryptedKey = decryptCredential(p.encryptedApiKey, this.encryptionSecret);
          } catch {
            decryptedKey = '';
          }
        } else if (typeof p.apiKey === 'string' && p.apiKey.trim()) {
          decryptedKey = p.apiKey.trim();
        }
        const { encryptedApiKey, ...rest } = p;
        return {
          ...rest,
          apiKey: decryptedKey,
        };
      });
      const agents = (Array.isArray(rawAgents) ? rawAgents : []).map((a) => {
        if (!a || typeof a !== 'object') return a;
        let decryptedKey = '';
        if (typeof a.encryptedApiKey === 'string' && a.encryptedApiKey.trim()) {
          try {
            decryptedKey = decryptCredential(a.encryptedApiKey, this.encryptionSecret);
          } catch {
            decryptedKey = '';
          }
        } else if (typeof a.apiKey === 'string' && a.apiKey.trim()) {
          decryptedKey = a.apiKey.trim();
        }
        const { encryptedApiKey, ...rest } = a;
        return {
          ...rest,
          apiKey: decryptedKey,
        };
      });
      return { providers, agents };
    } catch {
      return null;
    }
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
    assignedGate?: number | null;
  }): AIConnectionRecord {
    const cleanProvider = params.provider.trim().toLowerCase();
    const cleanModel = params.model.trim();
    const cleanKey = (params.apiKey || '').trim();
    const now = new Date().toISOString();
    const assignedGate = typeof params.assignedGate === 'number' ? params.assignedGate : null;

    if (!cleanProvider || !cleanModel) {
      throw new Error('المزود والنموذج مطلوبان لحفظ اتصال الذكاء الاصطناعي.');
    }

    if (params.active !== false && !assignedGate) {
      this.db
        .prepare(`UPDATE ai_connections SET active = 0 WHERE user_id = ? AND assigned_gate IS NULL`)
        .run(params.userId);
    }

    const existing = this.db
      .prepare(
        `SELECT * FROM ai_connections
         WHERE user_id = ? AND provider = ? AND (assigned_gate IS ? OR assigned_gate = ?)`
      )
      .get(params.userId, cleanProvider, assignedGate, assignedGate) as Record<string, unknown> | undefined;

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
           SET model = ?, encrypted_api_key = ?, endpoint = ?, active = ?, assigned_gate = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(cleanModel, encrypted, params.endpoint || '', isActive, assignedGate, now, id);
    } else {
      this.db
        .prepare(
          `INSERT INTO ai_connections (id, user_id, provider, model, encrypted_api_key, endpoint, active, assigned_gate, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, params.userId, cleanProvider, cleanModel, encrypted, params.endpoint || '', isActive, assignedGate, now);
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
    connectionId?: string | null,
    gate?: number
  ): {
    id: string;
    provider: string;
    model: string;
    apiKey: string;
    endpoint: string;
    active: boolean;
  } | null {
    let row: Record<string, unknown> | undefined;

    // 1. Check gate-specific active BYOK connection if gate is specified
    if (typeof gate === 'number') {
      row = this.db
        .prepare(
          `SELECT * FROM ai_connections WHERE user_id = ? AND assigned_gate = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1`
        )
        .get(userId, gate) as Record<string, unknown> | undefined;
    }

    // 2. Check project's explicitly selected connectionId
    if (!row && connectionId) {
      row = this.db
        .prepare(`SELECT * FROM ai_connections WHERE id = ? AND user_id = ?`)
        .get(connectionId, userId) as Record<string, unknown> | undefined;
    }

    // 3. Fallback to user's active default BYOK connection
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

      const defaultTests = { status: 'not_run', passed: 0, failed: 0, skipped: 0, executed: 0, logs: [] };

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
          '',
          '[]',
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

      const greetingMatches = [
        {
          gate: 1,
          meta: 'Gate 1 Requirements Agent',
          text: `مرحباً بك في بوابة المتطلبات (Gate 1) لمشروع "${cleanName}". أنا وكيل المتطلبات وتحليل الأعمال. اشرح لي فكرتك أو التعديلات المطلوبة وسأقوم بتحديث وثيقة المتطلبات المهيكلة في اللوحة المقابلة فوراً.`,
        },
        {
          gate: 2,
          meta: 'Gate 2 Design Agent',
          text: `مرحباً بك في بوابة التصميم (Gate 2) لمشروع "${cleanName}". يمكنك توليد التصميم المعماري وشاشات الواجهة التفاعلية بناءً على وثيقة المتطلبات المعتمدة أو إرسال تعديلاتك هنا.`,
        },
        {
          gate: 3,
          meta: 'Gate 3 Development Agent',
          text: `مرحباً بك في بوابة البرمجة وتوليد الكود (Gate 3) لمشروع "${cleanName}". اطلب توليد المشروع البرمجي الكامل أو تعديل أي ملف أو ميزة برمجية.`,
        },
        {
          gate: 4,
          meta: 'Gate 4 QA & Verification Agent',
          text: `مرحباً بك في بوابة فحص الجودة والأمان (Gate 4) لمشروع "${cleanName}". يمكنك تشغيل الفحص الفعلي المعزول (Isolated QA Runner) مع حلقة الإصلاح الآلي للكود.`,
        },
        {
          gate: 5,
          meta: 'Gate 5 Release & Delivery Agent',
          text: `مرحباً بك في بوابة التسليم والإطلاق (Gate 5) لمشروع "${cleanName}". يمكنك توليد حزمة التسليم النهائية وتحميل ملف المشروع الكامل بصيغة ZIP.`,
        },
      ];

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      for (const gm of greetingMatches) {
        this.db
          .prepare(
            `INSERT INTO gate1_chat_messages (
              id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
            ) VALUES (?, ?, ?, 'ai', ?, ?, ?, NULL, NULL, 1, NULL, 'succeeded', ?)`
          )
          .run(`msg-${projectId}-g${gm.gate}-init`, projectId, gm.gate, gm.text, timeStr, gm.meta, now);
      }

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

  // =========================================================================
  // EXECUTION RUN TRACKING (ALL GATES)
  // =========================================================================

  public startGateRun(params: {
    projectId: string;
    gate: number;
    userId: string;
    provider: string;
    configuredModel: string;
    inputVersion?: number | null;
  }): GateRunRecord {
    const runId = `run-${params.projectId}-g${params.gate}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO gate_runs (
          run_id, project_id, gate, status, provider, configured_model, executed_model,
          input_version, output_version, latency_ms, usage_json, error_type, error_message,
          logs_json, created_at, completed_at, created_by
        ) VALUES (?, ?, ?, 'running', ?, ?, NULL, ?, NULL, 0, NULL, NULL, NULL, '[]', ?, NULL, ?)`
      )
      .run(
        runId,
        params.projectId,
        params.gate,
        params.provider,
        params.configuredModel,
        params.inputVersion ?? null,
        now,
        params.userId
      );

    return this.getGateRun(params.projectId, params.gate, runId)!;
  }

  public completeGateRun(params: {
    runId: string;
    status: 'succeeded' | 'failed';
    executedModel?: string | null;
    outputVersion?: number | null;
    latencyMs: number;
    usage?: Record<string, unknown> | null;
    errorType?: string | null;
    errorMessage?: string | null;
    logs?: string[];
  }): GateRunRecord | null {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE gate_runs
         SET status = ?, executed_model = ?, output_version = ?, latency_ms = ?,
             usage_json = ?, error_type = ?, error_message = ?, logs_json = ?, completed_at = ?
         WHERE run_id = ?`
      )
      .run(
        params.status,
        params.executedModel ?? null,
        params.outputVersion ?? null,
        Math.max(0, Math.round(params.latencyMs || 0)),
        params.usage ? JSON.stringify(params.usage) : null,
        params.errorType ?? null,
        params.errorMessage ?? null,
        JSON.stringify(params.logs || []),
        now,
        params.runId
      );

    const row = this.db
      .prepare(`SELECT * FROM gate_runs WHERE run_id = ?`)
      .get(params.runId) as Record<string, unknown> | undefined;
    return row ? this.mapGateRunRow(row) : null;
  }

  public getGateRun(projectId: string, gate: number, runId: string): GateRunRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM gate_runs WHERE run_id = ? AND project_id = ? AND gate = ?`)
      .get(runId, projectId, gate) as Record<string, unknown> | undefined;
    return row ? this.mapGateRunRow(row) : null;
  }

  public getGateRuns(projectId: string, gate: number): GateRunRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM gate_runs WHERE project_id = ? AND gate = ? ORDER BY created_at DESC, rowid DESC LIMIT 25`)
      .all(projectId, gate) as Record<string, unknown>[];
    return rows.map((r) => this.mapGateRunRow(r));
  }

  public getGateChatHistory(projectId: string, gate: number): Gate1ChatMessageRecord[] {
    const chatRows = this.db
      .prepare(`SELECT * FROM gate1_chat_messages WHERE project_id = ? AND gate = ? ORDER BY created_at ASC, rowid ASC`)
      .all(projectId, gate) as Record<string, unknown>[];

    return chatRows.map((cr) => ({
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
  }

  public appendGateChatTurn(params: {
    projectId: string;
    gate: number;
    userMessage?: string;
    aiReply: string;
    provider: string;
    model: string;
    version: number;
    usage?: Record<string, unknown> | null;
  }): { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord } {
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let userMessageRecord: Gate1ChatMessageRecord | undefined;

    if (params.userMessage && params.userMessage.trim()) {
      const userMsgId = `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}-u`;
      this.db
        .prepare(
          `INSERT INTO gate1_chat_messages (
            id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
          ) VALUES (?, ?, ?, 'user', ?, ?, NULL, NULL, NULL, ?, NULL, 'succeeded', ?)`
        )
        .run(userMsgId, params.projectId, params.gate, params.userMessage.trim(), timeStr, params.version, now);

      userMessageRecord = {
        id: userMsgId,
        projectId: params.projectId,
        gate: params.gate,
        sender: 'user',
        text: params.userMessage.trim(),
        time: timeStr,
        documentVersion: params.version,
        status: 'succeeded',
        createdAt: now,
      };
    }

    const aiMsgId = `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}-a`;
    const metaLabel = `${params.provider} • ${params.model} • v${params.version}`;
    this.db
      .prepare(
        `INSERT INTO gate1_chat_messages (
          id, project_id, gate, sender, text, time, meta, provider, model, document_version, usage_json, status, created_at
        ) VALUES (?, ?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?)`
      )
      .run(
        aiMsgId,
        params.projectId,
        params.gate,
        params.aiReply,
        timeStr,
        metaLabel,
        params.provider,
        params.model,
        params.version,
        params.usage ? JSON.stringify(params.usage) : null,
        now
      );

    return {
      userMessageRecord,
      aiMessageRecord: {
        id: aiMsgId,
        projectId: params.projectId,
        gate: params.gate,
        sender: 'ai',
        text: params.aiReply,
        time: timeStr,
        meta: metaLabel,
        provider: params.provider,
        model: params.model,
        documentVersion: params.version,
        usage: params.usage || null,
        status: 'succeeded',
        createdAt: now,
      },
    };
  }

  // =========================================================================
  // GATE 1: PRESERVED IMPLEMENTATION
  // =========================================================================

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
    runs: GateRunRecord[];
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

    const chatHistory = this.getGateChatHistory(projectId, 1);
    const approval = this.getGate1ApprovedArtifact(projectId);
    const runs = this.getGateRuns(projectId, 1);

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
      runs,
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
        .prepare(
          `INSERT INTO gate_approvals (
            project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
          ) VALUES (?, 1, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_artifact_json = excluded.snapshot_artifact_json,
            snapshot_summary = excluded.snapshot_summary`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(strictValidation.document),
          approvedMarkdown
        );

      const projRow = this.db
        .prepare(`SELECT current_gate FROM projects WHERE id = ?`)
        .get(params.projectId) as Record<string, unknown> | undefined;
      const nextGate = Math.max(Number(projRow?.current_gate || 1), 2);

      this.db
        .prepare(`UPDATE projects SET current_gate = ?, status = 'in_progress', updated_at = ? WHERE id = ?`)
        .run(nextGate, now, params.projectId);

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

  // =========================================================================
  // GATE 2: DESIGN ARTIFACT PERSISTENCE & APPROVAL
  // =========================================================================

  public saveGate2DesignArtifact(params: {
    projectId: string;
    userId: string;
    artifact: DesignArtifact;
    source: 'ai' | 'manual';
    provider?: string | null;
    model?: string | null;
    usage?: Record<string, unknown> | null;
    userMessage?: string;
    aiReply?: string;
    expectedVersion?: number;
  }): {
    artifact: DesignArtifact;
    version: number;
    updatedAt: string;
    chatTurn?: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord };
  } {
    const approvedPrd = this.getGate1ApprovedArtifact(params.projectId);
    if (!approvedPrd) {
      const err: any = new Error('يجب اعتماد وثيقة المتطلبات في البوابة الأولى (Gate 1) قبل العمل في البوابة الثانية.');
      err.statusCode = 409;
      throw err;
    }

    const validation = validateDesignArtifact(
      params.artifact,
      approvedPrd.document,
      approvedPrd.approvedVersion
    );
    if (!validation.valid || !validation.artifact) {
      const err: any = new Error(`فشل التحقق من مخرجات التصميم: ${validation.errors.join(' | ')}`);
      err.statusCode = 400;
      throw err;
    }

    const existing = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 2`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    const currentVersion = existing ? Number(existing.version) : 0;
    if (
      typeof params.expectedVersion === 'number' &&
      existing &&
      params.expectedVersion !== currentVersion
    ) {
      const err: any = new Error(
        `تعارض في إصدار التصميم (النسخة المحفوظة v${currentVersion} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    const nextVersion = currentVersion + 1;
    const now = new Date().toISOString();
    const summaryText = validation.artifact.designSummary;

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO gate_artifacts (
            project_id, gate, version, artifact_json, summary_text, source, locked, provider, model, created_at, updated_at, updated_by
          ) VALUES (?, 2, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            version = excluded.version,
            artifact_json = excluded.artifact_json,
            summary_text = excluded.summary_text,
            source = excluded.source,
            locked = 0,
            provider = excluded.provider,
            model = excluded.model,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(validation.artifact),
          summaryText,
          params.source,
          params.provider ?? null,
          params.model ?? null,
          now,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO gate_artifact_versions (
            project_id, gate, version, artifact_json, summary_text, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(validation.artifact),
          summaryText,
          params.source,
          params.provider ?? null,
          params.model ?? null,
          params.usage ? JSON.stringify(params.usage) : null,
          now,
          params.userId
        );

      for (const uiFile of validation.artifact.uiFiles || []) {
        const pathCheck = validateRelativeFilePath(uiFile.path);
        if (pathCheck.valid && pathCheck.normalizedPath) {
          this.db
            .prepare(
              `INSERT INTO project_files (
                project_id, gate, version, file_path, content, file_type, description, created_at, updated_at
              ) VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(project_id, gate, version, file_path) DO UPDATE SET
                content = excluded.content,
                file_type = excluded.file_type,
                updated_at = excluded.updated_at`
            )
            .run(
              params.projectId,
              nextVersion,
              pathCheck.normalizedPath,
              uiFile.content,
              uiFile.fileType || 'tsx',
              uiFile.screenId || 'UI Screen',
              now,
              now
            );
        }
      }

      // Invalidate Gate 2 and downstream Gate 3, 4, 5 approvals when Gate 2 design changes
      this.db
        .prepare(`DELETE FROM gate_approvals WHERE project_id = ? AND gate IN (2, 3, 4, 5)`)
        .run(params.projectId);

      this.db
        .prepare(`UPDATE projects SET design_notes = ?, status = 'ready_for_approval', updated_at = ? WHERE id = ?`)
        .run(summaryText, now, params.projectId);

      let chatTurn: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord } | undefined;
      if (params.aiReply) {
        chatTurn = this.appendGateChatTurn({
          projectId: params.projectId,
          gate: 2,
          userMessage: params.userMessage,
          aiReply: params.aiReply,
          provider: params.provider || 'manual',
          model: params.model || 'editor',
          version: nextVersion,
          usage: params.usage,
        });
      }

      this.db.exec('COMMIT');
      return {
        artifact: validation.artifact,
        version: nextVersion,
        updatedAt: now,
        chatTurn,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  public approveGate2(params: {
    projectId: string;
    userId: string;
    expectedVersion?: number;
  }): GenericGateApprovalSnapshot<DesignArtifact> {
    const approvedPrd = this.getGate1ApprovedArtifact(params.projectId);
    if (!approvedPrd) {
      const err: any = new Error('لا يمكن اعتماد البوابة الثانية قبل اعتماد البوابة الأولى.');
      err.statusCode = 409;
      throw err;
    }

    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 2`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!row) {
      const err: any = new Error('لم يتم توليد مخرجات التصميم في البوابة الثانية بعد. يرجى توليد التصميم أولاً.');
      err.statusCode = 400;
      throw err;
    }

    const versionToApprove = Number(row.version);
    if (typeof params.expectedVersion === 'number' && params.expectedVersion !== versionToApprove) {
      const err: any = new Error(
        `تعارض في إصدار التصميم عند الاعتماد (النسخة المحفوظة v${versionToApprove} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    const artifact = JSON.parse(String(row.artifact_json)) as DesignArtifact;
    const validation = validateDesignArtifact(artifact, approvedPrd.document, approvedPrd.approvedVersion, {
      strictForApproval: true,
    });
    if (!validation.valid || !validation.artifact) {
      const err: any = new Error(`لا يمكن اعتماد التصميم: ${validation.errors.join(' | ')}`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(`UPDATE gate_artifacts SET locked = 1, updated_at = ?, updated_by = ? WHERE project_id = ? AND gate = 2`)
        .run(now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate_approvals (
            project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
          ) VALUES (?, 2, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_artifact_json = excluded.snapshot_artifact_json,
            snapshot_summary = excluded.snapshot_summary`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(validation.artifact),
          validation.artifact.designSummary
        );

      const projRow = this.db
        .prepare(`SELECT current_gate FROM projects WHERE id = ?`)
        .get(params.projectId) as Record<string, unknown> | undefined;
      const nextGate = Math.max(Number(projRow?.current_gate || 2), 3);

      this.db
        .prepare(`UPDATE projects SET current_gate = ?, status = 'in_progress', updated_at = ? WHERE id = ?`)
        .run(nextGate, now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      projectId: params.projectId,
      gate: 2,
      approved: true,
      approvedVersion: versionToApprove,
      approvedAt: now,
      approvedBy: params.userId,
      artifact: validation.artifact,
      summaryText: validation.artifact.designSummary,
    };
  }

  public getGate2ApprovedArtifact(projectId: string): GenericGateApprovalSnapshot<DesignArtifact> | null {
    const row = this.db
      .prepare(`SELECT * FROM gate_approvals WHERE project_id = ? AND gate = 2 AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      projectId: String(row.project_id),
      gate: 2,
      approved: Boolean(row.approved),
      approvedVersion: Number(row.approved_version),
      approvedAt: String(row.approved_at),
      approvedBy: String(row.approved_by),
      artifact: JSON.parse(String(row.snapshot_artifact_json)) as DesignArtifact,
      summaryText: String(row.snapshot_summary || ''),
    };
  }

  public getGate2State(projectId: string) {
    const project = this.getProjectById(projectId);
    if (!project) return null;
    const approvedPrd = this.getGate1ApprovedArtifact(projectId);
    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 2`)
      .get(projectId) as Record<string, unknown> | undefined;

    const versionRows = this.db
      .prepare(`SELECT * FROM gate_artifact_versions WHERE project_id = ? AND gate = 2 ORDER BY version DESC`)
      .all(projectId) as Record<string, unknown>[];

    const versions: GenericGateVersionSnapshot<DesignArtifact>[] = versionRows.map((vr) => ({
      version: Number(vr.version),
      artifact: JSON.parse(String(vr.artifact_json)) as DesignArtifact,
      summaryText: String(vr.summary_text || ''),
      source: String(vr.source) as GenericGateVersionSnapshot['source'],
      provider: vr.provider ? String(vr.provider) : null,
      model: vr.model ? String(vr.model) : null,
      usage: vr.usage_json ? JSON.parse(String(vr.usage_json)) : null,
      createdAt: String(vr.created_at),
      createdBy: String(vr.created_by),
    }));

    return {
      project,
      gate: 2,
      approvedPrd,
      artifact: row ? (JSON.parse(String(row.artifact_json)) as DesignArtifact) : null,
      version: row ? Number(row.version) : 0,
      locked: row ? Boolean(row.locked) : false,
      updatedAt: row ? String(row.updated_at) : null,
      versions,
      chatHistory: this.getGateChatHistory(projectId, 2),
      approval: this.getGate2ApprovedArtifact(projectId),
      runs: this.getGateRuns(projectId, 2),
    };
  }

  // =========================================================================
  // GATE 3: CODE ARTIFACT & FILES PERSISTENCE & APPROVAL
  // =========================================================================

  public getNextGate3Version(projectId: string): number {
    const row = this.db
      .prepare(`SELECT version FROM gate_artifacts WHERE project_id = ? AND gate = 3`)
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? Number(row.version) + 1 : 1;
  }

  public saveGate3CodeArtifact(params: {
    projectId: string;
    userId: string;
    artifact: CodeArtifact;
    source: 'ai' | 'manual' | 'repair';
    provider?: string | null;
    model?: string | null;
    usage?: Record<string, unknown> | null;
    userMessage?: string;
    aiReply?: string;
    expectedVersion?: number;
    keepGate3ApprovalUpdatedOnRepair?: boolean;
  }): {
    artifact: CodeArtifact;
    version: number;
    updatedAt: string;
    chatTurn?: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord };
  } {
    const approvedPrd = this.getGate1ApprovedArtifact(params.projectId);
    const approvedDesign = this.getGate2ApprovedArtifact(params.projectId);
    if (!approvedPrd || !approvedDesign) {
      const err: any = new Error(
        'يجب اعتماد المتطلبات (Gate 1) والتصميم (Gate 2) قبل توليد أو حفظ الكود في البوابة الثالثة.'
      );
      err.statusCode = 409;
      throw err;
    }

    const existing = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 3`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    const currentVersion = existing ? Number(existing.version) : 0;
    if (
      typeof params.expectedVersion === 'number' &&
      existing &&
      params.expectedVersion !== currentVersion
    ) {
      const err: any = new Error(
        `تعارض في إصدار الكود (النسخة المحفوظة v${currentVersion} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    const nextVersion = currentVersion + 1;
    const validation = validateCodeArtifact(
      { ...params.artifact, version: nextVersion },
      approvedPrd.document,
      approvedDesign.artifact,
      approvedPrd.approvedVersion,
      approvedDesign.approvedVersion,
      nextVersion
    );
    if (!validation.valid || !validation.artifact) {
      const err: any = new Error(`فشل التحقق من ملفات الكود: ${validation.errors.join(' | ')}`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const summaryText = validation.artifact.architecture.summary;
    const legacyCodeFiles = validation.artifact.files.map((f) => ({
      name: f.path,
      path: f.path,
      content: f.content,
      fileType: f.fileType,
      version: nextVersion,
    }));

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO gate_artifacts (
            project_id, gate, version, artifact_json, summary_text, source, locked, provider, model, created_at, updated_at, updated_by
          ) VALUES (?, 3, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            version = excluded.version,
            artifact_json = excluded.artifact_json,
            summary_text = excluded.summary_text,
            source = excluded.source,
            locked = 0,
            provider = excluded.provider,
            model = excluded.model,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(validation.artifact),
          summaryText,
          params.source,
          params.provider ?? null,
          params.model ?? null,
          now,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO gate_artifact_versions (
            project_id, gate, version, artifact_json, summary_text, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, 3, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(validation.artifact),
          summaryText,
          params.source,
          params.provider ?? null,
          params.model ?? null,
          params.usage ? JSON.stringify(params.usage) : null,
          now,
          params.userId
        );

      for (const file of validation.artifact.files) {
        this.db
          .prepare(
            `INSERT INTO project_files (
              project_id, gate, version, file_path, content, file_type, description, created_at, updated_at
            ) VALUES (?, 3, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, gate, version, file_path) DO UPDATE SET
              content = excluded.content,
              file_type = excluded.file_type,
              description = excluded.description,
              updated_at = excluded.updated_at`
          )
          .run(
            params.projectId,
            nextVersion,
            file.path,
            file.content,
            file.fileType,
            file.description || null,
            now,
            now
          );
      }

      // CRITICAL RULE 8.5: If the code changes after QA approval, previous Gate 4 & Gate 5 approvals
      // must NOT automatically apply to the new code version!
      this.db
        .prepare(`DELETE FROM gate_approvals WHERE project_id = ? AND gate IN (4, 5)`)
        .run(params.projectId);

      if (params.keepGate3ApprovalUpdatedOnRepair) {
        this.db
          .prepare(
            `INSERT INTO gate_approvals (
              project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
            ) VALUES (?, 3, 1, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, gate) DO UPDATE SET
              approved = 1,
              approved_version = excluded.approved_version,
              approved_at = excluded.approved_at,
              approved_by = excluded.approved_by,
              snapshot_artifact_json = excluded.snapshot_artifact_json,
              snapshot_summary = excluded.snapshot_summary`
          )
          .run(
            params.projectId,
            nextVersion,
            now,
            params.userId,
            JSON.stringify(validation.artifact),
            summaryText
          );
      } else {
        // Code changed outside repair loop -> require explicit Gate 3 approval of the new version
        this.db
          .prepare(`DELETE FROM gate_approvals WHERE project_id = ? AND gate = 3`)
          .run(params.projectId);
      }

      this.db
        .prepare(`UPDATE projects SET code_files_json = ?, status = 'ready_for_approval', updated_at = ? WHERE id = ?`)
        .run(JSON.stringify(legacyCodeFiles), now, params.projectId);

      let chatTurn: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord } | undefined;
      if (params.aiReply) {
        chatTurn = this.appendGateChatTurn({
          projectId: params.projectId,
          gate: 3,
          userMessage: params.userMessage,
          aiReply: params.aiReply,
          provider: params.provider || 'manual',
          model: params.model || 'editor',
          version: nextVersion,
          usage: params.usage,
        });
      }

      this.db.exec('COMMIT');
      return {
        artifact: validation.artifact,
        version: nextVersion,
        updatedAt: now,
        chatTurn,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  public approveGate3(params: {
    projectId: string;
    userId: string;
    expectedVersion?: number;
  }): GenericGateApprovalSnapshot<CodeArtifact> {
    const approvedPrd = this.getGate1ApprovedArtifact(params.projectId);
    const approvedDesign = this.getGate2ApprovedArtifact(params.projectId);
    if (!approvedPrd || !approvedDesign) {
      const err: any = new Error('لا يمكن اعتماد البوابة الثالثة قبل اعتماد البوابتين الأولى والثانية.');
      err.statusCode = 409;
      throw err;
    }

    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 3`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!row) {
      const err: any = new Error('لم يتم توليد ملفات الكود في البوابة الثالثة بعد. يرجى توليد الكود أولاً.');
      err.statusCode = 400;
      throw err;
    }

    const versionToApprove = Number(row.version);
    if (typeof params.expectedVersion === 'number' && params.expectedVersion !== versionToApprove) {
      const err: any = new Error(
        `تعارض في إصدار الكود عند الاعتماد (النسخة المحفوظة v${versionToApprove} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    const artifact = JSON.parse(String(row.artifact_json)) as CodeArtifact;
    const validation = validateCodeArtifact(
      artifact,
      approvedPrd.document,
      approvedDesign.artifact,
      approvedPrd.approvedVersion,
      approvedDesign.approvedVersion,
      versionToApprove,
      { strictForApproval: true }
    );
    if (!validation.valid || !validation.artifact) {
      const err: any = new Error(`لا يمكن اعتماد الكود: ${validation.errors.join(' | ')}`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(`UPDATE gate_artifacts SET locked = 1, updated_at = ?, updated_by = ? WHERE project_id = ? AND gate = 3`)
        .run(now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate_approvals (
            project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
          ) VALUES (?, 3, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_artifact_json = excluded.snapshot_artifact_json,
            snapshot_summary = excluded.snapshot_summary`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(validation.artifact),
          validation.artifact.architecture.summary
        );

      // Invalidate any stale Gate 4 approval that was not tested against this exact code version
      const existingGate4 = this.getGate4ApprovedArtifact(params.projectId);
      if (existingGate4 && existingGate4.artifact.testedCodeVersion !== versionToApprove) {
        this.db
          .prepare(`DELETE FROM gate_approvals WHERE project_id = ? AND gate IN (4, 5)`)
          .run(params.projectId);
      }

      const projRow = this.db
        .prepare(`SELECT current_gate FROM projects WHERE id = ?`)
        .get(params.projectId) as Record<string, unknown> | undefined;
      const nextGate = Math.max(Number(projRow?.current_gate || 3), 4);

      this.db
        .prepare(`UPDATE projects SET current_gate = ?, status = 'in_progress', updated_at = ? WHERE id = ?`)
        .run(nextGate, now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      projectId: params.projectId,
      gate: 3,
      approved: true,
      approvedVersion: versionToApprove,
      approvedAt: now,
      approvedBy: params.userId,
      artifact: validation.artifact,
      summaryText: validation.artifact.architecture.summary,
    };
  }

  public getGate3ApprovedArtifact(projectId: string): GenericGateApprovalSnapshot<CodeArtifact> | null {
    const row = this.db
      .prepare(`SELECT * FROM gate_approvals WHERE project_id = ? AND gate = 3 AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      projectId: String(row.project_id),
      gate: 3,
      approved: Boolean(row.approved),
      approvedVersion: Number(row.approved_version),
      approvedAt: String(row.approved_at),
      approvedBy: String(row.approved_by),
      artifact: JSON.parse(String(row.snapshot_artifact_json)) as CodeArtifact,
      summaryText: String(row.snapshot_summary || ''),
    };
  }

  public getGate3State(projectId: string) {
    const project = this.getProjectById(projectId);
    if (!project) return null;
    const approvedPrd = this.getGate1ApprovedArtifact(projectId);
    const approvedDesign = this.getGate2ApprovedArtifact(projectId);
    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 3`)
      .get(projectId) as Record<string, unknown> | undefined;

    const versionRows = this.db
      .prepare(`SELECT * FROM gate_artifact_versions WHERE project_id = ? AND gate = 3 ORDER BY version DESC`)
      .all(projectId) as Record<string, unknown>[];

    const versions: GenericGateVersionSnapshot<CodeArtifact>[] = versionRows.map((vr) => ({
      version: Number(vr.version),
      artifact: JSON.parse(String(vr.artifact_json)) as CodeArtifact,
      summaryText: String(vr.summary_text || ''),
      source: String(vr.source) as GenericGateVersionSnapshot['source'],
      provider: vr.provider ? String(vr.provider) : null,
      model: vr.model ? String(vr.model) : null,
      usage: vr.usage_json ? JSON.parse(String(vr.usage_json)) : null,
      createdAt: String(vr.created_at),
      createdBy: String(vr.created_by),
    }));

    return {
      project,
      gate: 3,
      approvedPrd,
      approvedDesign,
      artifact: row ? (JSON.parse(String(row.artifact_json)) as CodeArtifact) : null,
      version: row ? Number(row.version) : 0,
      locked: row ? Boolean(row.locked) : false,
      updatedAt: row ? String(row.updated_at) : null,
      versions,
      chatHistory: this.getGateChatHistory(projectId, 3),
      approval: this.getGate3ApprovedArtifact(projectId),
      runs: this.getGateRuns(projectId, 3),
    };
  }

  public getProjectFiles(projectId: string, version?: number): GeneratedProjectFile[] {
    let targetVersion = version;
    if (typeof targetVersion !== 'number') {
      const approved = this.getGate3ApprovedArtifact(projectId);
      if (approved) {
        targetVersion = approved.approvedVersion;
      } else {
        const latest = this.db
          .prepare(`SELECT version FROM gate_artifacts WHERE project_id = ? AND gate = 3`)
          .get(projectId) as Record<string, unknown> | undefined;
        targetVersion = latest ? Number(latest.version) : 0;
      }
    }
    if (!targetVersion) return [];

    const rows = this.db
      .prepare(
        `SELECT * FROM project_files WHERE project_id = ? AND gate = 3 AND version = ? ORDER BY file_path ASC`
      )
      .all(projectId, targetVersion) as Record<string, unknown>[];

    return rows.map((r) => ({
      path: String(r.file_path),
      content: String(r.content),
      fileType: String(r.file_type),
      version: Number(r.version),
      description: r.description ? String(r.description) : undefined,
    }));
  }

  // =========================================================================
  // GATE 4: QA REPORT PERSISTENCE & APPROVAL
  // =========================================================================

  public saveGate4QAReport(params: {
    projectId: string;
    userId: string;
    report: QAReportArtifact;
    provider?: string | null;
    model?: string | null;
    usage?: Record<string, unknown> | null;
    userMessage?: string;
    aiReply?: string;
  }): {
    report: QAReportArtifact;
    version: number;
    updatedAt: string;
    chatTurn?: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord };
  } {
    const existing = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 4`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    const nextVersion = existing ? Number(existing.version) + 1 : 1;
    const now = new Date().toISOString();
    const summaryText = params.report.aiSummary || `QA ${params.report.status}: ${params.report.passedChecks}/${params.report.executedChecks}`;

    const legacyTestResults = {
      status: params.report.status,
      passed: params.report.passedChecks,
      failed: params.report.failedChecks,
      skipped: params.report.skippedChecks,
      executed: params.report.executedChecks,
      buildSucceeded: params.report.buildSucceeded,
      testedCodeVersion: params.report.testedCodeVersion,
      logs: params.report.logs,
    };

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO gate_artifacts (
            project_id, gate, version, artifact_json, summary_text, source, locked, provider, model, created_at, updated_at, updated_by
          ) VALUES (?, 4, ?, ?, ?, 'ai', 0, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            version = excluded.version,
            artifact_json = excluded.artifact_json,
            summary_text = excluded.summary_text,
            locked = 0,
            provider = excluded.provider,
            model = excluded.model,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(params.report),
          summaryText,
          params.provider ?? null,
          params.model ?? null,
          now,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO gate_artifact_versions (
            project_id, gate, version, artifact_json, summary_text, source, provider, model, usage_json, created_at, created_by
          ) VALUES (?, 4, ?, ?, ?, 'ai', ?, ?, ?, ?, ?)`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(params.report),
          summaryText,
          params.provider ?? null,
          params.model ?? null,
          params.usage ? JSON.stringify(params.usage) : null,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO qa_reports (
            project_id, version, tested_code_version, status, executed_checks, passed_checks,
            failed_checks, skipped_checks, build_succeeded, repair_attempts, report_json, logs_json, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          params.projectId,
          nextVersion,
          params.report.testedCodeVersion,
          params.report.status,
          params.report.executedChecks,
          params.report.passedChecks,
          params.report.failedChecks,
          params.report.skippedChecks,
          params.report.buildSucceeded ? 1 : 0,
          params.report.repairAttempts,
          JSON.stringify(params.report),
          JSON.stringify(params.report.logs),
          now,
          params.userId
        );

      this.db
        .prepare(`UPDATE projects SET test_results_json = ?, status = 'ready_for_approval', updated_at = ? WHERE id = ?`)
        .run(JSON.stringify(legacyTestResults), now, params.projectId);

      let chatTurn: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord } | undefined;
      if (params.aiReply) {
        chatTurn = this.appendGateChatTurn({
          projectId: params.projectId,
          gate: 4,
          userMessage: params.userMessage,
          aiReply: params.aiReply,
          provider: params.provider || 'qa-runner',
          model: params.model || 'isolated-sandbox',
          version: nextVersion,
          usage: params.usage,
        });
      }

      this.db.exec('COMMIT');
      return {
        report: params.report,
        version: nextVersion,
        updatedAt: now,
        chatTurn,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  public approveGate4(params: {
    projectId: string;
    userId: string;
    expectedVersion?: number;
  }): GenericGateApprovalSnapshot<QAReportArtifact> {
    const approvedCode = this.getGate3ApprovedArtifact(params.projectId);
    if (!approvedCode) {
      const err: any = new Error('لا يمكن اعتماد البوابة الرابعة قبل اعتماد الكود في البوابة الثالثة (Gate 3).');
      err.statusCode = 409;
      throw err;
    }

    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 4`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    if (!row) {
      const err: any = new Error('لم يتم تشغيل فحص الجودة الفعلي (Gate 4 QA) بعد. يرجى تشغيل الفحص أولاً.');
      err.statusCode = 400;
      throw err;
    }

    const versionToApprove = Number(row.version);
    if (typeof params.expectedVersion === 'number' && params.expectedVersion !== versionToApprove) {
      const err: any = new Error(
        `تعارض في إصدار تقرير الجودة عند الاعتماد (النسخة المحفوظة v${versionToApprove} مقابل v${params.expectedVersion}).`
      );
      err.statusCode = 409;
      throw err;
    }

    const report = JSON.parse(String(row.artifact_json)) as QAReportArtifact;

    // Enforce Section 8.5: QA report must match the approved Gate 3 code version!
    if (report.testedCodeVersion !== approvedCode.approvedVersion) {
      const err: any = new Error(
        `تقرير فحص الجودة الحالي مرتبط بإصدار الكود (v${report.testedCodeVersion}) بينما إصدار الكود المعتمد هو (v${approvedCode.approvedVersion}). يجب إعادة تشغيل الفحص على النسخة الجديدة.`
      );
      err.statusCode = 409;
      throw err;
    }

    if (report.status !== 'passed' || report.failedChecks > 0 || !report.buildSucceeded) {
      const err: any = new Error(
        `لا يمكن اعتماد البوابة الرابعة لأن فحص الجودة لم ينجح بالكامل (الحالة: ${report.status}، الاختبارات الفاشلة: ${report.failedChecks}).`
      );
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(`UPDATE gate_artifacts SET locked = 1, updated_at = ?, updated_by = ? WHERE project_id = ? AND gate = 4`)
        .run(now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate_approvals (
            project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
          ) VALUES (?, 4, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_artifact_json = excluded.snapshot_artifact_json,
            snapshot_summary = excluded.snapshot_summary`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(report),
          report.aiSummary
        );

      const projRow = this.db
        .prepare(`SELECT current_gate FROM projects WHERE id = ?`)
        .get(params.projectId) as Record<string, unknown> | undefined;
      const nextGate = Math.max(Number(projRow?.current_gate || 4), 5);

      this.db
        .prepare(`UPDATE projects SET current_gate = ?, status = 'in_progress', updated_at = ? WHERE id = ?`)
        .run(nextGate, now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      projectId: params.projectId,
      gate: 4,
      approved: true,
      approvedVersion: versionToApprove,
      approvedAt: now,
      approvedBy: params.userId,
      artifact: report,
      summaryText: report.aiSummary,
    };
  }

  public getGate4ApprovedArtifact(projectId: string): GenericGateApprovalSnapshot<QAReportArtifact> | null {
    const row = this.db
      .prepare(`SELECT * FROM gate_approvals WHERE project_id = ? AND gate = 4 AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const snapshot = JSON.parse(String(row.snapshot_artifact_json)) as QAReportArtifact;
    const approvedCode = this.getGate3ApprovedArtifact(projectId);
    if (approvedCode && snapshot.testedCodeVersion !== approvedCode.approvedVersion) {
      return null;
    }

    return {
      projectId: String(row.project_id),
      gate: 4,
      approved: Boolean(row.approved),
      approvedVersion: Number(row.approved_version),
      approvedAt: String(row.approved_at),
      approvedBy: String(row.approved_by),
      artifact: snapshot,
      summaryText: String(row.snapshot_summary || ''),
    };
  }

  public getGate4State(projectId: string) {
    const project = this.getProjectById(projectId);
    if (!project) return null;
    const approvedCode = this.getGate3ApprovedArtifact(projectId);
    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 4`)
      .get(projectId) as Record<string, unknown> | undefined;

    return {
      project,
      gate: 4,
      approvedCode,
      artifact: row ? (JSON.parse(String(row.artifact_json)) as QAReportArtifact) : null,
      version: row ? Number(row.version) : 0,
      locked: row ? Boolean(row.locked) : false,
      updatedAt: row ? String(row.updated_at) : null,
      chatHistory: this.getGateChatHistory(projectId, 4),
      approval: this.getGate4ApprovedArtifact(projectId),
      runs: this.getGateRuns(projectId, 4),
    };
  }

  // =========================================================================
  // GATE 5: DELIVERY PACKAGE PERSISTENCE & APPROVAL
  // =========================================================================

  public saveGate5DeliveryArtifact(params: {
    projectId: string;
    userId: string;
    artifact: DeliveryArtifact;
    provider?: string | null;
    model?: string | null;
    usage?: Record<string, unknown> | null;
    userMessage?: string;
    aiReply?: string;
  }): {
    artifact: DeliveryArtifact;
    version: number;
    updatedAt: string;
    chatTurn?: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord };
  } {
    const existing = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 5`)
      .get(params.projectId) as Record<string, unknown> | undefined;

    const nextVersion = existing ? Number(existing.version) + 1 : 1;
    const now = new Date().toISOString();
    const finalArtifact: DeliveryArtifact = {
      ...params.artifact,
      version: nextVersion,
    };
    const summaryText = finalArtifact.releaseNotes;

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO gate_artifacts (
            project_id, gate, version, artifact_json, summary_text, source, locked, provider, model, created_at, updated_at, updated_by
          ) VALUES (?, 5, ?, ?, ?, 'ai', 0, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            version = excluded.version,
            artifact_json = excluded.artifact_json,
            summary_text = excluded.summary_text,
            provider = excluded.provider,
            model = excluded.model,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by`
        )
        .run(
          params.projectId,
          nextVersion,
          JSON.stringify(finalArtifact),
          summaryText,
          params.provider ?? null,
          params.model ?? null,
          now,
          now,
          params.userId
        );

      this.db
        .prepare(
          `INSERT INTO delivery_packages (
            project_id, version, approved_code_version, approved_qa_version, file_name, file_count, artifact_json, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id) DO UPDATE SET
            version = excluded.version,
            approved_code_version = excluded.approved_code_version,
            approved_qa_version = excluded.approved_qa_version,
            file_name = excluded.file_name,
            file_count = excluded.file_count,
            artifact_json = excluded.artifact_json,
            created_at = excluded.created_at,
            created_by = excluded.created_by`
        )
        .run(
          params.projectId,
          nextVersion,
          finalArtifact.approvedCodeVersion,
          finalArtifact.approvedQaVersion,
          finalArtifact.fileName,
          finalArtifact.fileCount,
          JSON.stringify(finalArtifact),
          now,
          params.userId
        );

      let chatTurn: { userMessageRecord?: Gate1ChatMessageRecord; aiMessageRecord: Gate1ChatMessageRecord } | undefined;
      if (params.aiReply) {
        chatTurn = this.appendGateChatTurn({
          projectId: params.projectId,
          gate: 5,
          userMessage: params.userMessage,
          aiReply: params.aiReply,
          provider: params.provider || 'release-agent',
          model: params.model || 'packager',
          version: nextVersion,
          usage: params.usage,
        });
      }

      this.db.exec('COMMIT');
      return {
        artifact: finalArtifact,
        version: nextVersion,
        updatedAt: now,
        chatTurn,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  public approveGate5(params: {
    projectId: string;
    userId: string;
    artifact: DeliveryArtifact;
  }): GenericGateApprovalSnapshot<DeliveryArtifact> {
    const now = new Date().toISOString();
    const versionToApprove = params.artifact.version || 1;

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(`UPDATE gate_artifacts SET locked = 1, updated_at = ?, updated_by = ? WHERE project_id = ? AND gate = 5`)
        .run(now, params.userId, params.projectId);

      this.db
        .prepare(
          `INSERT INTO gate_approvals (
            project_id, gate, approved, approved_version, approved_at, approved_by, snapshot_artifact_json, snapshot_summary
          ) VALUES (?, 5, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(project_id, gate) DO UPDATE SET
            approved = 1,
            approved_version = excluded.approved_version,
            approved_at = excluded.approved_at,
            approved_by = excluded.approved_by,
            snapshot_artifact_json = excluded.snapshot_artifact_json,
            snapshot_summary = excluded.snapshot_summary`
        )
        .run(
          params.projectId,
          versionToApprove,
          now,
          params.userId,
          JSON.stringify(params.artifact),
          params.artifact.releaseNotes
        );

      this.db
        .prepare(`UPDATE projects SET current_gate = 5, status = 'completed', updated_at = ? WHERE id = ?`)
        .run(now, params.projectId);

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return {
      projectId: params.projectId,
      gate: 5,
      approved: true,
      approvedVersion: versionToApprove,
      approvedAt: now,
      approvedBy: params.userId,
      artifact: params.artifact,
      summaryText: params.artifact.releaseNotes,
    };
  }

  public getGate5ApprovedArtifact(projectId: string): GenericGateApprovalSnapshot<DeliveryArtifact> | null {
    const row = this.db
      .prepare(`SELECT * FROM gate_approvals WHERE project_id = ? AND gate = 5 AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      projectId: String(row.project_id),
      gate: 5,
      approved: Boolean(row.approved),
      approvedVersion: Number(row.approved_version),
      approvedAt: String(row.approved_at),
      approvedBy: String(row.approved_by),
      artifact: JSON.parse(String(row.snapshot_artifact_json)) as DeliveryArtifact,
      summaryText: String(row.snapshot_summary || ''),
    };
  }

  public getGate5State(projectId: string) {
    const project = this.getProjectById(projectId);
    if (!project) return null;
    const approvedPrd = this.getGate1ApprovedArtifact(projectId);
    const approvedDesign = this.getGate2ApprovedArtifact(projectId);
    const approvedCode = this.getGate3ApprovedArtifact(projectId);
    const approvedQa = this.getGate4ApprovedArtifact(projectId);
    const row = this.db
      .prepare(`SELECT * FROM gate_artifacts WHERE project_id = ? AND gate = 5`)
      .get(projectId) as Record<string, unknown> | undefined;

    return {
      project,
      gate: 5,
      approvedPrd,
      approvedDesign,
      approvedCode,
      approvedQa,
      artifact: row ? (JSON.parse(String(row.artifact_json)) as DeliveryArtifact) : null,
      version: row ? Number(row.version) : 0,
      locked: row ? Boolean(row.locked) : false,
      updatedAt: row ? String(row.updated_at) : null,
      chatHistory: this.getGateChatHistory(projectId, 5),
      approval: this.getGate5ApprovedArtifact(projectId),
      runs: this.getGateRuns(projectId, 5),
    };
  }

  // =========================================================================
  // ROW MAPPERS
  // =========================================================================

  private mapGateRunRow(row: Record<string, unknown>): GateRunRecord {
    return {
      runId: String(row.run_id),
      projectId: String(row.project_id),
      gate: Number(row.gate),
      status: String(row.status) as GateRunRecord['status'],
      provider: String(row.provider),
      configuredModel: String(row.configured_model),
      executedModel: row.executed_model ? String(row.executed_model) : null,
      inputVersion: row.input_version !== null && row.input_version !== undefined ? Number(row.input_version) : null,
      outputVersion: row.output_version !== null && row.output_version !== undefined ? Number(row.output_version) : null,
      latencyMs: Number(row.latency_ms || 0),
      usage: row.usage_json ? JSON.parse(String(row.usage_json)) : null,
      errorType: row.error_type ? String(row.error_type) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      logs: row.logs_json ? JSON.parse(String(row.logs_json)) : [],
      createdAt: String(row.created_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      createdBy: String(row.created_by),
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
      assignedGate:
        row.assigned_gate !== null && row.assigned_gate !== undefined ? Number(row.assigned_gate) : null,
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
    const approval1Row = this.db
      .prepare(`SELECT approved, approved_at FROM gate1_approvals WHERE project_id = ? AND approved = 1`)
      .get(projectId) as Record<string, unknown> | undefined;

    const gateArtifacts = this.db
      .prepare(`SELECT gate, version FROM gate_artifacts WHERE project_id = ?`)
      .all(projectId) as Record<string, unknown>[];
    const gateVersionMap = new Map<number, number>();
    for (const ga of gateArtifacts) {
      gateVersionMap.set(Number(ga.gate), Number(ga.version));
    }

    const gateApprovals = this.db
      .prepare(`SELECT gate, approved, approved_at, approved_version FROM gate_approvals WHERE project_id = ? AND approved = 1`)
      .all(projectId) as Record<string, unknown>[];
    const gateApprovalMap = new Map<number, { approved: boolean; approvedAt: string; approvedVersion: number }>();
    for (const gap of gateApprovals) {
      gateApprovalMap.set(Number(gap.gate), {
        approved: Boolean(gap.approved),
        approvedAt: String(gap.approved_at),
        approvedVersion: Number(gap.approved_version),
      });
    }

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
      testResults: JSON.parse(String(row.test_results_json || '{"status":"not_run","passed":0,"failed":0,"logs":[]}')),
      gate1Version: docRow ? Number(docRow.version) : 1,
      gate1Approved: Boolean(approval1Row?.approved),
      gate1ApprovedAt: approval1Row?.approved_at ? String(approval1Row.approved_at) : null,
      gate2Version: gateVersionMap.get(2) || 0,
      gate2Approved: Boolean(gateApprovalMap.get(2)?.approved),
      gate2ApprovedAt: gateApprovalMap.get(2)?.approvedAt || null,
      gate3Version: gateVersionMap.get(3) || 0,
      gate3Approved: Boolean(gateApprovalMap.get(3)?.approved),
      gate3ApprovedAt: gateApprovalMap.get(3)?.approvedAt || null,
      gate4Version: gateVersionMap.get(4) || 0,
      gate4Approved: Boolean(gateApprovalMap.get(4)?.approved),
      gate4ApprovedAt: gateApprovalMap.get(4)?.approvedAt || null,
      gate5Version: gateVersionMap.get(5) || 0,
      gate5Approved: Boolean(gateApprovalMap.get(5)?.approved),
      gate5ApprovedAt: gateApprovalMap.get(5)?.approvedAt || null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
