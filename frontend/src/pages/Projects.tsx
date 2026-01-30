import { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Plus, 
  RefreshCw,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';

interface Project {
  id: string;
  name: string;
  vision: string;
  status: 'idea' | 'research' | 'design' | 'building' | 'launched' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  eta: string | null;
  lastCompleted: string | null;
  nextTask: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  idea: 'bg-gray-600',
  research: 'bg-purple-600',
  design: 'bg-blue-600',
  building: 'bg-yellow-600',
  launched: 'bg-green-600',
  maintenance: 'bg-cyan-600'
};

const statusLabels: Record<string, string> = {
  idea: 'Idea',
  research: 'Research',
  design: 'Design',
  building: 'Building',
  launched: 'Launched',
  maintenance: 'Maintenance'
};

const priorityColors: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400'
};

const priorityIcons: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '⚪'
};

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    vision: '',
    status: 'idea',
    priority: 'medium',
    eta: ''
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects/mission-control');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects/mission-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      if (res.ok) {
        setNewProject({ name: '', vision: '', status: 'idea', priority: 'medium', eta: '' });
        setShowForm(false);
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await fetch(`/api/projects/mission-control/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchProjects();
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  if (loading && projects.length === 0) {
    return <Loading message="Loading projects..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-[#00FF41]" />
            Mission Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} active projects
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
          <button 
            onClick={fetchProjects}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* New Project Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="input w-full"
                placeholder="CAET Certification"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ETA</label>
              <input
                type="text"
                value={newProject.eta}
                onChange={(e) => setNewProject({ ...newProject, eta: e.target.value })}
                className="input w-full"
                placeholder="Feb 2026"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vision</label>
            <textarea
              value={newProject.vision}
              onChange={(e) => setNewProject({ ...newProject, vision: e.target.value })}
              className="input w-full h-20"
              placeholder="What is this project about? What's the goal?"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={newProject.status}
                onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                className="input w-full"
              >
                <option value="idea">Idea</option>
                <option value="research">Research</option>
                <option value="design">Design</option>
                <option value="building">Building</option>
                <option value="launched">Launched</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <select
                value={newProject.priority}
                onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                className="input w-full"
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">Create Project</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState 
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to get started"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-4 hover:border-[#00FF41]/50 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white text-lg">{project.name}</h3>
                <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>

              {/* Vision */}
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {project.vision}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className={priorityColors[project.priority]}>
                  {priorityIcons[project.priority]} {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                </span>
                {project.eta && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.eta}
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2 text-xs">
                {project.lastCompleted && (
                  <div className="flex items-start gap-2 text-green-400">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{project.lastCompleted}</span>
                  </div>
                )}
                {project.nextTask && (
                  <div className="flex items-start gap-2 text-yellow-400">
                    <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{project.nextTask}</span>
                  </div>
                )}
                {!project.lastCompleted && !project.nextTask && (
                  <div className="flex items-start gap-2 text-gray-500">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>No tasks tracked yet</span>
                  </div>
                )}
              </div>

              {/* Quick Status Update */}
              <div className="mt-4 pt-3 border-t border-gray-800">
                <select
                  value={project.status}
                  onChange={(e) => updateProject(project.id, { status: e.target.value as Project['status'] })}
                  className="input w-full text-xs"
                >
                  <option value="idea">Idea</option>
                  <option value="research">Research</option>
                  <option value="design">Design</option>
                  <option value="building">Building</option>
                  <option value="launched">Launched</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
