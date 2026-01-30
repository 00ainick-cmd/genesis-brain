import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List CAET assets
router.get('/assets', (req, res) => {
  const { module, level, pipeline_stage, type } = req.query

  let sql = 'SELECT * FROM caet_assets WHERE 1=1'
  const params = []

  if (module) {
    sql += ' AND module = ?'
    params.push(module)
  }
  if (level) {
    sql += ' AND level = ?'
    params.push(level)
  }
  if (pipeline_stage) {
    sql += ' AND pipeline_stage = ?'
    params.push(pipeline_stage)
  }
  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  sql += ' ORDER BY pipeline_stage, created_at DESC'

  try {
    const assets = db().prepare(sql).all(...params)
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create CAET asset
router.post('/assets', (req, res) => {
  const { name, module, level, type, category, pipeline_stage, description, link, file_path, version, quality_score, skills_used, project_id } = req.body

  if (!name || !module || !level || !type) {
    return res.status(400).json({ error: 'name, module, level, and type are required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO caet_assets (name, module, level, type, category, pipeline_stage, description, link, file_path, version, quality_score, skills_used, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      name, module, level, type, category || null,
      pipeline_stage || 'idea',
      description || null, link || null, file_path || null, version || null, quality_score || null,
      skills_used ? JSON.stringify(skills_used) : null,
      project_id || null
    )

    // Get the newly created asset - use fallback since lastInsertRowid may not work
    const asset = db().prepare('SELECT * FROM caet_assets ORDER BY id DESC LIMIT 1').get()
    res.status(201).json(asset)
  } catch (error) {
    console.error('CAET create error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update CAET asset
router.put('/assets/:id', (req, res) => {
  const { name, module, level, type, category, pipeline_stage, description, link, file_path, version, quality_score, skills_used, project_id } = req.body

  try {
    const existing = db().prepare('SELECT * FROM caet_assets WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    // Handle published_at
    const publishedAt = pipeline_stage === 'published' && existing.pipeline_stage !== 'published'
      ? new Date().toISOString()
      : existing.published_at

    db().prepare(`
      UPDATE caet_assets SET
        name = COALESCE(?, name),
        module = COALESCE(?, module),
        level = COALESCE(?, level),
        type = COALESCE(?, type),
        category = ?,
        pipeline_stage = COALESCE(?, pipeline_stage),
        description = ?,
        link = ?,
        file_path = ?,
        version = ?,
        quality_score = ?,
        skills_used = ?,
        project_id = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, module, level, type, category, pipeline_stage,
      description, link, file_path, version, quality_score,
      skills_used ? JSON.stringify(skills_used) : existing.skills_used,
      project_id, publishedAt,
      req.params.id
    )

    const asset = db().prepare('SELECT * FROM caet_assets WHERE id = ?').get(req.params.id)
    res.json(asset)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Gap analysis
router.get('/gap-analysis', (req, res) => {
  try {
    // Define expected modules for each level
    const expectedModules = {
      base: ['dc', 'ac', 'semi', 'digital', 'safety', 'soldering', 'wire'],
      advanced: ['nav', 'comm', 'radar', 'autopilot'],
      pro: ['troubleshooting', 'certification', 'management']
    }

    const levels = ['base', 'advanced', 'pro']
    const assetTypes = ['question_bank', 'training_module', 'lesson_plan']

    const analysis = {}

    for (const level of levels) {
      const modules = expectedModules[level]
      analysis[level] = {
        modules: {},
        overall: { total: 0, published: 0 }
      }

      for (const mod of modules) {
        const total = assetTypes.length
        const published = db().prepare(`
          SELECT COUNT(*) as count FROM caet_assets
          WHERE level = ? AND module = ? AND pipeline_stage = 'published'
        `).get(level, mod).count

        const inProgress = db().prepare(`
          SELECT COUNT(*) as count FROM caet_assets
          WHERE level = ? AND module = ? AND pipeline_stage IN ('queued', 'in_progress', 'review')
        `).get(level, mod).count

        analysis[level].modules[mod] = {
          total,
          published,
          inProgress,
          missing: total - published - inProgress
        }

        analysis[level].overall.total += total
        analysis[level].overall.published += published
      }
    }

    // Calculate base progress percentage
    const baseProgress = analysis.base.overall.total > 0
      ? Math.round((analysis.base.overall.published / analysis.base.overall.total) * 100)
      : 0

    res.json({ analysis, baseProgress })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Pipeline view
router.get('/pipeline', (req, res) => {
  try {
    const stages = ['idea', 'queued', 'in_progress', 'review', 'published']
    const pipeline = {}

    for (const stage of stages) {
      pipeline[stage] = db().prepare(`
        SELECT * FROM caet_assets WHERE pipeline_stage = ?
        ORDER BY updated_at DESC
      `).all(stage)
    }

    res.json(pipeline)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
