import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey })
}

// Brain dump processing
router.post('/brain-dump', async (req, res) => {
  const { text } = req.body

  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  const prompt = `You are a GTD (Getting Things Done) assistant. Process this brain dump into discrete items.

For each item, determine:
1. Is it actionable? (If no: reference, someday, or trash)
2. What's the next physical action? (Start with a verb)
3. Time estimate (2min, 5min, 15min, 30min, 1hr, 2hr+)
4. Context (@computer, @phone, @errands, @home, @anywhere, @deepwork, @quickwin)
5. Energy level (high, normal, low)
6. Is it a single action or a project (multi-step)?
7. Domain (caet, genealogy, aea, personal, ace_business)

Brain dump:
${text}

Respond in JSON only (no markdown):
{
  "items": [
    {
      "original": "what they said",
      "type": "action|project|calendar|reference|someday|trash",
      "title": "Clean next action title starting with verb",
      "time_estimate": "15min",
      "context": ["@computer"],
      "energy": "normal",
      "domain": "personal",
      "project_name": "if this spawns a project",
      "calendar_datetime": "if calendar item, ISO datetime",
      "notes": "any additional context"
    }
  ]
}`

  try {
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0].text
    const parsed = JSON.parse(content)
    res.json(parsed)
  } catch (error) {
    console.error('Brain dump error:', error)
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({ error: 'Claude API key not configured' })
    }
    res.status(500).json({ error: error.message })
  }
})

// Get AI recommendations
router.post('/recommend', async (req, res) => {
  const { energy = 'normal', available_time = 30 } = req.body

  try {
    // Gather current state
    const nextActions = db().prepare(`
      SELECT * FROM actions WHERE status = 'next'
    `).all()

    const waitingFor = db().prepare(`
      SELECT *, julianday('now') - julianday(created_at) as days_waiting
      FROM actions WHERE status = 'waiting'
    `).all()

    const staleWaiting = waitingFor.filter(a => a.days_waiting > 5)

    const projectsWithoutNext = db().prepare(`
      SELECT p.* FROM projects p
      WHERE p.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM actions a WHERE a.project_id = p.id AND a.status = 'next')
    `).all()

    const prompt = `You are helping Nick decide what to work on. Here's the current state:

Available time: ${available_time} minutes
Current energy: ${energy}

Next Actions (${nextActions.length}):
${nextActions.map(a => `- ${a.title} [${a.context || 'no context'}] (${a.time_estimate || 'unknown'})`).join('\n') || 'None'}

Stale Waiting For (needs follow-up):
${staleWaiting.map(a => `- ${a.title} - waiting on ${a.waiting_on || 'someone'} for ${Math.floor(a.days_waiting)} days`).join('\n') || 'None'}

Projects without Next Action (PROBLEM):
${projectsWithoutNext.map(p => `- ${p.name}`).join('\n') || 'None'}

Based on GTD principles (context, time, energy, priority), recommend 3 actions.
For each, explain briefly why it's a good choice right now.

Respond in JSON only (no markdown):
{
  "recommendations": [
    {
      "action_id": 123,
      "title": "action title",
      "reason": "Why now - 1 sentence"
    }
  ],
  "alerts": [
    "Any urgent issues (e.g., 'Project X has no next action')"
  ]
}`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0].text
    const parsed = JSON.parse(content)
    res.json(parsed)
  } catch (error) {
    console.error('Recommend error:', error)
    res.status(500).json({ error: error.message })
  }
})

// AI-assisted inbox processing
router.post('/process-inbox', async (req, res) => {
  const { inbox_id } = req.body

  try {
    const item = db().prepare('SELECT * FROM inbox WHERE id = ?').get(inbox_id)
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' })
    }

    const prompt = `Process this inbox item according to GTD methodology:

"${item.raw_input}"

Determine:
1. Is it actionable? If not, is it reference material, someday/maybe, or trash?
2. If actionable, is it a project (multiple steps) or single action?
3. What is the clear next action? (Start with verb)
4. Suggested context, time estimate, energy level
5. Which domain? (caet, genealogy, aea, personal, ace_business)

Respond in JSON only:
{
  "actionable": true,
  "type": "action|project|reference|someday|trash",
  "title": "Clear next action starting with verb",
  "project_name": "If it's a project",
  "context": ["@computer"],
  "time_estimate": "15min",
  "energy": "normal",
  "domain": "personal",
  "notes": "Any relevant notes"
}`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0].text
    const parsed = JSON.parse(content)
    res.json(parsed)
  } catch (error) {
    console.error('Process inbox error:', error)
    res.status(500).json({ error: error.message })
  }
})

// AI memory endpoints
router.get('/memory', (req, res) => {
  const { type, domain, limit = 20 } = req.query

  let sql = 'SELECT * FROM ai_memory WHERE status = "active"'
  const params = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  if (domain) {
    sql += ' AND domain = ?'
    params.push(domain)
  }

  sql += ' ORDER BY times_referenced DESC, created_at DESC LIMIT ?'
  params.push(parseInt(limit))

  try {
    const memories = db().prepare(sql).all(...params)
    res.json(memories)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/memory', (req, res) => {
  const { title, type, domain, content, confidence } = req.body

  if (!title || !type || !content) {
    return res.status(400).json({ error: 'title, type, and content are required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO ai_memory (title, type, domain, content, confidence)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, type, domain, content, confidence || 'inferred')

    const memory = db().prepare('SELECT * FROM ai_memory WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(memory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
