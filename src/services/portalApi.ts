/**
 * Admin portal API client (password-gated; separate from OIDC JWT).
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const TOKEN_KEY = 'chatiitd_portal_token';

export function getPortalToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPortalToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function portalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getPortalToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    setPortalToken(null);
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function portalLogin(password: string) {
  const data = await portalFetch<{
    access_token: string;
    expires_in_hours: number;
  }>('/portal/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setPortalToken(data.access_token);
  return data;
}

export async function portalMe() {
  return portalFetch<{ ok: boolean }>('/portal/me');
}

export async function portalStats() {
  return portalFetch<PortalStats>('/portal/stats');
}

export async function portalListTools() {
  return portalFetch<{ tools: PortalTool[] }>('/portal/tools');
}

export async function portalRunTool(payload: {
  tool_name: string;
  arguments: Record<string, unknown>;
  curriculum_generation?: string | null;
  year_of_joining?: number | null;
}) {
  return portalFetch<ToolRunResult>('/portal/tools/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function portalRagTest(payload: {
  query: string;
  generation: string;
  doc_types?: string[] | null;
  limit?: number;
}) {
  return portalFetch<RagTestResult>('/portal/rag/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface PortalStats {
  generated_at: string;
  users_total?: number;
  chats_total?: number;
  messages_total?: number;
  active_users?: Record<string, number>;
  messages_by_window?: Record<string, number>;
  new_chats?: Record<string, number>;
  courses_total?: number;
  courses_by_generation?: Record<string, number>;
  programmes_by_generation?: Record<string, number>;
  catalog_courses?: number;
  semesters?: { code: string; label: string; is_active: boolean }[];
  recent_chats?: {
    id: number;
    user_id: number;
    title: string | null;
    created_at: string | null;
    user_email: string | null;
    kerberos: string | null;
  }[];
  knowledge?: {
    collection?: string;
    points_count?: number | null;
    status?: string;
    sample_size?: number;
    generation_sample?: Record<string, number>;
    doc_type_sample?: Record<string, number>;
    error?: string;
  };
  db_error?: string;
}

export interface PortalTool {
  name: string;
  description: string;
  parameters: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string; enum?: string[]; items?: unknown }>;
    required?: string[];
  };
  runnable: boolean;
}

export interface ToolRunResult {
  tool_name: string;
  arguments: Record<string, unknown>;
  elapsed_ms: number;
  result: string;
  result_json: unknown;
}

export interface RagChunk {
  rank: number;
  id: string;
  score: number | null;
  generation: string | null;
  doc_type: string | null;
  source_name: string | null;
  source_url: string | null;
  page_start: number | null;
  page_end: number | null;
  section_title: string | null;
  section_path: string[] | null;
  course_code: string | null;
  programme_code: string | null;
  content: string;
  citation: string;
  metadata: Record<string, unknown>;
}

export interface RagTestResult {
  query: string;
  generation: string;
  doc_types: string[] | null;
  limit: number;
  elapsed_ms: number;
  hit_count: number;
  chunks: RagChunk[];
}
