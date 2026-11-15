import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../server.ts';
import { FactoryStorage } from '../src/server/storage.ts';
import { createInitialRequirementsDocument } from '../src/shared/requirementsSchema.ts';

describe('OGroup AI Factory - Project Deletion & 5-Gate Cleanup Verification Suite', () => {
  let tempDir: string;
  let dbFilePath: string;
  let app: any;
  let storage: FactoryStorage;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogroup-delete-test-'));
    dbFilePath = path.join(tempDir, 'test-delete.sqlite');
    const result = createApp({
      dbPath: dbFilePath,
      encryptionSecret: 'test-encryption-key-for-delete-tests-32chars!!',
      isolateConfig: true,
    });
    app = result.app;
    storage = result.storage;
  });

  afterAll(() => {
    try {
      storage.db.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. storage.deleteProject wipes project and all related gate records from database', () => {
    const owner = storage.upsertUserByEmail({
      email: 'delete-unit@ogroup.ai',
      name: 'Delete Unit User',
      defaultCredits: 5,
      defaultSubscription: true,
    });

    const project = storage.createProject({
      ownerId: owner.id,
      name: 'Project To Delete Unit',
      description: 'Unit testing full cascade delete of 5-gate states',
      mode: 'managed',
    });

    // Populate gate run
    storage.startGateRun({
      projectId: project.id,
      gate: 1,
      userId: owner.id,
      provider: 'google',
      configuredModel: 'gemini-3.8-flash',
    });

    // Populate gate 1 chat message
    const initialDoc = createInitialRequirementsDocument(project.name, project.description);
    storage.recordGate1AIChatTurn({
      projectId: project.id,
      userId: owner.id,
      userMessage: 'Please add testing',
      aiReply: 'Updated requirements',
      updatedDocument: initialDoc,
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: null,
    });

    // Verify project and records exist before deletion
    expect(storage.getProjectById(project.id)).not.toBeNull();
    const runsBefore = storage.getGateRuns(project.id, 1);
    expect(runsBefore.length).toBeGreaterThan(0);

    // Delete project
    const deleted = storage.deleteProject(project.id);
    expect(deleted).toBe(true);

    // Verify project is gone
    expect(storage.getProjectById(project.id)).toBeNull();
    expect(storage.getGate1State(project.id)).toBeNull();
    expect(storage.getGate2State(project.id)).toBeNull();
    expect(storage.getGate3State(project.id)).toBeNull();
    expect(storage.getGate4State(project.id)).toBeNull();
    expect(storage.getGate5State(project.id)).toBeNull();

    // Verify tables have no orphan rows for this project_id
    const childTables = [
      'gate1_documents',
      'gate1_document_versions',
      'gate1_chat_messages',
      'gate1_approvals',
      'gate_runs',
      'gate_artifacts',
      'gate_artifact_versions',
      'gate_approvals',
      'project_files',
      'qa_reports',
      'delivery_packages',
    ];

    for (const tbl of childTables) {
      const row = storage.db.prepare(`SELECT COUNT(*) as count FROM ${tbl} WHERE project_id = ?`).get(project.id) as { count: number };
      expect(row.count).toBe(0);
    }

    // Second delete should return false (already deleted)
    expect(storage.deleteProject(project.id)).toBe(false);
  });

  it('2. DELETE /api/projects/:id validates authentication, authorization, and successfully deletes project', async () => {
    // 1. Create two users via /api/auth/session
    const userRes1 = await request(app)
      .post('/api/auth/session')
      .send({ email: 'user1-delete@test.com', name: 'User 1', defaultCredits: 3, defaultSubscription: true });
    expect(userRes1.status).toBe(200);
    const token1 = userRes1.body.token;

    const userRes2 = await request(app)
      .post('/api/auth/session')
      .send({ email: 'user2-delete@test.com', name: 'User 2', defaultCredits: 3, defaultSubscription: true });
    expect(userRes2.status).toBe(200);
    const token2 = userRes2.body.token;

    // User 1 creates project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'User 1 API Deletable Project',
        description: 'Test project for DELETE endpoint',
        mode: 'managed',
      });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.project.id;

    // Check project exists in list
    const listRes1 = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token1}`);
    expect(listRes1.body.projects.some((p: any) => p.id === projectId)).toBe(true);

    // 2. Unauthenticated delete returns 401
    const unauthRes = await request(app)
      .delete(`/api/projects/${projectId}`);
    expect(unauthRes.status).toBe(401);

    // 3. User 2 trying to delete User 1's project returns 403 Forbidden
    const forbiddenRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toContain('??? ???? ??');

    // 4. Non-existent project returns 404
    const notFoundRes = await request(app)
      .delete('/api/projects/proj-non-existent-999')
      .set('Authorization', `Bearer ${token1}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error).toContain('??????? ??? ?????');

    // 5. Authorized owner deletes project successfully
    const deleteRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.deletedProjectId).toBe(projectId);

    // 6. Verify subsequent GET /api/projects/:id returns 404
    const getDeletedRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(getDeletedRes.status).toBe(404);

    // 7. Verify subsequent GET /api/projects list no longer contains the project
    const listRes2 = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token1}`);
    expect(listRes2.body.projects.some((p: any) => p.id === projectId)).toBe(false);
  });
});
