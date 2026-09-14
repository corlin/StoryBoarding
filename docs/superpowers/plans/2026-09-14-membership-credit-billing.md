# Membership, Credit, and Model Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable paid memberships, expiring/non-expiring Credit balances, platform-key charging, BYOK zero-model-Credit usage tracking, and administrator billing operations.

**Architecture:** Keep money and Credit arithmetic in integer micro-units, with D1 as the source of truth and an append-only ledger plus per-grant lots. A small billing domain layer owns quotes and state transitions; generation routes call it before and after providers rather than duplicating balance logic. The frontend reads billing APIs and displays quotes, balances, charge status, and a narrowly scoped admin console.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, D1, Drizzle ORM, Next.js 14, React 18, Zustand, Axios, Node.js test runner.

**Spec:** `docs/superpowers/specs/2026-09-14-membership-credit-billing-design.md`

## Global Constraints

- 1 Credit is a user-facing billing unit with a nominal value of CNY ¥0.01; it is not a USD or provider-token unit.
- Store Credit and provider cost as integers; do not use floating point for settlement.
- Platform credentials consume Credit; BYOK consumes zero model Credit but still records usage.
- Promotional and membership Credit expire; purchased Credit never expires.
- Consume the earliest-expiring promotional/member lot first, then purchased lots FIFO.
- Historical generation jobs are never retroactively charged.
- Billing writes are idempotent and ledger records are append-only; corrections use reversing entries.
- A local timeout never proves a provider did not accept a request.
- Every admin write re-checks the current database role and writes an audit record.
- Production secrets are provided only through Worker Secrets.
- `PLATFORM_BILLING_ENABLED` gates real holds and settlement; disabled mode records shadow quotes only.

## File Map

Backend files to create:

- `backend/drizzle/migrations/0001_membership_credit_billing.sql` — D1 schema, constraints, indexes, plan/rate seeds, existing-user account bootstrap.
- `backend/src/lib/adminAuth.ts` — database-backed administrator guard and bootstrap-email handling.
- `backend/src/lib/billing/types.ts` — stable billing enums, request/result types, and error codes.
- `backend/src/lib/billing/rates.ts` — rate lookup and integer quote calculations.
- `backend/src/lib/billing/ledger.ts` — account creation, lot allocation, holds, releases, settlement, grants, and adjustments.
- `backend/src/lib/billing/charges.ts` — quote/hold/submit/settle/reconcile orchestration for generation jobs.
- `backend/src/lib/billing/providerUsage.ts` — extraction of provider request/response usage into normalized units.
- `backend/src/lib/providerCredentials.ts` — server-only selection of platform versus encrypted user credentials.
- `backend/src/routes/billing.ts` — authenticated user account, quote, and ledger endpoints.
- `backend/src/routes/adminBilling.ts` — admin membership, adjustment, rate, summary, and reconciliation endpoints.
- `backend/src/services/historicalCostEstimate.ts` — read-only estimates for pre-billing generation jobs.
- `backend/tests/billing-schema.test.cjs` — migration and schema contract tests.
- `backend/tests/billing-domain.test.cjs` — quote, ordering, expiry, idempotency, and transition tests.
- `backend/tests/billing-routes.test.cjs` — authorization and API contract tests.
- `backend/tests/billing-generation-integration.test.cjs` — provider-boundary billing tests with fake fetch/D1 fixtures.
- `backend/tests/billing-e2e.mjs` — optional authenticated production smoke test; never runs under default `npm test`.

Backend files to modify:

- `backend/src/db/schema.ts` — Drizzle definitions for roles, plans, memberships, accounts, lots, ledger, rates, charges, and audit logs.
- `backend/src/db/client.ts` — bindings, safe runtime schema compatibility, and bootstrap invocation.
- `backend/src/lib/auth.ts` — inject `JWT_SECRET` into signing and verification.
- `backend/src/routes/auth.ts` — account bootstrap on registration and role-safe user responses.
- `backend/src/index.ts` — mount billing routers and pass Worker bindings.
- `backend/src/routes/generation.ts` — meter director LLM and image generation.
- `backend/src/routes/video.ts` — hold before video submission and settle/reconcile after polling.
- `backend/src/routes/tts.ts` — meter TTS by actual characters and provider result.
- `backend/src/agents/director/pipeline.ts` — return provider token usage with generated storyboard data.
- `backend/src/routes/production.ts` — expose actual/estimated Credit and provider costs in cost summaries.
- `backend/wrangler.toml` — non-secret billing flags and documented secret names.
- `backend/worker-configuration.d.ts` — typed Worker bindings.
- `backend/package.json` — billing-focused test scripts.

Frontend files to create:

- `frontend/src/types/billing.ts` — account, quote, ledger, charge, plan, rate, and admin DTOs.
- `frontend/src/stores/billingStore.ts` — authenticated account refresh and latest quote state.
- `frontend/src/components/billing/CreditBalanceBadge.tsx` — compact available/held balance.
- `frontend/src/components/billing/BillingAccountPanel.tsx` — plan, lots, expiry, and ledger UI.
- `frontend/src/components/billing/GenerationQuoteDialog.tsx` — confirms model, mode, units, and estimated Credit.
- `frontend/src/app/admin/billing/page.tsx` — membership, adjustment, rate, summary, and reconciliation interface.
- `frontend/tests/billing-ui.test.cjs` — source contract tests for balance, quote, BYOK, and admin affordances.

