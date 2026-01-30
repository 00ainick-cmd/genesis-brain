import express from 'express';
const router = express.Router();

// In-memory store (will persist to DB later)
let projects = [
  {
    id: '1',
    name: 'CAET Certification',
    vision: 'Entry-level technician certification for Part 145 operations. Develop comprehensive test questions and assessment framework.',
    status: 'building',
    priority: 'high',
    eta: 'Feb 2026',
    lastCompleted: 'Drafted initial test outline',
    nextTask: 'Create question bank for Module 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Genealogy App',
    vision: 'Family tree application rivaling Ancestry.com. Key feature: Creates rich narrative stories about ancestors.',
    status: 'design',
    priority: 'medium',
    eta: 'Mar 2026',
    lastCompleted: null,
    nextTask: 'Define data model for family relationships',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Genesis Second Brain',
    vision: 'Unified GTD + knowledge management system. One place for tasks, memory, docs, and AI integration.',
    status: 'building',
    priority: 'high',
    eta: 'Ongoing',
    lastCompleted: 'Built Mission Control dashboard',
    nextTask: 'Add project-task linking',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Ace/Clawdbot Setup',
    vision: 'Personal AI assistant running on AWS. Discord integration, proactive features, second brain capabilities.',
    status: 'building',
    priority: 'high',
    eta: 'Ongoing',
    lastCompleted: 'Configured Codex CLI',
    nextTask: 'Expand EC2 storage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// GET all projects
router.get('/', (req, res) => {
  res.json({ 
    projects: projects.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
  });
});

// POST new project
router.post('/', (req, res) => {
  const { name, vision, status, priority, eta } = req.body;
  
  if (!name || !vision) {
    return res.status(400).json({ error: 'Name and vision are required' });
  }
  
  const newProject = {
    id: Date.now().toString(),
    name,
    vision,
    status: status || 'idea',
    priority: priority || 'medium',
    eta: eta || null,
    lastCompleted: null,
    nextTask: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.push(newProject);
  res.status(201).json(newProject);
});

// PATCH update project
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  res.json(projects[index]);
});

// DELETE project
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  projects = projects.filter(p => p.id !== id);
  res.json({ success: true });
});

export default router;
