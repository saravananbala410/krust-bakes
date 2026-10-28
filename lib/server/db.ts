import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * SQLite database in a single file, exposed with the small subset of the
 * Cloudflare D1 API the store uses (prepare/bind/first/all/run, batch), so
 * the same SQL works unchanged. In production the file lives in the home
 * folder (~/krust-data), because hosts like Hostinger build every deploy in a
 * fresh folder; set DATABASE_PATH to choose where.
 */
type Row = Record<string, unknown>;

class Statement {
  constructor(private db: Database.Database, private sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) { return new Statement(this.db, this.sql, params); }
  private stmt() { return this.db.prepare(this.sql); }
  async first<T = Row>(): Promise<T | null> {
    const s = this.stmt();
    return ((s.reader ? s.get(...this.params) : (s.run(...this.params), undefined)) as T | undefined) ?? null;
  }
  async all<T = Row>(): Promise<{ results: T[] }> {
    const s = this.stmt();
    return { results: (s.reader ? s.all(...this.params) : (s.run(...this.params), [])) as T[] };
  }
  async run() {
    const s = this.stmt();
    if (s.reader) { s.all(...this.params); return { meta: { changes: 0 } }; }
    const info = s.run(...this.params);
    return { meta: { changes: info.changes } };
  }
  /** Synchronous run used inside batch transactions. */
  runSync() {
    const s = this.stmt();
    if (s.reader) s.all(...this.params);
    else s.run(...this.params);
  }
}

export class SqliteD1 {
  constructor(private db: Database.Database) {}
  prepare(sql: string) { return new Statement(this.db, sql); }
  /** Runs all statements in one transaction, like D1's batch. */
  async batch(statements: Statement[]) {
    this.db.transaction(() => statements.forEach((s) => s.runSync()))();
    return statements.map(() => ({ success: true }));
  }
}

let instance: SqliteD1 | null = null;

export function sqliteDatabase(): SqliteD1 {
  if (instance) return instance;
  const legacy = path.join(process.cwd(), "..", "krust-data", "krust.db");
  const file = process.env.DATABASE_PATH || (process.env.NODE_ENV === "production" ? path.join(os.homedir(), "krust-data", "krust.db") : legacy);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // One-time move from the old location next to the build folder, so its orders are kept.
  if (!fs.existsSync(file) && file !== legacy && fs.existsSync(legacy)) {
    const old = new Database(legacy, { readonly: true });
    old.prepare("VACUUM INTO ?").run(file);
    old.close();
  }
  console.log(`Database: ${file}`);
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  instance = new SqliteD1(db);
  return instance;
}
