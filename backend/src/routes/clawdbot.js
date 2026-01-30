// Clawdbot Integration Routes
// API endpoints for Telegram bot (Clawdbot) to interact with GENESIS

import express from 'express'
import { getDb } from '../db/init.js'

// Helper functions (synchronous)
const run = (sql, params = []) => getDb().prepare(sql).run(...params)
const get = (sql, params = []) => getDb().prepare(sql).get(...params)
const all = (sql, params = []) => getDb().prepare(sql).all(...params)

const router = express.Router()

// =====================================================
// Quick Capture - Main entry point for Clawdbot
// =====================================================
router.post('/capture', (req, res) => {
  try {
    const { text, type = 'inbox', context, source = 'clawdbot' } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    let result

    if (type === 'action') {
      // Create directly as an action
      result = run(`
        INSERT INTO actions (title, status, context, ai_notes, source, created_at, updated_at)
        VALUES (?, 'next', ?, ?, ?, datetime('now'), datetime('now'))
      `, [text, context ? JSON.stringify([context]) : '["@anywhere"]', 'Via Clawdbot', 'clawdbot'])

      res.json({
        success: true,
        message: `✅ Action created: "${text}"`,
        id: result.lastInsertRowid,
        type: 'action'
      })
    } else {
      // Default: add to inbox for processing
      result = run(`
        INSERT INTO inbox (raw_input, source, created_at)
        VALUES (?, ?, datetime('now'))
      `, [text, source])

      res.json({
        success: true,
        message: `📥 Added to inbox: "${text}"`,
        id: result.lastInsertRowid,
        type: 'inbox'
      })
    }
  } catch (error) {
    console.error('Capture error:', error)
    res.status(500).json({ error: 'Failed to capture item' })
  }
})

