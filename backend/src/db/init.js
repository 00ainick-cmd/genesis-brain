import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/genesis.db')

// Ensure data directory exists
const dataDir = dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Database wrapper to provide better-sqlite3-like API
class DatabaseWrapper {
  constructor(sqlDb, dbPath) {
    this.sqlDb = sqlDb
    this.dbPath = dbPath
  }

  // Save database to file
  save() {
    const data = this.sqlDb.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(this.dbPath, buffer)
  }

  // Execute multiple SQL statements
  exec(sql) {
    this.sqlDb.run(sql)
    this.save()
  }

  // Prepare a statement (returns object with run, get, all methods)
  prepare(sql) {
    const self = this
    return {
      run(...params) {
        try {
          self.sqlDb.run(sql, params)
          self.save()
          // Get last insert rowid
          const result = self.sqlDb.exec('SELECT last_insert_rowid() as id, changes() as changes')
          return {
            lastInsertRowid: result[0]?.values[0]?.[0] || 0,
            changes: result[0]?.values[0]?.[1] || 0
          }
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql, '\nParams:', params)
          throw error
        }
      },
      get(...params) {
        try {
          const stmt = self.sqlDb.prepare(sql)
          stmt.bind(params)
          if (stmt.step()) {
            const columns = stmt.getColumnNames()
            const values = stmt.get()
            stmt.free()
            const row = {}
            columns.forEach((col, i) => {
              row[col] = values[i]
            })
            return row
          }
          stmt.free()
          return undefined
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql, '\nParams:', params)
          throw error
        }
      },
      all(...params) {
        try {
          const stmt = self.sqlDb.prepare(sql)
          stmt.bind(params)
          const results = []
          const columns = stmt.getColumnNames()
          while (stmt.step()) {
            const values = stmt.get()
            const row = {}
            columns.forEach((col, i) => {
              row[col] = values[i]
            })
            results.push(row)
          }
          stmt.free()
          return results
        } catch (error) {
          console.error('SQL Error:', error.message, '\nSQL:', sql, '\nParams:', params)
          throw error
        }
      }
    }
  }

  pragma(setting) {
    // Ignore pragmas for sql.js compatibility
    console.log('Pragma (ignored for sql.js):', setting)
  }
}

// Global database instance
let db = null

// Schema definition
const schema = `
-- =====================
-- CAPTURE & ACTIONS
-- =====================

CREATE TABLE IF NOT EXISTS inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_input TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_to TEXT,
  ai_notes TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inbox',

  context TEXT,
  energy TEXT,
  time_estimate TEXT,

  project_id INTEGER,
  area_id INTEGER,

  waiting_on TEXT,
  delegated_to TEXT,

  due_date DATE,
  scheduled_date DATE,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  source TEXT,
  ai_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_project ON actions(project_id);
CREATE INDEX IF NOT EXISTS idx_actions_due ON actions(due_date);

-- =====================
-- PROJECTS (PARA P)
-- =====================

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  outcome TEXT,
  success_criteria TEXT,

  area_id INTEGER,
  domain TEXT,

  target_date DATE,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  blocked INTEGER DEFAULT 0,
  blocker_note TEXT,
  priority TEXT,

  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);

-- =====================
-- AREAS (PARA A)
-- =====================

CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  domain TEXT,

  description TEXT,
  standard TEXT,
  responsibilities TEXT,

  health TEXT DEFAULT 'healthy',
  last_review DATE,
  review_notes TEXT,
  review_frequency TEXT DEFAULT 'monthly',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- RESOURCES (PARA R)
-- =====================

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  domain TEXT,

  description TEXT,
  content TEXT,
  location TEXT,

  tags TEXT,
  area_id INTEGER,

  version TEXT,
  last_updated DATE,
  update_frequency TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_domain ON resources(domain);

-- =====================
-- ARCHIVES (PARA A)
-- =====================

CREATE TABLE IF NOT EXISTS archives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_type TEXT NOT NULL,
  original_id INTEGER,
  name TEXT NOT NULL,
  data TEXT,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

-- =====================
-- AI MEMORY
-- =====================

CREATE TABLE IF NOT EXISTS ai_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  domain TEXT,
  content TEXT NOT NULL,

  confidence TEXT DEFAULT 'inferred',
  times_referenced INTEGER DEFAULT 0,
  last_referenced DATETIME,

  status TEXT DEFAULT 'active',
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_type ON ai_memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_domain ON ai_memory(domain);

-- =====================
-- WEEKLY REVIEWS
-- =====================

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_of DATE NOT NULL,

  actions_completed INTEGER,
  projects_completed INTEGER,
  inbox_processed INTEGER,

  metrics_by_domain TEXT,

  key_wins TEXT,
  blockers_hit TEXT,
  next_week_focus TEXT,
  ai_summary TEXT,

  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- CAET-SPECIFIC
-- =====================

CREATE TABLE IF NOT EXISTS caet_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,

  module TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,

  pipeline_stage TEXT DEFAULT 'idea',

  description TEXT,
  link TEXT,
  file_path TEXT,

  version TEXT,
  quality_score INTEGER,
  skills_used TEXT,
  source_conversation TEXT,

  project_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_caet_module ON caet_assets(module);
CREATE INDEX IF NOT EXISTS idx_caet_level ON caet_assets(level);
CREATE INDEX IF NOT EXISTS idx_caet_pipeline ON caet_assets(pipeline_stage);

-- =====================
-- GENEALOGY-SPECIFIC
-- =====================

CREATE TABLE IF NOT EXISTS genealogy_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,

  family_line TEXT,
  document_type TEXT,

  full_citation TEXT,
  repository TEXT,
  access_date DATE,

  original_or_derivative TEXT,
  primary_or_secondary TEXT,
  evidence_type TEXT,

  status TEXT DEFAULT 'unprocessed',
  transcription TEXT,
  analysis TEXT,

  file_path TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_sources_family ON genealogy_sources(family_line);
CREATE INDEX IF NOT EXISTS idx_sources_status ON genealogy_sources(status);

CREATE TABLE IF NOT EXISTS research_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  family_lines TEXT,
  objective TEXT,

  sources_consulted TEXT,
  findings TEXT,
  new_questions TEXT,
  next_steps TEXT,

  time_spent INTEGER,
  confidence TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- PEOPLE (Mini CRM)
-- =====================

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  organization TEXT,
  role TEXT,
  domain TEXT,

  relationship_type TEXT,
  notes TEXT,

  agenda_items TEXT,

  last_contact DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- HORIZONS OF FOCUS
-- =====================

CREATE TABLE IF NOT EXISTS horizons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  domain TEXT,

  description TEXT,
  parent_id INTEGER,

  status TEXT DEFAULT 'active',
  review_frequency TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- SETTINGS
-- =====================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

export async function initDatabase() {
  try {
    const SQL = await initSqlJs()

    // Try to load existing database or create new one
    let sqlDb
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH)
      sqlDb = new SQL.Database(fileBuffer)
      console.log('Loaded existing database from:', DB_PATH)
    } else {
      sqlDb = new SQL.Database()
      console.log('Created new database')
    }

    db = new DatabaseWrapper(sqlDb, DB_PATH)

    // Run schema (CREATE IF NOT EXISTS is safe to run multiple times)
    db.exec(schema)

    // Insert default password if not exists
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get('password')
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('password', 'changeme')
    }

    console.log('Database initialized successfully')
    return db
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

// Getter for database (ensures it's initialized)
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export default { initDatabase, getDb }
