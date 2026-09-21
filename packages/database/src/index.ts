import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import {
  AppError,
  entitySchema,
  references,
  type Entity,
  type EntityType,
} from "../../schema/src/index.js";
export class Database {
  readonly sql: DatabaseSync;
  constructor(public dir: string) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.sql = new DatabaseSync(join(dir, "company.db"));
    chmodSync(join(dir, "company.db"), 0o600);
    this.sql.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    const version = Number(
      this.sql.prepare("PRAGMA user_version").get()?.user_version,
    );
    if (version > 1)
      throw new AppError(
        "DATABASE_VERSION",
        "Database is newer than this runtime.",
        409,
      );
    this.sql.exec(`
 CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,type TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)));
 CREATE INDEX IF NOT EXISTS entity_type ON entities(type,id);
 CREATE TABLE IF NOT EXISTS refs(source TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,field TEXT NOT NULL,target TEXT NOT NULL REFERENCES entities(id) DEFERRABLE INITIALLY DEFERRED,PRIMARY KEY(source,field,target));
 CREATE INDEX IF NOT EXISTS refs_target ON refs(target,field);
 CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,state TEXT NOT NULL,data TEXT NOT NULL);
 CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,type UNINDEXED,title,body);
 PRAGMA user_version=1;`);
  }
  transaction<T>(fn: () => T): T {
    this.sql.exec("BEGIN IMMEDIATE");
    try {
      const v = fn();
      this.sql.exec("COMMIT");
      return v;
    } catch (e) {
      this.sql.exec("ROLLBACK");
      throw e;
    }
  }
  put(entity: Entity) {
    const e = entitySchema.parse(entity);
    const existing = this.sql
      .prepare("SELECT 1 FROM entities WHERE id=?")
      .get(e.id);
    this.sql
      .prepare(
        "INSERT INTO entities VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(e.id, e.type, JSON.stringify(e));
    this.sql.prepare("DELETE FROM refs WHERE source=?").run(e.id);
    const ref = this.sql.prepare("INSERT OR IGNORE INTO refs VALUES(?,?,?)");
    for (const [field, target] of references(e)) ref.run(e.id, field, target);
    if (existing) this.sql.prepare("DELETE FROM search WHERE id=?").run(e.id);
    this.sql
      .prepare("INSERT INTO search VALUES(?,?,?,?)")
      .run(
        e.id,
        e.type,
        e.displayName ?? e.name ?? e.title ?? e.subject ?? e.id,
        [e.body, e.description, e.email, e.eventType].filter(Boolean).join(" "),
      );
  }
  get(id: string): Entity | undefined {
    const row = this.sql
      .prepare("SELECT data FROM entities WHERE id=?")
      .get(id);
    return row ? (JSON.parse(String(row.data)) as Entity) : undefined;
  }
  all(type?: EntityType): Entity[] {
    return (
      type
        ? this.sql
            .prepare("SELECT data FROM entities WHERE type=? ORDER BY id")
            .all(type)
        : this.sql.prepare("SELECT data FROM entities ORDER BY id").all()
    ).map((r) => JSON.parse(String(r.data)) as Entity);
  }
  meta<T>(key: string): T | undefined {
    const r = this.sql
      .prepare("SELECT value FROM metadata WHERE key=?")
      .get(key);
    return r ? (JSON.parse(String(r.value)) as T) : undefined;
  }
  setMeta(key: string, value: unknown) {
    this.sql
      .prepare(
        "INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, JSON.stringify(value));
  }
  clear() {
    this.sql.exec(
      "DELETE FROM refs; DELETE FROM entities; DELETE FROM search; DELETE FROM metadata; DELETE FROM jobs;",
    );
  }
  close() {
    this.sql.close();
  }
}
