import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, UserProfile, AuthError, CourseSearchResult, UsageStatus, LlmCredentialsPublic } from '../services/api';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import {
  ArrowLeft,
  ExternalLink,
  LogOut,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Download,
  Save,
  AlertCircle,
  Check,
  KeyRound
} from 'lucide-react';

const LLM_PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'google', label: 'Google (Gemini)' },
  { id: 'groq', label: 'Groq' },
  { id: 'custom', label: 'Custom (OpenAI-compatible)' },
] as const;

export function ProfilePage() {
  const navigate = useNavigate();
  const { accessToken, logout, handleAuthError } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Record<string, string[]>>({});
  const [originalCourses, setOriginalCourses] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [invalidCourses, setInvalidCourses] = useState<string[]>([]);

  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [llmCreds, setLlmCreds] = useState<LlmCredentialsPublic | null>(null);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [isSavingLlm, setIsSavingLlm] = useState(false);
  const [llmMessage, setLlmMessage] = useState<string | null>(null);
  const [customProviderOpen, setCustomProviderOpen] = useState(false);

  const [expandedSemesters, setExpandedSemesters] = useState<Set<number>>(new Set([1]));

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CourseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSemester, setAddingSemester] = useState<number | null>(null);

  const hasChanges = JSON.stringify(courses) !== JSON.stringify(originalCourses);

  const loadProfile = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      setError(null);

      const [profileData, coursesData, usageData, llmData] = await Promise.all([
        apiService.getUserProfile(accessToken),
        apiService.getUserCourses(accessToken),
        apiService.getUsage(accessToken),
        apiService.getLlmCredentials(accessToken),
      ]);

      setProfile(profileData);
      setCourses(coursesData.courses);
      setOriginalCourses(coursesData.courses);
      setUsage(usageData);
      setLlmCreds(llmData.credentials || null);
      if (llmData.credentials?.provider) {
        setLlmProvider(llmData.credentials.provider);
        setLlmModel(llmData.credentials.model || '');
        setLlmBaseUrl(llmData.credentials.base_url || '');
        setCustomProviderOpen(true);
      }
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      setError('Failed to load profile data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, handleAuthError]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveLlm = async () => {
    if (!accessToken || !llmApiKey.trim()) return;
    try {
      setIsSavingLlm(true);
      setLlmMessage(null);
      const res = await apiService.putLlmCredentials(accessToken, {
        provider: llmProvider,
        api_key: llmApiKey.trim(),
        base_url: llmProvider === 'custom' ? llmBaseUrl.trim() : llmBaseUrl.trim() || undefined,
        model: llmModel.trim() || undefined,
      });
      setLlmCreds(res.credentials || null);
      setLlmApiKey('');
      setLlmMessage('API key saved (encrypted). Shared token limits are bypassed.');
      const usageData = await apiService.getUsage(accessToken);
      setUsage(usageData);
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      setLlmMessage(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSavingLlm(false);
    }
  };

  const handleRemoveLlm = async () => {
    if (!accessToken) return;
    try {
      setIsSavingLlm(true);
      await apiService.deleteLlmCredentials(accessToken);
      setLlmCreds(null);
      setLlmApiKey('');
      setLlmMessage('Removed your API key. Shared limits apply again.');
      const usageData = await apiService.getUsage(accessToken);
      setUsage(usageData);
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      setLlmMessage('Failed to remove API key');
    } finally {
      setIsSavingLlm(false);
    }
  };

  const handleLoadDefaults = async () => {
    if (!accessToken) return;

    try {
      setIsLoadingDefaults(true);
      setError(null);

      const defaults = await apiService.getDefaultCourses(accessToken);
      setCourses(defaults.courses);
      setSuccessMessage(`Loaded recommended courses for semesters 1-${defaults.current_semester - 1}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      setError('Failed to load default courses');
      console.error(err);
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;

    try {
      setIsSaving(true);
      setError(null);
      setInvalidCourses([]);

      const result = await apiService.updateUserCourses(accessToken, courses);
      setCourses(result.courses);
      setOriginalCourses(result.courses);

      if (result.validation.invalid.length > 0) {
        setInvalidCourses(result.validation.invalid);
        setError(`Some courses were not found: ${result.validation.invalid.join(', ')}`);
      } else {
        setSuccessMessage('Courses saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError();
        return;
      }
      setError('Failed to save courses');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchCourses = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!accessToken) return;

    try {
      setIsSearching(true);
      const result = await apiService.searchCourses(accessToken, query);
      setSearchResults(result.courses);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addCourse = (semester: number, courseCode: string) => {
    const semKey = String(semester);
    const currentCourses = courses[semKey] || [];

    if (!currentCourses.includes(courseCode.toUpperCase())) {
      setCourses({
        ...courses,
        [semKey]: [...currentCourses, courseCode.toUpperCase()],
      });
    }

    setSearchQuery('');
    setSearchResults([]);
    setAddingSemester(null);
  };

  const removeCourse = (semester: number, courseCode: string) => {
    const semKey = String(semester);
    const currentCourses = courses[semKey] || [];

    setCourses({
      ...courses,
      [semKey]: currentCourses.filter(c => c !== courseCode),
    });
  };

  const toggleSemester = (semester: number) => {
    const newExpanded = new Set(expandedSemesters);
    if (newExpanded.has(semester)) {
      newExpanded.delete(semester);
    } else {
      newExpanded.add(semester);
    }
    setExpandedSemesters(newExpanded);
  };

  if (isLoading) {
    return <LoadingScreen label="Loading profile..." />;
  }

  const maxSemesters = profile?.max_semesters || 8;

  return (
    <div className="min-h-screen bg-pplx-bg text-pplx-ink">
      {/* Header */}
      <header className="bg-pplx-surface border-b border-pplx-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-pplx-muted hover:text-pplx-ink hover:bg-[#f1ece5] rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-pplx-ink">Profile</h1>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="flex items-center gap-2 px-3 py-2 text-pplx-muted hover:text-iitd-red hover:bg-iitd-red-soft/50 rounded-lg transition-colors duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-iitd-red-soft/50 border border-iitd-red/25 text-iitd-red-dark px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-[#e8f0e6] border border-[#c5d6c1] text-[#2d4a28] px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Profile Info Card */}
        <section className="bg-pplx-surface rounded-2xl border border-pplx-border overflow-hidden">
          <div className="px-6 py-4 border-b border-pplx-border flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-pplx-ink">Personal Information</h2>
            <a
              href="https://auth.devclub.in/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-pplx-muted hover:text-pplx-ink transition-colors duration-200"
            >
              Edit on DevClub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileField label="Name" value={profile?.name} />
            <ProfileField label="Email" value={profile?.email} />
            <ProfileField label="Kerberos" value={profile?.kerberos} />
            <ProfileField label="Entry Number" value={profile?.entry_number} />
            <ProfileField label="Department" value={profile?.department} />
            <ProfileField label="Hostel" value={profile?.hostel} />
            <ProfileField label="Programme" value={profile?.programme_name} />
            <ProfileField label="Year of Joining" value={profile?.year_of_joining?.toString()} />
          </div>
        </section>

        {/* AI provider / quota */}
        <section className="bg-pplx-surface rounded-2xl border border-pplx-border overflow-hidden">
          <div className="px-6 py-4 border-b border-pplx-border">
            <h2 className="text-base font-semibold tracking-tight text-pplx-ink flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-iitd-red" />
              AI provider
            </h2>
            <p className="text-sm text-pplx-muted mt-0.5">
              Each signed-in account has its own rolling token budget on the shared model pool.
              Use your own OpenAI / Claude / compatible key to bypass it.
              ChatIITD stays IIT Delhi academics only either way.
            </p>
          </div>
          <div className="px-6 py-5 space-y-5">
            {usage && (() => {
              const pct = usage.limit > 0
                ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
                : 0;
              const barTone = usage.byok
                ? 'bg-pplx-muted/30'
                : pct >= 100
                  ? 'bg-iitd-red'
                  : pct >= 80
                    ? 'bg-amber-500'
                    : 'bg-iitd-red/80';
              return (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-pplx-ink">Your usage</span>
                    {usage.byok ? (
                      <span className="text-pplx-muted">Bypassed (your API key)</span>
                    ) : (
                      <span className="text-pplx-muted tabular-nums">
                        {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} tokens
                        <span className="text-pplx-muted/80"> · last {usage.window_hours}h · this account</span>
                      </span>
                    )}
                  </div>
                  <div
                    className={`h-2.5 w-full overflow-hidden rounded-full bg-[#ebe4da] ${usage.byok ? 'opacity-50' : ''}`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={usage.limit}
                    aria-valuenow={usage.byok ? 0 : usage.used}
                    aria-label="Shared token usage"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ease-out ${barTone}`}
                      style={{ width: usage.byok ? '0%' : `${pct}%` }}
                    />
                  </div>
                  {!usage.byok && (
                    <p className="text-xs text-pplx-muted">
                      {usage.remaining === 0
                        ? 'Limit reached for this window.'
                        : `${usage.remaining.toLocaleString()} tokens remaining.`}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="rounded-xl border border-pplx-border overflow-hidden">
              <button
                type="button"
                onClick={() => setCustomProviderOpen((open) => !open)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f7f3ed] transition-colors"
                aria-expanded={customProviderOpen}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-pplx-ink flex items-center gap-2">
                    Custom provider
                    {llmCreds && (
                      <span className="text-xs font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-pplx-muted mt-0.5 truncate">
                    {llmCreds
                      ? `${llmCreds.provider}${llmCreds.model ? ` · ${llmCreds.model}` : ''} · ${llmCreds.key_fingerprint}`
                      : 'Optional — use your own OpenAI / Claude / compatible key'}
                  </p>
                </div>
                {customProviderOpen ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-pplx-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-pplx-muted" />
                )}
              </button>

              {customProviderOpen && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-pplx-border bg-[#fcfaf7]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm space-y-1">
                      <span className="text-pplx-muted">Provider</span>
                      <select
                        value={llmProvider}
                        onChange={(e) => setLlmProvider(e.target.value)}
                        className="w-full rounded-lg border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                      >
                        {LLM_PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-pplx-muted">Model (optional)</span>
                      <input
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        placeholder="e.g. gpt-4.1-mini"
                        className="w-full rounded-lg border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                      />
                    </label>
                    {llmProvider === 'custom' && (
                      <label className="text-sm space-y-1 sm:col-span-2">
                        <span className="text-pplx-muted">Base URL</span>
                        <input
                          value={llmBaseUrl}
                          onChange={(e) => setLlmBaseUrl(e.target.value)}
                          placeholder="https://api.example.com/v1"
                          className="w-full rounded-lg border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                        />
                      </label>
                    )}
                    <label className="text-sm space-y-1 sm:col-span-2">
                      <span className="text-pplx-muted">API key</span>
                      <input
                        type="password"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder={llmCreds ? 'Enter a new key to replace' : 'sk-...'}
                        autoComplete="off"
                        className="w-full rounded-lg border border-pplx-border bg-white px-3 py-2 text-pplx-ink"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveLlm}
                      disabled={isSavingLlm || !llmApiKey.trim() || (llmProvider === 'custom' && !llmBaseUrl.trim())}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-iitd-red hover:bg-iitd-red-dark text-white rounded-lg disabled:opacity-40"
                    >
                      {isSavingLlm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save key
                    </button>
                    {llmCreds && (
                      <button
                        onClick={handleRemoveLlm}
                        disabled={isSavingLlm}
                        className="px-3 py-2 text-sm border border-pplx-border rounded-lg text-pplx-ink hover:bg-[#f1ece5]"
                      >
                        Remove key
                      </button>
                    )}
                  </div>
                  {llmMessage && (
                    <p className="text-sm text-pplx-muted">{llmMessage}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section className="bg-pplx-surface rounded-2xl border border-pplx-border overflow-hidden">
          <div className="px-6 py-4 border-b border-pplx-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-pplx-ink">Courses Completed</h2>
              <p className="text-sm text-pplx-muted mt-0.5">
                Track the courses you've completed each semester
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDefaults}
                disabled={isLoadingDefaults}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-pplx-surface hover:bg-[#f1ece5] text-pplx-ink rounded-lg transition-colors duration-200 disabled:opacity-50 border border-pplx-border"
              >
                {isLoadingDefaults ? (
                  <Loader2 className="w-4 h-4 animate-spin text-iitd-red" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Load Defaults
              </button>

              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-iitd-red hover:bg-iitd-red-dark text-white rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>

          <div className="divide-y divide-pplx-border">
            {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semester => (
              <SemesterSection
                key={semester}
                semester={semester}
                courses={courses[String(semester)] || []}
                isExpanded={expandedSemesters.has(semester)}
                onToggle={() => toggleSemester(semester)}
                onRemoveCourse={(code) => removeCourse(semester, code)}
                onAddCourse={(code) => addCourse(semester, code)}
                isAddingMode={addingSemester === semester}
                onStartAdding={() => setAddingSemester(semester)}
                onCancelAdding={() => {
                  setAddingSemester(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                searchQuery={searchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                onSearchChange={handleSearchCourses}
                invalidCourses={invalidCourses}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-pplx-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-pplx-ink mt-1 text-sm">{value || '—'}</dd>
    </div>
  );
}

interface SemesterSectionProps {
  semester: number;
  courses: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveCourse: (code: string) => void;
  onAddCourse: (code: string) => void;
  isAddingMode: boolean;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  searchQuery: string;
  searchResults: CourseSearchResult[];
  isSearching: boolean;
  onSearchChange: (query: string) => void;
  invalidCourses: string[];
}

function SemesterSection({
  semester,
  courses,
  isExpanded,
  onToggle,
  onRemoveCourse,
  onAddCourse,
  isAddingMode,
  onStartAdding,
  onCancelAdding,
  searchQuery,
  searchResults,
  isSearching,
  onSearchChange,
  invalidCourses,
}: SemesterSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f1ece5]/60 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-pplx-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-pplx-muted" />
          )}
          <span className="font-medium text-pplx-ink text-sm">Semester {semester}</span>
          <span className="text-xs text-pplx-muted">
            ({courses.length} course{courses.length !== 1 ? 's' : ''})
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-5 pl-14">
          {/* Course chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {courses.map(code => (
              <div
                key={code}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                  invalidCourses.includes(code)
                    ? 'bg-iitd-red-soft text-iitd-red border border-iitd-red/25'
                    : 'bg-[#f1ece5] text-pplx-ink border border-pplx-border'
                }`}
              >
                {code}
                <button
                  onClick={() => onRemoveCourse(code)}
                  className="ml-1 p-0.5 hover:bg-black/5 rounded-full transition-colors duration-150"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {courses.length === 0 && !isAddingMode && (
              <span className="text-sm text-pplx-muted italic">No courses added</span>
            )}
          </div>

          {/* Add course */}
          {isAddingMode ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Type course code (e.g., COL100)"
                  className="flex-1 px-3 py-2 bg-pplx-surface border border-pplx-border rounded-lg text-pplx-ink placeholder:text-pplx-muted focus:outline-none focus:ring-2 focus:ring-iitd-red/40 focus:border-iitd-red/45 text-sm transition-all duration-200"
                  autoFocus
                />
                <button
                  onClick={onCancelAdding}
                  className="p-2 text-pplx-muted hover:text-pplx-ink hover:bg-[#f1ece5] rounded-lg transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search results dropdown */}
              {(searchResults.length > 0 || isSearching) && (
                <div className="absolute z-10 mt-1 w-full bg-pplx-surface border border-pplx-border rounded-xl shadow-sm max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="px-3 py-3 text-pplx-muted flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-iitd-red" />
                      Searching...
                    </div>
                  ) : (
                    searchResults.map(course => (
                      <button
                        key={course.code}
                        onClick={() => onAddCourse(course.code)}
                        className="w-full px-3 py-2.5 text-left hover:bg-iitd-red-soft/40 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="text-pplx-ink font-medium text-sm">{course.code}</span>
                        <span className="text-pplx-muted ml-2 text-sm">{course.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Direct add option */}
              {searchQuery.length >= 2 && !searchResults.find(c => c.code === searchQuery.toUpperCase()) && (
                <button
                  onClick={() => onAddCourse(searchQuery)}
                  className="mt-2 text-sm text-pplx-muted hover:text-iitd-red flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add "{searchQuery.toUpperCase()}" anyway
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onStartAdding}
              className="flex items-center gap-2 px-3 py-2 text-sm text-pplx-muted hover:text-pplx-ink hover:bg-[#f1ece5] rounded-lg transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          )}
        </div>
      )}
    </div>
  );
}
