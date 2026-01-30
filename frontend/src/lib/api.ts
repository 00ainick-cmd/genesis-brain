const API_BASE = 'http://localhost:3000';
const API_KEY = '4a0a644e6fa274fd014fdb64c06682f4579cc2b7630cc50c86cf1d57c835ae58';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'X-Genesis-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Types
export interface DashboardSummary {
  inbox: number;
  nextActions: number;
  waiting: number;
  activeProjects: number;
  overdue: number;
}

export interface Action {
  id: number;
  title: string;
  context: string[];
  energy: 'high' | 'medium' | 'low';
  project_id?: number;
  due_date?: string;
  status?: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  topActions: Action[];
  timestamp: string;
}

export interface InboxItem {
  id: number;
  content: string;
  source?: string;
  created_at: string;
}

export interface Project {
  id: number;
  title: string;
  status: string;
  next_action_count?: number;
}

export interface Memory {
  id: string;
  domain: string;
  key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// API functions
export async function getDashboard(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>('/api/v1/clawdbot/dashboard');
}

export async function getActions(): Promise<Action[]> {
  return apiFetch<Action[]>('/api/v1/clawdbot/actions');
}

export async function getInbox(): Promise<InboxItem[]> {
  return apiFetch<InboxItem[]>('/api/v1/clawdbot/inbox');
}

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/api/v1/clawdbot/projects');
}

export async function getMemories(domain?: string): Promise<Memory[]> {
  const params = domain ? { domain } : undefined;
  return apiFetch<Memory[]>('/api/v1/memory', { params });
}

export async function captureInbox(content: string): Promise<InboxItem> {
  return apiFetch<InboxItem>('/api/v1/clawdbot/inbox', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
