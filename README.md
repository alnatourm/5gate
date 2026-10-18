# OGroup AI Software Factory (`5gate`)

منصة مصنع البرمجيات الذكي بنظام البوابات الخمس المتسلسلة (**OGroup AI Software Factory**).

## Task 02: Gate 1 (Requirements Agent) Architecture & Verification

### 1. Capabilities Implemented in Gate 1
- **Dedicated Requirements Agent (`src/server/requirementsAgent.ts`)**:
  - Analyzes the customer's software idea in Arabic or English, asks targeted clarification questions, and generates/updates a structured 12-section Product Requirements Document (PRD).
  - Preserves previously confirmed requirements when applying incremental modifications (e.g., adding WhatsApp notifications) without overwriting unrelated sections.
  - Enforces strict server-side schema validation (`src/shared/requirementsSchema.ts`) across all 12 required sections:
    1. `projectName`
    2. `overview`
    3. `objectives`
    4. `userRoles`
    5. `features`
    6. `userJourneys`
    7. `businessRules`
    8. `dataRequirements`
    9. `integrations`
    10. `acceptanceCriteria`
    11. `assumptions`
    12. `exclusions`
- **Durable SQLite Storage & AES-256-GCM Credential Encryption (`src/server/storage.ts`)**:
  - Persists users, sessions, commercial entitlements, encrypted BYOK credentials, projects, Gate 1 structured documents, version history, chat history, and immutable Gate 1 approval snapshots in SQLite (`.data/ogroup-factory.sqlite`, configurable via `DB_PATH`).
  - Encrypts customer BYOK API keys at rest using `AES-256-GCM` (`CREDENTIAL_ENCRYPTION_KEY`) and masks keys on all read endpoints.
- **Commercial Mode & Provider Routing**:
  - **Build For Me (`managed` — 100 JOD / project)**: Verifies project credit entitlement on the server and routes requests through OGroup-managed AI credentials.
  - **Build With My AI (`byok` — 50 JOD / month)**: Verifies active subscription entitlement on the server, decrypts the customer's saved provider/model/key, never infers provider from key prefix, never silently replaces the selected model, and **never falls back to the platform Gemini key** if the customer's key is missing or invalid.
- **Manual Editing, Concurrency Protection & Approval Handoff**:
  - Customers can edit the structured 12-section document or full Markdown directly in the right panel (`PUT /api/projects/:id/gates/1/document` with `expectedVersion` optimistic concurrency control).
  - Approving Gate 1 (`POST /api/projects/:id/gates/1/approve`) validates all mandatory sections, locks the approved version, creates an immutable snapshot, advances the project to Gate 2, and exposes the approved artifact via `GET /api/projects/:id/gates/1/approved-artifact`.

---

## Setup & Local Development

### Prerequisites
- **Node.js**: `v22.x` (uses built-in `node:sqlite` for durable relational storage)
- **Environment Variables** (`.env`):
  ```bash
  GEMINI_API_KEY=your_managed_gemini_api_key
  CREDENTIAL_ENCRYPTION_KEY=your_32_byte_secret_for_aes_256_gcm
  DB_PATH=.data/ogroup-factory.sqlite
  ```

### Install & Run
```bash
npm install
npm run dev
```
The server starts on `http://localhost:3000`.

---

## Verification & Automated Tests

Run TypeScript validation, the automated Gate 1 test suite (Tests A through G), and the production build (Test H):

```bash
# 1. TypeScript validation
npm run lint

# 2. Automated Gate 1 verification suite (Tests A–G)
npm test

# 3. Production Vite build (Test H)
npm run build
```
