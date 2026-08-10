import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Search,
  Wrench,
} from 'lucide-react';
import {
  getPortalToken,
  portalListTools,
  portalLogin,
  portalMe,
  portalRagTest,
  portalRunTool,
  portalStats,
  setPortalToken,
  type PortalStats,
  type PortalTool,
  type RagChunk,
  type RagTestResult,
  type ToolRunResult,
} from '../services/portalApi';

type Tab = 'stats' | 'tools' | 'rag';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-pplx-border bg-pplx-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-pplx-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-pplx-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-pplx-muted">{hint}</p> : null}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-[28rem] overflow-auto rounded-xl border border-pplx-border bg-[#1f1b17] p-4 text-xs leading-relaxed text-[#f3eee6] whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

function buildDefaultArgs(tool: PortalTool | null): Record<string, string> {
  if (!tool?.parameters?.properties) return {};
  const out: Record<string, string> = {};
  for (const [key, schema] of Object.entries(tool.parameters.properties)) {
    if (schema.type === 'array') out[key] = '[]';
    else if (schema.type === 'integer' || schema.type === 'number') out[key] = '';
    else if (schema.enum?.length) out[key] = String(schema.enum[0]);
    else out[key] = '';
  }
  return out;
}

function coerceArgs(
  tool: PortalTool,
  raw: Record<string, string>,
): Record<string, unknown> {
  const props = tool.parameters.properties || {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val === '' || val === undefined) continue;
    const schema = props[key];
    const t = schema?.type;
    if (t === 'integer') out[key] = parseInt(val, 10);
    else if (t === 'number') out[key] = Number(val);
    else if (t === 'array' || t === 'object' || val.trim().startsWith('[') || val.trim().startsWith('{')) {
      try {
        out[key] = JSON.parse(val);
      } catch {
        out[key] = val;
      }
    } else out[key] = val;
  }
  return out;
}

function ChunkCard({ chunk }: { chunk: RagChunk }) {
  const [open, setOpen] = useState(chunk.rank <= 2);
  const page =
    chunk.page_start && chunk.page_end && chunk.page_start !== chunk.page_end
      ? `p.${chunk.page_start}–${chunk.page_end}`
      : chunk.page_start
        ? `p.${chunk.page_start}`
        : null;

  return (
    <article className="rounded-2xl border border-pplx-border bg-pplx-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-pplx-ink">
            #{chunk.rank}{' '}
            <span className="font-normal text-pplx-muted">
              {chunk.source_name || 'unknown source'}
              {page ? ` · ${page}` : ''}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-pplx-muted">
            {[chunk.generation, chunk.doc_type, chunk.section_title]
              .filter(Boolean)
              .join(' · ')}
            {chunk.score != null ? ` · score ${Number(chunk.score).toFixed(4)}` : ''}
          </p>
        </div>
        <span className="text-xs text-pplx-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-pplx-border px-4 py-3">
          {chunk.source_url ? (
            <a
              href={chunk.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-iitd-red hover:underline break-all"
            >
              {chunk.source_url}
            </a>
          ) : null}
          <div className="rounded-xl bg-[#f0ebe3] px-3 py-2 text-sm leading-relaxed text-pplx-ink whitespace-pre-wrap">
            {chunk.content}
          </div>
          <details className="text-xs text-pplx-muted">
            <summary className="cursor-pointer">Raw metadata</summary>
            <JsonBlock value={chunk.metadata} />
          </details>
        </div>
      ) : null}
    </article>
  );
}

