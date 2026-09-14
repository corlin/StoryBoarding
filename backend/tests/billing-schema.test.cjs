const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const migrationPath = path.join(__dirname, "../drizzle/migrations/0001_membership_credit_billing.sql");

function runSqlite(databasePath, sql) {
  const result = spawnSync("sqlite3", [databasePath], {
    input: sql,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test("billing migration creates constrained integer accounts and idempotent ledger keys", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-billing-schema-"));
  const databasePath = path.join(tempDir, "billing.sqlite");
  try {
    runSqlite(databasePath, `
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT);
      CREATE TABLE generation_jobs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL);
      INSERT INTO users (id, email, username, password_hash, salt)
      VALUES ('user-1', 'first@example.com', 'first', 'hash', 'salt');
    `);

    const migration = fs.readFileSync(migrationPath, "utf8");
    runSqlite(databasePath, migration);

    const tables = runSqlite(databasePath, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").split("\n");
    for (const table of [
      "membership_plans",
      "user_memberships",
      "credit_accounts",
      "credit_lots",
      "credit_ledger",
      "model_rates",
      "usage_charges",
      "billing_audit_logs",
    ]) {
      assert.ok(tables.includes(table), `missing ${table}`);
    }

    assert.equal(runSqlite(databasePath, "SELECT available_credits || ':' || held_credits FROM credit_accounts WHERE user_id='user-1';"), "200:0");
    assert.equal(runSqlite(databasePath, "SELECT source || ':' || granted_credits || ':' || remaining_credits FROM credit_lots WHERE user_id='user-1';"), "signup:200:200");
    assert.equal(runSqlite(databasePath, "SELECT COUNT(*) FROM credit_ledger WHERE user_id='user-1' AND entry_type='grant';"), "1");
    assert.equal(runSqlite(databasePath, "SELECT COUNT(*) FROM usage_charges;"), "0");

    const negativeBalance = spawnSync("sqlite3", [databasePath], {
      input: "UPDATE credit_accounts SET available_credits=-1 WHERE user_id='user-1';",
      encoding: "utf8",
    });
    assert.notEqual(negativeBalance.status, 0, "negative available balance must be rejected");

    const duplicateKey = spawnSync("sqlite3", [databasePath], {
      input: `INSERT INTO credit_ledger (id, user_id, entry_type, available_delta, held_delta, available_after, held_after, idempotency_key, reason)
              VALUES ('duplicate', 'user-1', 'grant', 0, 0, 200, 0, 'migration:2026-09-14:signup:user-1', 'duplicate');`,
      encoding: "utf8",
    });
    assert.notEqual(duplicateKey.status, 0, "duplicate ledger idempotency key must be rejected");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Drizzle schema exports every billing table used by application services", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      "const m = await import('./src/db/schema.ts'); console.log(JSON.stringify(Object.keys(m).sort()))",
    ],
    { cwd: path.join(__dirname, ".."), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const exports = JSON.parse(result.stdout.trim());
  for (const name of [
    "membershipPlans",
    "userMemberships",
    "creditAccounts",
    "creditLots",
    "creditLedger",
    "modelRates",
    "usageCharges",
    "billingAuditLogs",
  ]) {
    assert.ok(exports.includes(name), `missing Drizzle export ${name}`);
  }
});