Frontend files to modify:

- `frontend/src/lib/api.ts` — typed billing/admin methods and normalized billing errors.
- `frontend/src/stores/authStore.ts` — role plus platform/BYOK eligibility; remove the global “must have personal key” assumption.
- `frontend/src/components/workspace/TopBar.tsx` — Credit badge and account-panel trigger.
- `frontend/src/components/ui/UserMenuDropdown.tsx` — plan/account entry and admin entry.
- `frontend/src/components/workspace/kanban/ProductionKanbanView.tsx` — quote-before-video/TTS confirmation and charge results.
- `frontend/src/app/workspace/[projectId]/WorkspaceClient.tsx` — quote-before-image and director-generation flow.
- `frontend/src/data/modelCatalog.ts` — billing capability labels without embedding mutable prices.
- `frontend/src/data/releaseNotes.ts` — release entry after verified rollout.

---

### Task 1: Persist the Billing Schema and Seed Catalog

**Files:**
- Create: `backend/drizzle/migrations/0001_membership_credit_billing.sql`
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/db/client.ts`
- Test: `backend/tests/billing-schema.test.cjs`

**Interfaces:**
- Produces: Drizzle exports `membershipPlans`, `userMemberships`, `creditAccounts`, `creditLots`, `creditLedger`, `modelRates`, `usageCharges`, `billingAuditLogs`.
- Produces: `Bindings` fields `JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAILS`, `PLATFORM_BILLING_ENABLED`, `PLATFORM_LLM_API_KEY`, `PLATFORM_IMAGE_API_KEY`, `PLATFORM_VIDEO_API_KEY`.
- Consumes: existing `users`, `projects`, and `generationJobs` tables.

- [ ] **Step 1: Write a failing schema contract test**

```js
test('billing migration uses integer balances and immutable idempotency keys', () => {
  const sql = read('drizzle/migrations/0001_membership_credit_billing.sql');
  for (const table of ['membership_plans', 'user_memberships', 'credit_accounts', 'credit_lots', 'credit_ledger', 'model_rates', 'usage_charges', 'billing_audit_logs']) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}`));
  }
  assert.match(sql, /available_credits INTEGER NOT NULL CHECK \(available_credits >= 0\)/);
  assert.match(sql, /held_credits INTEGER NOT NULL CHECK \(held_credits >= 0\)/);
  assert.match(sql, /idempotency_key TEXT NOT NULL UNIQUE/);
  assert.doesNotMatch(sql, /REAL/);
});
```

- [ ] **Step 2: Run the schema test and observe the missing migration failure**

Run: `cd backend && node --test tests/billing-schema.test.cjs`

Expected: FAIL because `0001_membership_credit_billing.sql` does not exist.

- [ ] **Step 3: Add the migration and matching Drizzle models**

Use integer columns such as:

```ts
export const creditAccounts = sqliteTable("credit_accounts", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  availableCredits: integer("available_credits").notNull().default(0),
  heldCredits: integer("held_credits").notNull().default(0),
  lifetimeGranted: integer("lifetime_granted").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  version: integer("version").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
```

Define `usage_charges.status` as `quoted | held | submitted | processing | settled | released | reconciliation_required`, `billing_mode` as `platform | byok | shadow`, and store request/usage/cost snapshots as JSON text. Seed Free/Creator/Studio plans and the approved four initial model rates with fixed version identifiers such as `2026-09-14-v1`.

The migration must create an account and a 200-Credit, 30-day signup lot for each existing user through a deterministic key `migration:2026-09-14:signup:<user_id>`. It must not create any `usage_charges` or debit ledger entries for existing generation jobs.

- [ ] **Step 4: Keep runtime schema compatibility explicit**

Update `ensureSchema()` with the new tables and guarded `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`. Do not silently seed rates on every request; the migration owns catalog seeds, while account bootstrap is an idempotent application function used at registration/login.

- [ ] **Step 5: Verify local D1 migration and schema tests**

Run: `cd backend && npm run db:migrate:local && node --test tests/billing-schema.test.cjs && npx tsc --noEmit`

Expected: migration applies once, a second apply is a no-op, tests pass, and TypeScript reports no errors.

- [ ] **Step 6: Commit the schema slice**

```bash
git add backend/drizzle/migrations/0001_membership_credit_billing.sql backend/src/db/schema.ts backend/src/db/client.ts backend/tests/billing-schema.test.cjs
git commit -m "feat(billing): add membership and credit schema"
```

### Task 2: Move JWT Signing to Secrets and Enforce Database-Backed Admin Access

**Files:**
- Create: `backend/src/lib/adminAuth.ts`
- Modify: `backend/src/lib/auth.ts`
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/db/client.ts`
- Modify: `backend/worker-configuration.d.ts`
- Modify: `backend/wrangler.toml`
- Test: `backend/tests/billing-routes.test.cjs`

**Interfaces:**
- Produces: `signJwt(secret: string, payload: JwtClaims, expiresInSeconds?: number): Promise<string>`.
- Produces: `getAuthUser(authHeader: string | null | undefined, secret: string): Promise<JwtPayload | null>`.
- Produces: `requireAdmin(db: ReturnType<typeof getDb>, userId: string): Promise<User>`.
- Produces: `bootstrapAdminRole(db, commaSeparatedEmails): Promise<number>`.

- [ ] **Step 1: Write failing authentication and admin tests**

```js
test('auth has no source-code JWT fallback', () => {
  const source = read('src/lib/auth.ts');
  assert.match(source, /signJwt\(secret: string/);
  assert.match(source, /verifyJwt\(token: string, secret: string/);
  assert.doesNotMatch(source, /const JWT_SECRET\s*=/);
});

test('admin writes use a database role check and audit logging', () => {
  const source = read('src/routes/adminBilling.ts');
  assert.match(source, /requireAdmin\(/);
  assert.match(source, /billingAuditLogs/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail on the hard-coded secret and missing router**

Run: `cd backend && node --test tests/billing-routes.test.cjs`

Expected: FAIL on the current fixed secret and absent admin route.

- [ ] **Step 3: Inject the JWT secret through every auth call**

Change route usage to:

```ts
const authUser = await getAuthUser(c.req.header("Authorization"), c.env.JWT_SECRET);
if (!authUser) return c.json({ detail: "请先登录" }, 401);
```

Registration and login call `signJwt(c.env.JWT_SECRET, claims)`. If `JWT_SECRET` is absent, fail closed with a server configuration error; never fall back to a string in source.

- [ ] **Step 4: Add database-backed admin checks and controlled bootstrap**

```ts
export async function requireAdmin(db: ReturnType<typeof getDb>, userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.role !== "admin") throw new BillingHttpError("ADMIN_REQUIRED", 403);
  return user;
}
```

Parse `BOOTSTRAP_ADMIN_EMAILS` as trimmed lowercase emails and update only matching existing users. Call bootstrap once from schema initialization, log only the count, and never return the bootstrap list through APIs.

- [ ] **Step 5: Document and type the bindings**

Add non-secret `PLATFORM_BILLING_ENABLED = "false"` to `wrangler.toml`. Add comments listing required secrets and configure them outside git with `wrangler secret put`; do not place secret values in the repository.

- [ ] **Step 6: Run auth regression and type validation**

Run: `cd backend && npm test && npx tsc --noEmit`

Expected: all auth and existing authorization tests pass; no hard-coded JWT signing secret remains.

- [ ] **Step 7: Commit the security slice**

```bash
git add backend/src/lib/auth.ts backend/src/lib/adminAuth.ts backend/src/routes/auth.ts backend/src/db/client.ts backend/worker-configuration.d.ts backend/wrangler.toml backend/tests/billing-routes.test.cjs
git commit -m "fix(auth): secure billing administrator access"
```

### Task 3: Implement Deterministic Quotes and Provider Usage Normalization

**Files:**
- Create: `backend/src/lib/billing/types.ts`
- Create: `backend/src/lib/billing/rates.ts`
- Create: `backend/src/lib/billing/providerUsage.ts`
- Test: `backend/tests/billing-domain.test.cjs`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `BillingUnit = "second" | "image" | "character" | "input_token" | "output_token" | "request"`.
- Produces: `quoteCredits(rate: ModelRateSnapshot, units: UsageUnits): number`.
- Produces: `resolveActiveRate(db, input: { provider: string; model: string; operation: string; at: string }): Promise<ModelRateSnapshot>`.
- Produces: `normalizeProviderUsage(input: ProviderUsageInput): NormalizedUsage`.
- Produces: error class `BillingHttpError(code, status, details?)` using the approved error codes.

- [ ] **Step 1: Write failing quote tests using Node 24 type stripping**

Add script:

```json
"test:billing": "node --experimental-strip-types --test tests/billing-*.test.cjs"
```

Test exact approved outputs:

```js
test('approved rates quote exact integer credits', () => {
  assert.equal(quoteCredits(rate('second', 80), { seconds: 4 }), 320);
  assert.equal(quoteCredits(rate('request', 280), { requests: 1 }), 280);
  assert.equal(quoteCredits(rate('image', 45), { images: 1 }), 45);
  assert.equal(quoteCredits(rate('character', 20, 1_000_000), { characters: 73 }), 1);
});
```

Also test unknown rate → `RATE_NOT_CONFIGURED`, all non-zero LLM/TTS calls have a minimum of 1 Credit, and calculation uses `Math.ceil(numerator / denominator)` only after validating safe integer bounds.

- [ ] **Step 2: Run the focused tests and confirm missing module failures**

Run: `cd backend && npm run test:billing`

Expected: FAIL because the billing domain modules do not exist.

- [ ] **Step 3: Implement immutable rate snapshots and integer quote math**

```ts
export function quoteCredits(rate: ModelRateSnapshot, usage: UsageUnits): number {
  const units = unitsForRate(rate.unit, usage);
  if (units === 0) return 0;
  const credits = Math.ceil((units * rate.creditsNumerator) / rate.creditsDenominator);
  return Math.max(rate.minimumCredits, credits);
}
```

Validate all operands with `Number.isSafeInteger`, reject negative usage, and serialize the full rate snapshot into the quote so later rate changes cannot alter it.

- [ ] **Step 4: Normalize real provider metadata**

Support OpenRouter `usage.prompt_tokens`, `usage.completion_tokens`, image count/output size, TTS input character count, MiniMax/BytePlus requested and returned duration, resolution, provider task ID, and provider-reported cost when present. Return `usageComplete=false` when actual units are absent instead of inventing zeros.

- [ ] **Step 5: Run domain tests and TypeScript validation**

Run: `cd backend && npm run test:billing && npx tsc --noEmit`

Expected: all approved quote cases and incomplete-usage cases pass.

- [ ] **Step 6: Commit the quote slice**

```bash
git add backend/src/lib/billing backend/tests/billing-domain.test.cjs backend/package.json
git commit -m "feat(billing): add versioned rate quotations"
```

### Task 4: Implement Accounts, Lots, Ledger, Memberships, and Admin Mutations

**Files:**
- Create: `backend/src/lib/billing/ledger.ts`
- Create: `backend/src/routes/adminBilling.ts`
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/tests/billing-domain.test.cjs`
- Test: `backend/tests/billing-routes.test.cjs`

**Interfaces:**
- Consumes: schema exports and `requireAdmin` from Tasks 1–2.
- Produces: `ensureFreeAccount(db, userId, now, idempotencyKey): Promise<CreditAccount>`.
- Produces: `grantCredits(db, input: GrantInput): Promise<LedgerResult>`.
- Produces: `holdCredits(db, input: HoldInput): Promise<LedgerResult>`.
- Produces: `settleHeldCredits(db, input: SettleInput): Promise<LedgerResult>`.
- Produces: `releaseHeldCredits(db, input: ReleaseInput): Promise<LedgerResult>`.
- Produces: admin routes mounted at `/api/admin`.

- [ ] **Step 1: Add failing lot-order, expiry, concurrency, and idempotency tests**

```js
test('hold consumes earliest expiring promotional lots before purchased FIFO', async () => {
  await grant('membership', 100, '2026-10-01T00:00:00Z');
  await grant('purchase', 100, null);
  await grant('signup', 50, '2026-09-20T00:00:00Z');
  const hold = await holdCredits({ credits: 120, idempotencyKey: 'job:1:hold' });
  assert.deepEqual(hold.allocations.map(x => [x.source, x.credits]), [['signup', 50], ['membership', 70]]);
});
```

Add cases for expired lots, duplicate grant/hold/settle, insufficient balance, concurrent holds against one account, reversal rather than ledger mutation, and membership renewal creating exactly one new lot.

- [ ] **Step 2: Run focused tests and observe missing ledger operations**

Run: `cd backend && npm run test:billing`

Expected: FAIL on missing ledger functions.

- [ ] **Step 3: Implement each mutation as one D1 transaction or guarded batch**

Use compare-and-swap on `credit_accounts.version` and retry a small bounded number of conflicts. A hold writes both account deltas and per-lot allocations to ledger metadata. Settlement converts only the held allocations; release restores the original lots. Return the existing result when the idempotency key already exists.

- [ ] **Step 4: Bootstrap accounts at registration and safe login repair**

After inserting a user, call:

```ts
await ensureFreeAccount(db, userId, now, `signup:${userId}`);
```

Login may call the same idempotent function to repair accounts missed during deployment, but it must never renew the 200-Credit grant.

- [ ] **Step 5: Implement audited administrator mutations**

Validate bodies with Zod. `GET /billing/users?query=` searches exact user ID or normalized email and returns only ID, email, username, role, plan, and balance. Membership registration accepts `user_id`, `plan_code`, `starts_at`, `external_payment_reference`, `reason`, and `idempotency_key`; derive `ends_at` and Credit from the stored plan version. Adjustment accepts signed `credits`, requires a non-empty reason, and creates a new lot or a reversal-backed debit. Rate creation closes the prior effective version and inserts a new version in one guarded operation.

```ts
const membershipInput = z.object({
  user_id: z.string().uuid(),
  plan_code: z.enum(["creator", "studio"]),
  starts_at: z.string().datetime(),
  external_payment_reference: z.string().min(1).max(120),
  reason: z.string().min(3).max(500),
  idempotency_key: z.string().min(8).max(160),
});
```

- [ ] **Step 6: Verify ledger and authorization behavior**

Run: `cd backend && npm run test:billing && npm test && npx tsc --noEmit`

Expected: non-admin requests return `ADMIN_REQUIRED`; every successful mutation has one audit row; duplicate requests have one financial effect.

- [ ] **Step 7: Commit the wallet/admin slice**

```bash
git add backend/src/lib/billing/ledger.ts backend/src/routes/adminBilling.ts backend/src/routes/auth.ts backend/src/index.ts backend/tests/billing-domain.test.cjs backend/tests/billing-routes.test.cjs
git commit -m "feat(billing): add credit ledger and membership administration"
```

### Task 5: Add User Billing APIs and the Charge State Machine

**Files:**
- Create: `backend/src/lib/billing/charges.ts`
- Create: `backend/src/lib/providerCredentials.ts`
- Create: `backend/src/routes/billing.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/tests/billing-domain.test.cjs`
- Test: `backend/tests/billing-routes.test.cjs`

**Interfaces:**
- Consumes: `resolveActiveRate`, `quoteCredits`, and ledger functions.
- Produces: `createQuote(db, QuoteInput): Promise<QuoteResult>`.
- Produces: `holdCharge(db, chargeId, userId): Promise<ChargeResult>`.
- Produces: `markChargeSubmitted(db, chargeId, generationJobId, externalTaskId): Promise<ChargeResult>`.
- Produces: `settleCharge(db, chargeId, actualUsage): Promise<ChargeResult>`.
- Produces: `releaseCharge(db, chargeId, evidence): Promise<ChargeResult>`.
- Produces: `requireReconciliation(db, chargeId, reason): Promise<ChargeResult>`.
- Produces: `resolveProviderCredential(env, userSettings, channel): { source: "platform" | "byok"; apiKey: string }`.
- Produces: user routes mounted at `/api/billing`.

- [ ] **Step 1: Write failing state-transition tests**

Test the permitted graph:

```ts
quoted -> held -> submitted -> processing -> settled
quoted -> held -> released
held|submitted|processing -> reconciliation_required
reconciliation_required -> settled|released
```

Reject `settled -> released`, duplicate generation-job settlement, expired quote hold, and actual usage above estimate when extra balance is unavailable.

- [ ] **Step 2: Run the focused suite and confirm missing state-machine failures**

Run: `cd backend && npm run test:billing`

Expected: FAIL on missing charge transitions.

- [ ] **Step 3: Implement quote expiry and billing-mode resolution**

`createQuote` stores `expires_at` five minutes after creation. Determine `platform`, `byok`, or `shadow` on the server from the credential actually selected and `PLATFORM_BILLING_ENABLED`; ignore client attempts to choose zero-cost mode.

Credential selection is explicit and server-only:

```ts
export function resolveProviderCredential(env: Bindings, settings: UserSettings, channel: ProviderChannel) {
  const byok = keyForChannel(settings, channel);
  if (byok) return { source: "byok" as const, apiKey: byok };
  const platform = platformKeyForChannel(env, channel);
  if (platform) return { source: "platform" as const, apiKey: platform };
  throw new BillingHttpError("PROVIDER_CREDENTIAL_MISSING", 503);
}
```

- [ ] **Step 4: Implement user endpoints with ownership binding**

`GET /account` returns plan, available, held, total expiring within 7/30 days, and lots. `POST /quote` allows only whitelisted operations and validates project/shot ownership. `GET /ledger` always filters on `authUser.userId`, accepts cursor/limit only, and never accepts a body user ID.

- [ ] **Step 5: Standardize billing errors**

Return JSON shaped as:

```ts
{
  detail: "积分不足",
  error_code: "INSUFFICIENT_CREDITS",
  billing: { required_credits: 320, available_credits: 200 }
}
```

Map all approved error codes to stable 4xx/409 responses; redact provider bodies and secrets from `details`.

- [ ] **Step 6: Verify routes and state transitions**

Run: `cd backend && npm run test:billing && npm test && npx tsc --noEmit`

Expected: account/quote/ledger isolation and every legal/illegal transition are covered.

- [ ] **Step 7: Commit the charge slice**

```bash
git add backend/src/lib/billing/charges.ts backend/src/lib/providerCredentials.ts backend/src/routes/billing.ts backend/src/index.ts backend/tests/billing-domain.test.cjs backend/tests/billing-routes.test.cjs
git commit -m "feat(billing): add quotes and charge lifecycle"
```

### Task 6: Meter Director LLM and Image Generation

**Files:**
- Modify: `backend/src/routes/generation.ts`
- Modify: `backend/src/agents/director/pipeline.ts`
- Test: `backend/tests/billing-generation-integration.test.cjs`

**Interfaces:**
- Consumes: charge lifecycle from Task 5 and provider normalization from Task 3.
- Produces: all director/image generation responses include `billing: { charge_id, mode, estimated_credits, actual_credits, status }`.
- Produces: each platform LLM/image provider call has one linked `generation_jobs` and one `usage_charges` row.

- [ ] **Step 1: Write failing provider-boundary tests**

Cover platform image success, BYOK image success, platform LLM usage response, provider rejection before task acceptance, fetch timeout after possible acceptance, missing rate, and duplicate client idempotency keys. Assert hold occurs before fake `fetch`, BYOK debits zero, and incomplete usage enters reconciliation.

- [ ] **Step 2: Run the integration test and confirm generation routes bypass billing**

Run: `cd backend && node --test tests/billing-generation-integration.test.cjs`

Expected: FAIL because current routes call providers without a charge.

- [ ] **Step 3: Return LLM usage from the director pipeline**

Change the pipeline return to include:

```ts
providerUsage?: {
  promptTokens?: number;
  completionTokens?: number;
  providerCostMicrousd?: number;
  usageComplete: boolean;
};
```

Rule-based fallback produces no paid provider charge. Real provider responses preserve their usage object without logging prompts, API keys, or raw sensitive response bodies.

- [ ] **Step 4: Wrap each paid call with quote/hold/finalize**

Create `generation_jobs` and charge before provider submission. Platform mode holds first; BYOK records a zero-Credit charge. On an HTTP response proving rejection before acceptance, release. On timeout, connection reset, malformed acceptance response, or missing actual usage, mark `reconciliation_required`. On success with complete usage, settle.

- [ ] **Step 5: Remove unmetered async image paths**

The batch image loops used by `/from-story` and `/from-script` must create one charge per image or call the same metered single-image service. Do not leave background `waitUntil()` calls that can spend platform funds without a charge record.

- [ ] **Step 6: Run generation, authorization, and type tests**

Run: `cd backend && node --test tests/billing-generation-integration.test.cjs && npm test && npx tsc --noEmit`

Expected: every real LLM/image provider boundary has a charge; all legacy routes still pass.

- [ ] **Step 7: Commit the LLM/image integration**

```bash
git add backend/src/routes/generation.ts backend/src/agents/director/pipeline.ts backend/tests/billing-generation-integration.test.cjs
git commit -m "feat(billing): meter storyboard generation"
```

### Task 7: Meter Video and TTS Across Asynchronous Completion

**Files:**
- Modify: `backend/src/routes/video.ts`
- Modify: `backend/src/routes/tts.ts`
- Modify: `backend/src/lib/videoJobState.ts`
- Test: `backend/tests/billing-generation-integration.test.cjs`
- Test: `backend/tests/video-provider-endpoint.test.cjs`

**Interfaces:**
- Consumes: charge lifecycle and provider usage normalizer.
- Produces: `generation_jobs.result_metadata.billing_charge_id` and response `billing` summaries.
- Produces: video polling finalizes the existing charge exactly once; it never creates a second charge.

- [ ] **Step 1: Write failing asynchronous billing tests**

Test H3 4 seconds → 320 Credits, Hailuo-02 6 seconds → 280 Credits, TTS 73 characters → minimum 1 Credit, duplicate polling → one settlement, provider failure-before-acceptance → release, provider accepted-but-status-unknown → reconciliation, and BYOK → zero debit.

- [ ] **Step 2: Run tests and observe missing charge linkage**

Run: `cd backend && node --test tests/billing-generation-integration.test.cjs tests/video-provider-endpoint.test.cjs`

Expected: FAIL because generation jobs do not reference billing charges.

- [ ] **Step 3: Hold before video task creation and link IDs**

For `POST /video/:shotId`, compute the duration/resolution quote from `providerRequest`, create and hold the charge, reserve the generation job, then call the provider. Store `billing_charge_id` in result metadata and return it to the client.

- [ ] **Step 4: Settle only from terminal provider evidence**

In `/poll`, reuse the linked charge. Provider success with known output duration settles; explicit provider rejection releases only when its billing semantics prove no charge; unknown/transport failure keeps the hold and moves to reconciliation. Duplicate polls return the settled record.

- [ ] **Step 5: Meter TTS tests and saved dialogue TTS**

The saved `POST /tts/:dialogueId` route uses the actual normalized spoken-text character count. The audition `/tts/test` route also needs a quote/charge in platform mode because it spends provider resources; BYOK remains zero Credit. Successful audio settles after non-empty audio validation and R2 persistence; ambiguous provider/network failures reconcile.

- [ ] **Step 6: Run all backend tests and dry-run the Worker build**

Run: `cd backend && npm run test:billing && npm test && npx tsc --noEmit && npm run deploy -- --dry-run`

Expected: all suites pass and Wrangler produces a Worker bundle without publishing.

- [ ] **Step 7: Commit video/TTS billing**

```bash
git add backend/src/routes/video.ts backend/src/routes/tts.ts backend/src/lib/videoJobState.ts backend/tests/billing-generation-integration.test.cjs backend/tests/video-provider-endpoint.test.cjs
git commit -m "feat(billing): meter video and speech generation"
```

### Task 8: Add User Billing UX and Quote Confirmation

**Files:**
- Create: `frontend/src/types/billing.ts`
- Create: `frontend/src/stores/billingStore.ts`
- Create: `frontend/src/components/billing/CreditBalanceBadge.tsx`
- Create: `frontend/src/components/billing/BillingAccountPanel.tsx`
- Create: `frontend/src/components/billing/GenerationQuoteDialog.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/stores/authStore.ts`
- Modify: `frontend/src/components/workspace/TopBar.tsx`
- Modify: `frontend/src/components/ui/UserMenuDropdown.tsx`
- Modify: `frontend/src/components/workspace/kanban/ProductionKanbanView.tsx`
- Modify: `frontend/src/app/workspace/[projectId]/WorkspaceClient.tsx`
- Modify: `frontend/src/data/modelCatalog.ts`
- Test: `frontend/tests/billing-ui.test.cjs`

**Interfaces:**
- Consumes: `/api/billing/account`, `/api/billing/quote`, `/api/billing/ledger`, and generation response billing objects.
- Produces: `useBillingStore` methods `refreshAccount()`, `requestQuote(input)`, `clearQuote()`.
- Produces: reusable `GenerationQuoteDialog` that returns confirmation or cancellation without itself starting generation.

- [ ] **Step 1: Write failing UI contract tests**

```js
test('quote dialog distinguishes platform and BYOK billing', () => {
  const source = read('src/components/billing/GenerationQuoteDialog.tsx');
  assert.match(source, /预计消耗/);
  assert.match(source, /自带密钥，不扣模型 Credit/);
  assert.match(source, /冻结/);
});
```

Also assert the top bar renders `CreditBalanceBadge`, the account panel includes available/held/expiry/ledger, and `checkAuthAndKey` no longer rejects all users lacking BYOK when platform billing is available.

- [ ] **Step 2: Run UI tests and confirm missing components**

Run: `cd frontend && node --test tests/billing-ui.test.cjs`

Expected: FAIL because billing UI files do not exist.

- [ ] **Step 3: Add typed API and store state**

Define `BillingAccount`, `BillingQuote`, `BillingChargeSummary`, and `LedgerEntry` with integer Credit fields. Refresh the account after login, registration, generation settlement, release, or an `INSUFFICIENT_CREDITS` response. Clear billing state on logout.

- [ ] **Step 4: Add compact balance and account details**

The top bar badge shows `可用 N` and a small held indicator only when non-zero. The account panel shows plan dates, expiring within 7/30 days, recharge Credit, and paginated ledger descriptions. It must not render supplier cost or internal margin to ordinary users.

- [ ] **Step 5: Require a server quote before paid generation**

Image, video, TTS, and director actions call `/billing/quote`, then show model, operation, units, mode, estimated Credit, remaining balance, and five-minute expiry. Confirmation passes the quote ID/idempotency key to the generation request. BYOK copy says “自带密钥，不扣模型 Credit”; it must not imply the external provider is free.

- [ ] **Step 6: Normalize billing failures into actionable UI**

`INSUFFICIENT_CREDITS` opens the account panel; `QUOTE_EXPIRED` requests a fresh quote; `RATE_NOT_CONFIGURED` explains that platform generation is temporarily unavailable and suggests BYOK only if configured; `RECONCILIATION_REQUIRED` shows frozen Credit and pending reconciliation rather than failure/refund language.

- [ ] **Step 7: Run frontend tests and production build**

Run: `cd frontend && npm test && npm run build`

Expected: tests and Next.js production build pass with no TypeScript error.

- [ ] **Step 8: Commit the user billing UX**

```bash
git add frontend/src/types/billing.ts frontend/src/stores/billingStore.ts frontend/src/components/billing frontend/src/lib/api.ts frontend/src/stores/authStore.ts frontend/src/components/workspace/TopBar.tsx frontend/src/components/ui/UserMenuDropdown.tsx frontend/src/components/workspace/kanban/ProductionKanbanView.tsx frontend/src/app/workspace/'[projectId]'/WorkspaceClient.tsx frontend/src/data/modelCatalog.ts frontend/tests/billing-ui.test.cjs
git commit -m "feat(billing): add credit balance and generation quotes"
```

### Task 9: Add the Administrator Billing Console

**Files:**
- Create: `frontend/src/app/admin/billing/page.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/ui/UserMenuDropdown.tsx`
- Test: `frontend/tests/billing-ui.test.cjs`

**Interfaces:**
- Consumes: admin endpoints from Task 4 and account role returned by `/api/auth/me`.
- Produces: one role-gated admin page for membership registration, Credit adjustment, rate publication, usage summary, and reconciliation.

- [ ] **Step 1: Add failing admin interaction contracts**

Assert the page checks `user.role === "admin"`, requires `reason` and `idempotency_key` for mutations, shows a confirmation summary, displays effective rate versions, and lists `reconciliation_required` charges.

- [ ] **Step 2: Run UI tests and observe the missing page failure**

Run: `cd frontend && node --test tests/billing-ui.test.cjs`

Expected: FAIL because `/admin/billing` is absent.

- [ ] **Step 3: Implement role-gated admin forms**

Search users by exact email or ID and submit the returned immutable user ID. Use exact plan codes from the API. Membership registration shows the derived end date and Credit before confirmation. Adjustment supports positive/negative integers but disables submission without a reason. Rate publication shows old/new values and effective timestamp; it never edits an existing version in place.

- [ ] **Step 4: Implement summary and reconciliation queue**

Show totals by provider, model, status, and user; separate provider cost, settled Credit, held Credit, and unknown cost. Reconciliation actions display provider evidence and allow only “再次查询”, “确认结算”, or “确认未计费并释放”, each with a reason and confirmation.

- [ ] **Step 5: Verify unauthorized and authorized rendering**

Run: `cd frontend && npm test && npm run build`

Expected: non-admin users see a 403-style access page and no admin menu entry; admin build/tests pass.

- [ ] **Step 6: Commit the admin console**

```bash
git add frontend/src/app/admin/billing/page.tsx frontend/src/lib/api.ts frontend/src/components/ui/UserMenuDropdown.tsx frontend/tests/billing-ui.test.cjs
git commit -m "feat(billing): add administrator billing console"
```

### Task 10: Add Historical Estimates, Cost Reporting, and Rollout Controls

**Files:**
- Create: `backend/src/services/historicalCostEstimate.ts`
- Modify: `backend/src/routes/production.ts`
- Modify: `backend/src/routes/adminBilling.ts`
- Modify: `backend/wrangler.toml`
- Test: `backend/tests/billing-domain.test.cjs`
- Test: `backend/tests/production-authorization.test.cjs`

**Interfaces:**
- Produces: `estimateHistoricalJob(job, rateSnapshot): HistoricalEstimate` with `isEstimate=true`, source URL, rate version, and no ledger ID.
- Produces: cost summaries with separate `actual`, `estimated`, `unknown`, `credit_settled`, and `credit_held` buckets.

- [ ] **Step 1: Write failing historical-boundary tests**

Test that pre-cutover jobs can receive estimates but never receive `usage_charges`, ledger debits, or synthetic actual costs. Test the current 26-job pattern: 11 Seedream images, 3 Hailuo 6-second clips, 6 H3 4-second clips, 4 TTS jobs, and 2 failed H3 jobs remain outside retroactive billing.

- [ ] **Step 2: Run tests and confirm current summaries conflate zero and unknown**

Run: `cd backend && npm run test:billing && npm test`

Expected: FAIL until summaries expose the explicit distinction.

- [ ] **Step 3: Implement read-only estimation and reporting**

Use the job’s stored model, parameters, status, and timestamps with the closest applicable rate snapshot. Mark failed jobs as `unknown` unless provider evidence proves no cost. Never update `generation_jobs.cost_amount` with an estimate; return estimates as a separate API field.

- [ ] **Step 4: Enforce the rollout flag in one server function**

Centralize:

```ts
export function billingModeForCredential(flag: string | undefined, credentialSource: 'platform' | 'byok') {
  if (credentialSource === 'byok') return 'byok';
  return flag === 'true' ? 'platform' : 'shadow';
}
```

All generation routes must use this function. Shadow mode records quotes and normalized usage but neither holds nor settles Credit.

- [ ] **Step 5: Run complete backend verification**

Run: `cd backend && npm run db:migrate:local && npm run test:billing && npm test && npx tsc --noEmit && npm run deploy -- --dry-run`

Expected: tests pass, history is not charged, and the bundle builds.

- [ ] **Step 6: Commit reporting and rollout controls**

```bash
git add backend/src/services/historicalCostEstimate.ts backend/src/routes/production.ts backend/src/routes/adminBilling.ts backend/wrangler.toml backend/tests/billing-domain.test.cjs backend/tests/production-authorization.test.cjs
git commit -m "feat(billing): report estimates and gate live charging"
```

### Task 11: Validate Shadow Billing, Then Enable a Controlled Real-Money Canary

**Files:**
- Create: `backend/tests/billing-e2e.mjs`
- Modify: `frontend/src/data/releaseNotes.ts`
- Modify: `docs/superpowers/specs/2026-09-14-membership-credit-billing-design.md`

**Interfaces:**
- Consumes: deployed user/admin APIs and all four metered provider paths.
- Produces: a dated acceptance record in the spec appendix and a concise release note only after evidence is captured.

- [ ] **Step 1: Create an opt-in E2E test with strict environment guards**

Require `BILLING_E2E_BASE_URL`, `BILLING_E2E_TOKEN`, and explicit `BILLING_E2E_ALLOW_SPEND=true`. The test requests a quote, performs one bounded image, video, TTS, and LLM call, polls terminal states, and compares `generation_jobs`, `usage_charges`, ledger entries, and provider IDs. Never print access tokens or API keys.

- [ ] **Step 2: Deploy schema and code with charging disabled**

Run local validation first, apply the remote D1 migration, deploy the backend with `PLATFORM_BILLING_ENABLED=false`, then deploy the frontend. Verify existing users have one Free grant and historical jobs have no debit entries.

- [ ] **Step 3: Observe shadow mode for representative calls**

For image, video, TTS, and LLM, confirm quote accuracy, normalized actual usage, BYOK detection, no Credit debit, no secret leakage, and no orphaned charges. Correct any mismatch before enabling charging.

- [ ] **Step 4: Enable a single-account platform-billing canary**

Set the production flag to true only after a backed-up D1 state and verified platform credentials. Use an administrator-controlled test account with enough purchased Credit and bounded prompts/durations. Run:

```bash
BILLING_E2E_BASE_URL=https://storyboarding-api.caifu.social \
BILLING_E2E_ALLOW_SPEND=true \
node backend/tests/billing-e2e.mjs
```

Before running, export `BILLING_E2E_TOKEN` from the authenticated test session in the shell without writing it to command history or the repository.

Expected: each provider task has one charge, actual settlement matches the active rate snapshot, balance deltas equal ledger deltas, and repeated polling/retry changes nothing.

- [ ] **Step 5: Exercise failure and rollback paths**

Use fake-provider/local integration tests for rejection, timeout, duplicate callback, insufficient Credit, and actual-over-estimate. In production, verify the flag can be returned to false without deleting charges or releasing uncertain holds.

- [ ] **Step 6: Record acceptance evidence and release notes**

Append the deployment timestamp, migration version, tested account ID (not email), job/charge IDs, four-way reconciliation result, known limitations, and rollback state to the design document. Add a user-facing release note that explains memberships, Credit, BYOK, and pending reconciliation in plain language.

- [ ] **Step 7: Run final repository checks**

Run: `git diff --check && npm test --prefix backend && npm run test:billing --prefix backend && npx tsc --noEmit -p backend/tsconfig.json && npm test --prefix frontend && npm run build --prefix frontend && npm run build:backend`

Expected: every command passes; `git status --short` contains only the intended acceptance/release changes.

- [ ] **Step 8: Commit the verified rollout**

```bash
git add backend/tests/billing-e2e.mjs frontend/src/data/releaseNotes.ts docs/superpowers/specs/2026-09-14-membership-credit-billing-design.md
git commit -m "docs: record billing rollout acceptance"
```

## Final Review Gate

Before merging or pushing:

- Confirm every spec section maps to at least one task above.
- Search for unmetered `fetch()` calls in generation, director, video, and TTS paths.
- Confirm no production secret or test token appears in the staged diff.
- Run `git diff --cached --check`.
- Verify D1 migration status locally and remotely.
- Confirm the branch contains only scoped commits and the working tree is clean.
- Push only after the user explicitly requests remote publication or the execution request includes it.
