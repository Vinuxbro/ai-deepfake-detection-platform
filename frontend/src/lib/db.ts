// Data layer using Node's built-in SQLite (node:sqlite) — no ORM, no codegen.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { randomUUID } from "node:crypto";

type G = typeof globalThis & { __dfDb?: DatabaseSync };
const g = globalThis as G;

function init(): DatabaseSync {
  const db = new DatabaseSync(path.join(process.cwd(), "data.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      verdict TEXT NOT NULL,
      confidence REAL NOT NULL,
      probFake REAL NOT NULL,
      probReal REAL NOT NULL,
      gradcam TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(userId, createdAt DESC);
  `);
  return db;
}

export const db: DatabaseSync = g.__dfDb ?? init();
if (process.env.NODE_ENV !== "production") g.__dfDb = db;

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password: string;
  createdAt: number;
}
export interface ScanRow {
  id: string;
  userId: string;
  verdict: string;
  confidence: number;
  probFake: number;
  probReal: number;
  gradcam: string | null;
  createdAt: number;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
}

export function createUser(email: string, name: string | null, password: string): UserRow {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO users (id, email, name, password, createdAt) VALUES (?, ?, ?, ?, ?)",
  ).run(id, email, name, password, Date.now());
  return { id, email, name, password, createdAt: Date.now() };
}

export function insertScan(s: {
  userId: string;
  verdict: string;
  confidence: number;
  probFake: number;
  probReal: number;
  gradcam: string;
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO scans (id, userId, verdict, confidence, probFake, probReal, gradcam, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, s.userId, s.verdict, s.confidence, s.probFake, s.probReal, s.gradcam, Date.now());
  return id;
}

export function listScans(userId: string, limit = 100): ScanRow[] {
  return db
    .prepare("SELECT * FROM scans WHERE userId = ? ORDER BY createdAt DESC LIMIT ?")
    .all(userId, limit) as ScanRow[];
}

export function scanStats(userId: string): { total: number; fake: number; real: number } {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN verdict = 'fake' THEN 1 ELSE 0 END) AS fake,
         SUM(CASE WHEN verdict = 'real' THEN 1 ELSE 0 END) AS real
       FROM scans WHERE userId = ?`,
    )
    .get(userId) as { total: number; fake: number | null; real: number | null };
  return { total: row.total ?? 0, fake: row.fake ?? 0, real: row.real ?? 0 };
}
