import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List genealogy sources
router.get('/sources', (req, res) => {
  const { family_line, status, document_type } = req.query

  let sql = 'SELECT * FROM genealogy_sources WHERE 1=1'
  const params = []

  if (family_line) {
    sql += ' AND family_line = ?'
    params.push(family_line)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (document_type) {
    sql += ' AND document_type = ?'
    params.push(document_type)
  }

  sql += ' ORDER BY created_at DESC'

  try {
    const sources = db().prepare(sql).all(...params)
    res.json(sources)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create genealogy source
router.post('/sources', (req, res) => {
  const {
    title, family_line, document_type, full_citation, repository, access_date,
    original_or_derivative, primary_or_secondary, evidence_type,
    status, transcription, analysis, file_path
  } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO genealogy_sources (
        title, family_line, document_type, full_citation, repository, access_date,
        original_or_derivative, primary_or_secondary, evidence_type,
        status, transcription, analysis, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      family_line || null,
      document_type || null,
      full_citation || null,
      repository || null,
      access_date || null,
      original_or_derivative || null,
      primary_or_secondary || null,
      evidence_type || null,
      status || 'unprocessed',
      transcription || null,
      analysis || null,
      file_path || null
    )

    const source = db().prepare('SELECT * FROM genealogy_sources ORDER BY id DESC LIMIT 1').get()
    res.status(201).json(source)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update genealogy source
router.put('/sources/:id', (req, res) => {
  const {
    title, family_line, document_type, full_citation, repository, access_date,
    original_or_derivative, primary_or_secondary, evidence_type,
    status, transcription, analysis, file_path
  } = req.body

  try {
    const existing = db().prepare('SELECT * FROM genealogy_sources WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Source not found' })
    }

    // Set processed_at when status changes to processed states
    const processedAt = ['transcribed', 'analyzed', 'verified'].includes(status) && existing.status === 'unprocessed'
      ? new Date().toISOString()
      : existing.processed_at

    db().prepare(`
      UPDATE genealogy_sources SET
        title = COALESCE(?, title),
        family_line = ?,
        document_type = ?,
        full_citation = ?,
        repository = ?,
        access_date = ?,
        original_or_derivative = ?,
        primary_or_secondary = ?,
        evidence_type = ?,
        status = COALESCE(?, status),
        transcription = ?,
        analysis = ?,
        file_path = ?,
        processed_at = ?
      WHERE id = ?
    `).run(
      title, family_line, document_type, full_citation, repository, access_date,
      original_or_derivative, primary_or_secondary, evidence_type,
      status, transcription, analysis, file_path, processedAt,
      req.params.id
    )

    const source = db().prepare('SELECT * FROM genealogy_sources WHERE id = ?').get(req.params.id)
    res.json(source)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get family lines status
router.get('/family-lines', (req, res) => {
  try {
    const familyLines = ['BROWN', 'CHANEY', 'CRAWLEY', 'HESS']
    const result = {}

    for (const line of familyLines) {
      const total = db().prepare(`
        SELECT COUNT(*) as count FROM genealogy_sources WHERE family_line = ?
      `).get(line).count

      const byStatus = db().prepare(`
        SELECT status, COUNT(*) as count FROM genealogy_sources
        WHERE family_line = ? GROUP BY status
      `).all(line)

      result[line] = {
        total,
        byStatus: byStatus.reduce((acc, row) => {
          acc[row.status] = row.count
          return acc
        }, {})
      }
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Research logs
router.get('/research-log', (req, res) => {
  const { limit = 20 } = req.query

  try {
    const logs = db().prepare(`
      SELECT * FROM research_logs
      ORDER BY date DESC
      LIMIT ?
    `).all(parseInt(limit))
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/research-log', (req, res) => {
  const { date, family_lines, objective, sources_consulted, findings, new_questions, next_steps, time_spent, confidence } = req.body

  if (!date || !objective) {
    return res.status(400).json({ error: 'date and objective are required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO research_logs (date, family_lines, objective, sources_consulted, findings, new_questions, next_steps, time_spent, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      date,
      family_lines ? JSON.stringify(family_lines) : null,
      objective,
      sources_consulted ? JSON.stringify(sources_consulted) : null,
      findings, new_questions, next_steps, time_spent, confidence
    )

    const log = db().prepare('SELECT * FROM research_logs ORDER BY id DESC LIMIT 1').get()
    res.status(201).json(log)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