export function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<Tab>('stats');

  const [stats, setStats] = useState<PortalStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [tools, setTools] = useState<PortalTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [argFields, setArgFields] = useState<Record<string, string>>({});
  const [toolGen, setToolGen] = useState<string>('2025');
  const [toolRunning, setToolRunning] = useState(false);
  const [toolResult, setToolResult] = useState<ToolRunResult | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const [ragQuery, setRagQuery] = useState('attendance rule');
  const [ragGen, setRagGen] = useState<'legacy' | '2025'>('2025');
  const [ragDocTypes, setRagDocTypes] = useState<string[]>([]);
  const [ragLimit, setRagLimit] = useState(8);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RagTestResult | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  useEffect(() => {
    const token = getPortalToken();
    if (!token) {
      setChecking(false);
      return;
    }
    portalMe()
      .then(() => setAuthed(true))
      .catch(() => {
        setPortalToken(null);
        setAuthed(false);
      })
      .finally(() => setChecking(false));
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      setStats(await portalStats());
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTools = useCallback(async () => {
    try {
      const data = await portalListTools();
      setTools(data.tools);
      if (!selectedTool && data.tools.length) {
        const first = data.tools[0].name;
        setSelectedTool(first);
        setArgFields(buildDefaultArgs(data.tools[0]));
      }
    } catch (e) {
      setToolError(e instanceof Error ? e.message : String(e));
    }
  }, [selectedTool]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'stats') loadStats();
    if (tab === 'tools' && tools.length === 0) loadTools();
  }, [authed, tab, loadStats, loadTools, tools.length]);

  const currentTool = useMemo(
    () => tools.find((t) => t.name === selectedTool) || null,
    [tools, selectedTool],
  );

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      await portalLogin(password);
      setPassword('');
      setAuthed(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoggingIn(false);
    }
  };

  const onLogout = () => {
    setPortalToken(null);
    setAuthed(false);
    setStats(null);
    setToolResult(null);
    setRagResult(null);
  };

  const onSelectTool = (name: string) => {
    setSelectedTool(name);
    const tool = tools.find((t) => t.name === name) || null;
    setArgFields(buildDefaultArgs(tool));
    setToolResult(null);
    setToolError(null);
  };

  const onRunTool = async () => {
    if (!currentTool) return;
    setToolRunning(true);
    setToolError(null);
    try {
      const result = await portalRunTool({
        tool_name: currentTool.name,
        arguments: coerceArgs(currentTool, argFields),
        curriculum_generation: toolGen || null,
      });
      setToolResult(result);
    } catch (e) {
      setToolError(e instanceof Error ? e.message : String(e));
    } finally {
      setToolRunning(false);
    }
  };

  const toggleDocType = (dt: string) => {
    setRagDocTypes((prev) =>
      prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt],
    );
  };

  const onRagSearch = async (e: FormEvent) => {
    e.preventDefault();
    setRagLoading(true);
    setRagError(null);
    try {
      const result = await portalRagTest({
        query: ragQuery,
        generation: ragGen,
        doc_types: ragDocTypes.length ? ragDocTypes : null,
        limit: ragLimit,
      });
      setRagResult(result);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : String(err));
    } finally {
      setRagLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pplx-bg text-pplx-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pplx-bg px-4">
        <form
          onSubmit={onLogin}
          className="w-full max-w-sm rounded-3xl border border-pplx-border bg-pplx-surface p-8 shadow-[0_8px_24px_-12px_rgba(32,24,18,0.12)]"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-iitd-red text-white">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-pplx-ink">Admin portal</h1>
            <p className="mt-1 text-sm text-pplx-muted">
              Enter the password from <code className="text-xs">ADMIN_PASSWORD</code>
            </p>
          </div>
          {loginError ? (
            <div className="mb-4 rounded-xl border border-iitd-red/25 bg-iitd-red-soft/50 px-3 py-2 text-sm text-iitd-red-dark">
              {loginError}
            </div>
          ) : null}
          <label className="block text-sm text-pplx-muted">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-xl border border-pplx-border bg-white px-3 py-2.5 text-pplx-ink outline-none focus:border-iitd-red"
            />
          </label>
          <button
            type="submit"
            disabled={loggingIn || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-iitd-red px-4 py-3 font-medium text-white hover:bg-iitd-red-dark disabled:opacity-60"
          >
            {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: 'stats', label: 'Stats', icon: Activity },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'rag', label: 'RAG tester', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-pplx-bg text-pplx-ink">
      <header className="border-b border-pplx-border bg-pplx-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-iitd-red">
              ChatIITD
            </p>
            <h1 className="text-xl font-semibold">Admin portal</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-pplx-border px-3 py-2 text-sm text-pplx-muted hover:bg-white"
          >
            <LogOut className="h-4 w-4" />
            Lock
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                tab === id
                  ? 'bg-iitd-red text-white'
                  : 'text-pplx-muted hover:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'stats' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Overview</h2>
              <button
                type="button"
                onClick={loadStats}
                disabled={statsLoading}
                className="rounded-xl border border-pplx-border px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
              >
                {statsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {statsError ? (
              <p className="text-sm text-iitd-red">{statsError}</p>
            ) : null}
            {stats?.db_error ? (
              <p className="text-sm text-iitd-red">DB: {stats.db_error}</p>
            ) : null}
            {stats ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Users" value={stats.users_total ?? '—'} />
                  <StatCard
                    label="Active (24h)"
                    value={stats.active_users?.['1d'] ?? '—'}
                    hint="Users with messages"
                  />
                  <StatCard
                    label="Active (7d)"
                    value={stats.active_users?.['7d'] ?? '—'}
                  />
                  <StatCard
                    label="Active (30d)"
                    value={stats.active_users?.['30d'] ?? '—'}
                  />
                  <StatCard label="Chats" value={stats.chats_total ?? '—'} />
                  <StatCard label="Messages" value={stats.messages_total ?? '—'} />
                  <StatCard
                    label="Msgs (7d)"
                    value={stats.messages_by_window?.['7d'] ?? '—'}
                  />
                  <StatCard
                    label="New chats (7d)"
                    value={stats.new_chats?.['7d'] ?? '—'}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    label="Courses"
                    value={stats.courses_total ?? '—'}
                    hint={
                      stats.courses_by_generation
                        ? Object.entries(stats.courses_by_generation)
                            .map(([g, n]) => `${g}: ${n}`)
                            .join(' · ')
                        : undefined
                    }
                  />
                  <StatCard
                    label="Catalog offerings"
                    value={stats.catalog_courses ?? '—'}
                  />
                  <StatCard
                    label="Knowledge chunks"
                    value={stats.knowledge?.points_count ?? '—'}
                    hint={
                      stats.knowledge?.error
                        ? stats.knowledge.error
                        : stats.knowledge?.doc_type_sample
                          ? Object.entries(stats.knowledge.doc_type_sample)
                              .map(([k, v]) => `${k}:${v}`)
                              .join(' · ')
                          : undefined
                    }
                  />
                </div>

                {stats.semesters?.length ? (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-pplx-muted">Semesters</h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.semesters.map((s) => (
                        <span
                          key={s.code}
                          className={`rounded-lg border px-2.5 py-1 text-xs ${
                            s.is_active
                              ? 'border-iitd-red/40 bg-iitd-red-soft text-iitd-red-dark'
                              : 'border-pplx-border bg-pplx-surface text-pplx-muted'
                          }`}
                        >
                          {s.code} · {s.label}
                          {s.is_active ? ' · active' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {stats.recent_chats?.length ? (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-pplx-muted">Recent chats</h3>
                    <div className="overflow-hidden rounded-2xl border border-pplx-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#ebe4da] text-xs uppercase tracking-wide text-pplx-muted">
                          <tr>
                            <th className="px-3 py-2">Title</th>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_chats.map((c) => (
                            <tr key={c.id} className="border-t border-pplx-border bg-pplx-surface">
                              <td className="px-3 py-2">{c.title || `Chat #${c.id}`}</td>
                              <td className="px-3 py-2 text-pplx-muted">
                                {c.kerberos || c.user_email || c.user_id}
                              </td>
                              <td className="px-3 py-2 text-pplx-muted">
                                {c.created_at
                                  ? new Date(c.created_at).toLocaleString()
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            ) : statsLoading ? (
              <div className="flex justify-center py-16 text-pplx-muted">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'tools' ? (
          <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="space-y-1">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <Database className="h-5 w-5" />
                Tools
              </h2>
              {tools.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => onSelectTool(t.name)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                    selectedTool === t.name
                      ? 'bg-iitd-red text-white'
                      : 'hover:bg-white text-pplx-ink'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </aside>

            <div className="space-y-4">
              {currentTool ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">{currentTool.name}</h3>
                    <p className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-sm text-pplx-muted">
                      {currentTool.description.split('\n')[0]}
                    </p>
                  </div>

                  <label className="block text-sm text-pplx-muted">
                    Curriculum generation context
                    <select
                      value={toolGen}
                      onChange={(e) => setToolGen(e.target.value)}
                      className="mt-1 w-full max-w-xs rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                    >
                      <option value="2025">2025</option>
                      <option value="legacy">legacy</option>
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(currentTool.parameters.properties || {}).map(
                      ([key, schema]) => (
                        <label key={key} className="block text-sm text-pplx-muted sm:col-span-2">
                          <span className="font-medium text-pplx-ink">
                            {key}
                            {currentTool.parameters.required?.includes(key) ? ' *' : ''}
                          </span>
                          {schema.description ? (
                            <span className="mt-0.5 block text-xs">{schema.description}</span>
                          ) : null}
                          {schema.enum ? (
                            <select
                              value={argFields[key] ?? ''}
                              onChange={(e) =>
                                setArgFields((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="mt-1 w-full rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                            >
                              <option value="">(omit)</option>
                              {schema.enum.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : schema.type === 'array' || key.includes('query') || key === 'section_name' ? (
                            <textarea
                              rows={schema.type === 'array' ? 2 : 3}
                              value={argFields[key] ?? ''}
                              onChange={(e) =>
                                setArgFields((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder={schema.type === 'array' ? '["COL100"]' : ''}
                              className="mt-1 w-full rounded-xl border border-pplx-border bg-white px-3 py-2 font-mono text-sm text-pplx-ink"
                            />
                          ) : (
                            <input
                              value={argFields[key] ?? ''}
                              onChange={(e) =>
                                setArgFields((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="mt-1 w-full rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                            />
                          )}
                        </label>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onRunTool}
                    disabled={toolRunning}
                    className="inline-flex items-center gap-2 rounded-xl bg-iitd-red px-4 py-2.5 text-sm font-medium text-white hover:bg-iitd-red-dark disabled:opacity-60"
                  >
                    {toolRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                    Run tool
                  </button>

                  {toolError ? <p className="text-sm text-iitd-red">{toolError}</p> : null}
                  {toolResult ? (
                    <div className="space-y-2">
                      <p className="text-xs text-pplx-muted">
                        {toolResult.elapsed_ms} ms
                      </p>
                      <JsonBlock value={toolResult.result_json ?? toolResult.result} />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-pplx-muted">Select a tool</p>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'rag' ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Hybrid RAG tester</h2>
              <p className="mt-1 text-sm text-pplx-muted">
                Runs the same <code>hybrid_search</code> path as the agent and shows retrieved chunks.
              </p>
            </div>

            <form onSubmit={onRagSearch} className="space-y-3 rounded-2xl border border-pplx-border bg-pplx-surface p-4">
              <label className="block text-sm text-pplx-muted">
                Query
                <input
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label className="block text-sm text-pplx-muted">
                  Generation
                  <select
                    value={ragGen}
                    onChange={(e) => setRagGen(e.target.value as 'legacy' | '2025')}
                    className="mt-1 block rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                  >
                    <option value="2025">2025</option>
                    <option value="legacy">legacy</option>
                  </select>
                </label>
                <label className="block text-sm text-pplx-muted">
                  Limit
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={ragLimit}
                    onChange={(e) => setRagLimit(Number(e.target.value) || 8)}
                    className="mt-1 block w-24 rounded-xl border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                  />
                </label>
                <div className="text-sm text-pplx-muted">
                  <p className="mb-1">Doc types</p>
                  <div className="flex gap-3">
                    {['rule', 'course', 'programme'].map((dt) => (
                      <label key={dt} className="inline-flex items-center gap-1.5 text-pplx-ink">
                        <input
                          type="checkbox"
                          checked={ragDocTypes.includes(dt)}
                          onChange={() => toggleDocType(dt)}
                        />
                        {dt}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={ragLoading || !ragQuery.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-iitd-red px-4 py-2.5 text-sm font-medium text-white hover:bg-iitd-red-dark disabled:opacity-60"
                >
                  {ragLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>
            </form>

            {ragError ? <p className="text-sm text-iitd-red">{ragError}</p> : null}

            {ragResult ? (
              <div className="space-y-3">
                <p className="text-sm text-pplx-muted">
                  {ragResult.hit_count} hits · {ragResult.elapsed_ms} ms · generation=
                  {ragResult.generation}
                </p>
                {ragResult.chunks.map((chunk) => (
                  <ChunkCard key={`${chunk.id}-${chunk.rank}`} chunk={chunk} />
                ))}
                {!ragResult.chunks.length ? (
                  <p className="text-sm text-pplx-muted">No chunks returned.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
