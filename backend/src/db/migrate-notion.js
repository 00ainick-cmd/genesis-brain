// Migration script to import data from Notion Command Center into GENESIS
// Run with: node src/db/migrate-notion.js

import { initDatabase, getDb } from './init.js'

// Helper functions using the db wrapper
const run = (sql, params = []) => getDb().prepare(sql).run(...params)
const get = (sql, params = []) => getDb().prepare(sql).get(...params)
const all = (sql, params = []) => getDb().prepare(sql).all(...params)

// =====================================================
// NOTION DATA EXPORT (Migrated from Command Center)
// =====================================================

const AREAS = [
  { name: 'AEA / Workforce', description: 'Aircraft Electronics Association work and workforce development initiatives' },
  { name: 'Products', description: 'ACE Avionics Training products and courses' },
  { name: 'Personal', description: 'Personal projects and interests' }
]

const PROJECTS = [
  {
    name: 'CAET Advanced',
    status: 'active',
    area: 'AEA / Workforce',
    notes: 'Advanced CAET certification curriculum development',
    target_date: '2026-01-31',
    notion_url: 'https://www.notion.so/2f7bf82be8ce810cbcaadc98e2fdaec0'
  },
  {
    name: 'CAET Pro',
    status: 'active',
    area: 'AEA / Workforce',
    notes: 'Professional-level CAET certification program',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81a3ba3fd7ca178f6910'
  },
  {
    name: 'Base CAET Curriculum Build',
    status: 'active',
    area: 'AEA / Workforce',
    notes: 'Complete all supporting materials for the 8-module Base CAET certification curriculum',
    notion_url: 'https://www.notion.so/2eebf82be8ce8115a3a5fe7b986796a1'
  },
  {
    name: 'AEA Convention 2026',
    status: 'on_hold',
    area: 'AEA / Workforce',
    notes: 'Planning and preparation for AEA Convention 2026',
    target_date: '2026-03-25',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81a7837ed7b3865dd809'
  },
  {
    name: 'Ancestor Stories',
    status: 'someday',
    area: 'Personal',
    notes: 'Generate narrative stories for each ancestor - Ken Burns style narratives',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81768ae8e28faa06e2a1'
  },
  {
    name: 'Ancestor Stories MVP',
    status: 'active',
    area: 'Personal',
    notes: 'Minimum viable product for Ancestor Stories platform',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81b79bebd9bdedeebb8b'
  },
  {
    name: 'A&P General Prep',
    status: 'active',
    area: 'Products',
    notes: 'Free funnel product for A&P General certification prep',
    notion_url: 'https://www.notion.so/2f5bf82be8ce81b6ab8fef286519d563'
  },
  {
    name: 'AI Assessment Factory',
    status: 'active',
    area: 'Products',
    notes: 'AI-powered assessment generation tool - soft launch at AEA convention',
    notion_url: 'https://www.notion.so/2f6bf82be8ce81b282b0c8cd355b71e4'
  },
  {
    name: 'Course-in-a-Box',
    status: 'someday',
    area: 'Products',
    notes: 'Turn raw technical content into complete training packages: lesson plans, slides, labs, questions, audio lessons',
    notion_url: 'https://www.notion.so/2f6bf82be8ce811fb185eebb2a637c2b'
  },
  {
    name: 'GTD System / GENESIS',
    status: 'active',
    area: 'Personal',
    notes: 'Building the GENESIS productivity system - GTD + PARA methodology',
    notion_url: null
  }
]