// =====================================================
// Get Dashboard Summary for Clawdbot
// =====================================================
router.get('/dashboard', (req, res) => {
  try {
    // Get counts
    const inbox = get('SELECT COUNT(*) as count FROM inbox WHERE processed_at IS NULL')
    const nextActions = get('SELECT COUNT(*) as count FROM actions WHERE status = ?', ['next'])
    const waiting = get('SELECT COUNT(*) as count FROM actions WHERE status = ?', ['waiting'])
    const projects = get('SELECT COUNT(*) as count FROM projects WHERE status = ?', ['active'])

    // Get top 5 next actions
    const topActions = all(`
      SELECT id, title, context, energy
      FROM actions
      WHERE status = 'next'
      ORDER BY created_at DESC
      LIMIT 5
    `)

    // Get overdue items
    const overdue = get(`
      SELECT COUNT(*) as count FROM actions
      WHERE due_date < date('now') AND status NOT IN ('done', 'cancelled')
    `)

    res.json({
      summary: {
        inbox: inbox?.count || 0,
        nextActions: nextActions?.count || 0,
        waiting: waiting?.count || 0,
        activeProjects: projects?.count || 0,
        overdue: overdue?.count || 0
      },
      topActions: topActions.map(a => ({
        id: a.id,
        title: a.title,
        context: a.context ? JSON.parse(a.context) : [],
        energy: a.energy
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Failed to get dashboard' })
  }
})

// =====================================================
// List Actions (with filters)
// =====================================================
router.get('/actions', (req, res) => {
  try {
    const { status = 'next', limit = 10, context } = req.query

    let query = 'SELECT * FROM actions WHERE status = ?'
    const params = [status]

    if (context) {
      query += ' AND context LIKE ?'
      params.push(`%${context}%`)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(parseInt(limit))

    const actions = all(query, params)

    res.json({
      actions: actions.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        context: a.context ? JSON.parse(a.context) : [],
        energy: a.energy,
        dueDate: a.due_date,
        projectId: a.project_id
      })),
      count: actions.length
    })
  } catch (error) {
    console.error('List actions error:', error)
    res.status(500).json({ error: 'Failed to list actions' })
  }
})

// =====================================================
// Complete an Action
// =====================================================
router.post('/actions/:id/complete', (req, res) => {
  try {
    const { id } = req.params

    const action = get('SELECT * FROM actions WHERE id = ?', [id])
    if (!action) {
      return res.status(404).json({ error: 'Action not found' })
    }

    run(`
      UPDATE actions
      SET status = 'done', completed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `, [id])

    res.json({
      success: true,
      message: `✅ Completed: "${action.title}"`,
      id: parseInt(id)
    })
  } catch (error) {
    console.error('Complete action error:', error)
    res.status(500).json({ error: 'Failed to complete action' })
  }
})

// =====================================================
// List Projects
// =====================================================
router.get('/projects', (req, res) => {
  try {
    const { status = 'active', limit = 10 } = req.query

    const projects = all(`
      SELECT p.*,
        (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status = 'next') as next_actions,
        (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status = 'done') as completed_actions
      FROM projects p
      WHERE p.status = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [status, parseInt(limit)])

    res.json({
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        areaId: p.area_id,
        nextActions: p.next_actions,
        completedActions: p.completed_actions
      })),
      count: projects.length
    })
  } catch (error) {
    console.error('List projects error:', error)
    res.status(500).json({ error: 'Failed to list projects' })
  }
})

// =====================================================
// Get Inbox Items
// =====================================================
router.get('/inbox', (req, res) => {
  try {
    const { limit = 10 } = req.query

    const items = all(`
      SELECT * FROM inbox
      WHERE processed_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit)])

    res.json({
      items: items.map(i => ({
        id: i.id,
        text: i.raw_input,
        source: i.source,
        createdAt: i.created_at
      })),
      count: items.length
    })
  } catch (error) {
    console.error('Get inbox error:', error)
    res.status(500).json({ error: 'Failed to get inbox' })
  }
})

// =====================================================
// Process Inbox Item (convert to action/project/etc)
// =====================================================
router.post('/inbox/:id/process', (req, res) => {
  try {
    const { id } = req.params
    const { type, title, projectId, context, status = 'next' } = req.body

    const item = get('SELECT * FROM inbox WHERE id = ?', [id])
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' })
    }

    let result

    if (type === 'action') {
      result = run(`
        INSERT INTO actions (title, status, context, project_id, ai_notes, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        title || item.raw_input,
        status,
        context ? JSON.stringify([context]) : '["@anywhere"]',
        projectId || null,
        `Processed from inbox #${id}`,
        'inbox_processed'
      ])

      // Mark inbox item as processed
      run('UPDATE inbox SET processed_at = datetime("now"), processed_to = ? WHERE id = ?', ['action', id])

      res.json({
        success: true,
        message: `✅ Created action: "${title || item.raw_input}"`,
        actionId: result.lastInsertRowid
      })
    } else if (type === 'trash') {
      run('UPDATE inbox SET processed_at = datetime("now"), processed_to = ? WHERE id = ?', ['trash', id])
      res.json({
        success: true,
        message: `🗑️ Trashed inbox item`
      })
    } else {
      res.status(400).json({ error: 'Invalid type. Use "action" or "trash"' })
    }
  } catch (error) {
    console.error('Process inbox error:', error)
    res.status(500).json({ error: 'Failed to process inbox item' })
  }
})

// =====================================================
// Quick Status Update
// =====================================================
router.post('/actions/:id/status', (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['next', 'waiting', 'scheduled', 'someday', 'done', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` })
    }

    const action = get('SELECT * FROM actions WHERE id = ?', [id])
    if (!action) {
      return res.status(404).json({ error: 'Action not found' })
    }

    run(`
      UPDATE actions
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, id])

    const statusEmoji = {
      next: '⚡',
      waiting: '⏳',
      scheduled: '📅',
      someday: '💭',
      done: '✅',
      cancelled: '❌'
    }

    res.json({
      success: true,
      message: `${statusEmoji[status]} "${action.title}" → ${status}`,
      id: parseInt(id),
      newStatus: status
    })
  } catch (error) {
    console.error('Status update error:', error)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

// =====================================================
// Health Check for Clawdbot
// =====================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'genesis-clawdbot-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

export default router
