import type { Database } from "db0"

export interface CredentialRecord {
  id: number
  sourceId: string
  domain: string
  cookieValue: string
  createdAt: string
  updatedAt: string
}

export class CredentialTable {
  private db

  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL UNIQUE,
        domain TEXT NOT NULL,
        cookie_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run()
    await this.db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_credentials_source_id ON credentials(source_id);
    `).run()
    logger.success(`init credentials table`)
  }

  async getAll(): Promise<CredentialRecord[]> {
    const rows = await this.db.prepare(`
      SELECT id, source_id as sourceId, domain, cookie_value as cookieValue, created_at as createdAt, updated_at as updatedAt
      FROM credentials
      ORDER BY updated_at DESC
    `).all()
    return (rows as CredentialRecord[]) || []
  }

  async getBySourceId(sourceId: string): Promise<CredentialRecord | undefined> {
    const row = await this.db.prepare(`
      SELECT id, source_id as sourceId, domain, cookie_value as cookieValue, created_at as createdAt, updated_at as updatedAt
      FROM credentials
      WHERE source_id = ?
    `).get(sourceId)
    return row as CredentialRecord | undefined
  }

  async upsert(sourceId: string, domain: string, cookieValue: string): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO credentials (source_id, domain, cookie_value)
      VALUES (?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        domain = excluded.domain,
        cookie_value = excluded.cookie_value,
        updated_at = CURRENT_TIMESTAMP
    `).run(sourceId, domain, cookieValue)
    // Get the id (either new insert or existing)
    const row = await this.getBySourceId(sourceId)
    return row!.id
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM credentials WHERE id = ?
    `).run(id)
    return result.success
  }

  isExpired(credential: CredentialRecord): boolean {
    const updatedAt = new Date(credential.updatedAt).getTime()
    const now = Date.now()
    return (now - updatedAt) > 30 * 24 * 60 * 60 * 1000
  }
}