const ACTIONS = [
  // CAET Pro tasks
  {
    title: 'Build CAET Pro scenario-based exam questions',
    status: 'next',
    project: 'CAET Pro',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 120,
    priority: 'medium',
    notes: 'Use avionics-assessment-writer skill for Patti Shank methodology',
    notion_url: 'https://www.notion.so/2f7bf82be8ce814d9a23f3d8180fa626'
  },
  // Convention tasks
  {
    title: 'Get boss approval to attend convention',
    status: 'waiting',
    project: 'AEA Convention 2026',
    context: '["@office"]',
    energy_required: 'low',
    priority: 'medium',
    waiting_on: 'Boss',
    notes: 'Waiting for approval to attend AEA Convention 2026',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81e9a49ff169dc2abd26'
  },
  {
    title: 'Update aea.net/convention with sponsor logos',
    status: 'next',
    project: 'AEA Convention 2026',
    context: '["@computer"]',
    energy_required: 'medium',
    priority: 'medium',
    notes: 'Add new sponsor logos to convention page',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81a6bc93f455c63cc170'
  },
  {
    title: 'Review competition training HTML package',
    status: 'next',
    project: 'AEA Convention 2026',
    context: '["@computer"]',
    energy_required: 'medium',
    priority: 'medium',
    notes: 'Review the training materials for convention competition',
    notion_url: 'https://www.notion.so/2f7bf82be8ce81479146d781d82c61c9'
  },
  // Base CAET tasks
  {
    title: 'Create 5E Lesson Plan for Module 2: Electrical Theory',
    status: 'next',
    project: 'Base CAET Curriculum Build',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 90,
    priority: 'high',
    notes: 'Use lesson-plan-generator skill'
  },
  {
    title: 'Build Module 1 interactive training HTML',
    status: 'next',
    project: 'Base CAET Curriculum Build',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 120,
    priority: 'high',
    notes: 'Use caet-training-module-builder skill'
  },
  {
    title: 'Generate Module 3 question bank',
    status: 'next',
    project: 'Base CAET Curriculum Build',
    context: '["@computer"]',
    energy_required: 'medium',
    time_estimate: 60,
    priority: 'medium',
    notes: 'Use caet-question-bank-generator skill'
  },
  {
    title: 'Create evaluator rubrics for hands-on assessments',
    status: 'someday',
    project: 'Base CAET Curriculum Build',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 90,
    priority: 'low',
    notes: 'Use caet-rubric-builder skill'
  },
  // Training website
  {
    title: 'Finalize training website',
    status: 'next',
    project: 'A&P General Prep',
    context: '["@computer"]',
    energy_required: 'medium',
    priority: 'medium',
    notes: 'Complete the ACE training website updates',
    notion_url: 'https://www.notion.so/2efbf82be8ce81fdbf06e05ee59cbb7c'
  },
  // Ancestor Stories tasks
  {
    title: 'Build Byron Hess narrative prototype',
    status: 'next',
    project: 'Ancestor Stories MVP',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 60,
    priority: 'medium',
    notes: 'Create Ken Burns style narrative for Byron E. Hess military heritage'
  },
  {
    title: 'Design Notion delivery mechanism',
    status: 'someday',
    project: 'Ancestor Stories',
    context: '["@computer"]',
    energy_required: 'medium',
    priority: 'low',
    notes: 'Notion might work better than traditional UI for customer delivery'
  },
  // AI Assessment Factory
  {
    title: 'Prepare soft launch materials for convention',
    status: 'next',
    project: 'AI Assessment Factory',
    context: '["@computer"]',
    energy_required: 'medium',
    time_estimate: 45,
    priority: 'high',
    notes: 'Get demo ready for AEA members at convention'
  },
  // GENESIS tasks
  {
    title: 'Deploy GENESIS to AWS for Clawdbot access',
    status: 'next',
    project: 'GTD System / GENESIS',
    context: '["@computer"]',
    energy_required: 'high',
    time_estimate: 60,
    priority: 'high',
    notes: 'Use deploy/aws-setup.sh script, configure GENESIS_API_KEY'
  },
  {
    title: 'Add weekly review automation',
    status: 'someday',
    project: 'GTD System / GENESIS',
    context: '["@computer"]',
    energy_required: 'medium',
    priority: 'low',
    notes: 'Automated prompts and review workflow'
  }
]

const RESOURCES = [
  {
    name: 'Skills Directory',
    type: 'reference',
    description: 'Central reference for all Claude skills and their triggers',
    location: 'https://www.notion.so/2f7bf82be8ce81deaedaf328dadfe78c'
  },
  {
    name: 'Reference Library',
    type: 'reference',
    description: 'Shared knowledge base for Nick, Ace, Claude, and any AI assistant',
    location: 'https://www.notion.so/2f7bf82be8ce81b39b0fcdeaeca834ca'
  },
  {
    name: 'ACE Avionics Tech Stack',
    type: 'reference',
    description: 'Technical infrastructure documentation',
    location: 'https://www.notion.so/2f7bf82be8ce81e8a057df4a2d5eccd3'
  },
  {
    name: 'Working with Nick',
    type: 'reference',
    description: 'AI context and collaboration guidelines',
    location: 'https://www.notion.so/2f7bf82be8ce816c8670c62cc1bb1619'
  },
  {
    name: 'Clawdbot Troubleshooting Manual',
    type: 'reference',
    description: 'Troubleshooting guide for Telegram bot',
    location: 'https://www.notion.so/2f6bf82be8ce81f685afc6ffcf5956f7'
  }
]

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

function migrateAreas() {
  console.log('\n📁 Migrating Areas...')

  for (const area of AREAS) {
    const existing = get('SELECT id FROM areas WHERE name = ?', [area.name])
    if (existing) {
      console.log(`  ⏭️  Area "${area.name}" already exists`)
      continue
    }

    run(`
      INSERT INTO areas (name, description, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `, [area.name, area.description])
    console.log(`  ✅ Created area: ${area.name}`)
  }
}

function migrateProjects() {
  console.log('\n📂 Migrating Projects...')

  for (const project of PROJECTS) {
    const existing = get('SELECT id FROM projects WHERE name = ?', [project.name])
    if (existing) {
      console.log(`  ⏭️  Project "${project.name}" already exists`)
      continue
    }

    // Get area ID
    let areaId = null
    if (project.area) {
      const area = get('SELECT id FROM areas WHERE name = ?', [project.area])
      areaId = area?.id
    }

    run(`
      INSERT INTO projects (name, status, area_id, notes, target_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      project.name,
      project.status,
      areaId,
      project.notes + (project.notion_url ? `\n\nMigrated from Notion: ${project.notion_url}` : ''),
      project.target_date || null
    ])
    console.log(`  ✅ Created project: ${project.name}`)
  }
}

function migrateActions() {
  console.log('\n⚡ Migrating Actions...')

  for (const action of ACTIONS) {
    const existing = get('SELECT id FROM actions WHERE title = ?', [action.title])
    if (existing) {
      console.log(`  ⏭️  Action "${action.title.substring(0, 40)}..." already exists`)
      continue
    }

    // Get project ID
    let projectId = null
    if (action.project) {
      const project = get('SELECT id FROM projects WHERE name = ?', [action.project])
      projectId = project?.id
    }

    run(`
      INSERT INTO actions (
        title, status, context, project_id, energy, time_estimate,
        ai_notes, source, waiting_on, due_date, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      action.title,
      action.status,
      action.context || '["@anywhere"]',
      projectId,
      action.energy_required || 'medium',
      action.time_estimate ? String(action.time_estimate) : null,
      action.notes + (action.notion_url ? `\n\nMigrated from Notion: ${action.notion_url}` : ''),
      'notion_migration',
      action.waiting_on || null,
      action.due_date || null
    ])
    console.log(`  ✅ Created action: ${action.title.substring(0, 50)}...`)
  }
}

function migrateResources() {
  console.log('\n📚 Migrating Resources...')

  for (const resource of RESOURCES) {
    const existing = get('SELECT id FROM resources WHERE name = ?', [resource.name])
    if (existing) {
      console.log(`  ⏭️  Resource "${resource.name}" already exists`)
      continue
    }

    run(`
      INSERT INTO resources (name, type, description, location, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [
      resource.name,
      resource.type,
      resource.description,
      resource.location
    ])
    console.log(`  ✅ Created resource: ${resource.name}`)
  }
}

async function runMigration() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║  GENESIS - Notion Migration                    ║')
  console.log('║  Importing data from Command Center            ║')
  console.log('╚════════════════════════════════════════════════╝')

  try {
    // Initialize database (async)
    await initDatabase()

    // Run migrations (sync)
    migrateAreas()
    migrateProjects()
    migrateActions()
    migrateResources()

    // Summary
    const areaCount = get('SELECT COUNT(*) as count FROM areas')
    const projectCount = get('SELECT COUNT(*) as count FROM projects')
    const actionCount = get('SELECT COUNT(*) as count FROM actions')
    const resourceCount = get('SELECT COUNT(*) as count FROM resources')

    console.log('\n╔════════════════════════════════════════════════╗')
    console.log('║  Migration Complete!                           ║')
    console.log('╠════════════════════════════════════════════════╣')
    console.log(`║  Areas:     ${String(areaCount.count).padStart(4)}                              ║`)
    console.log(`║  Projects:  ${String(projectCount.count).padStart(4)}                              ║`)
    console.log(`║  Actions:   ${String(actionCount.count).padStart(4)}                              ║`)
    console.log(`║  Resources: ${String(resourceCount.count).padStart(4)}                              ║`)
    console.log('╚════════════════════════════════════════════════╝')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
