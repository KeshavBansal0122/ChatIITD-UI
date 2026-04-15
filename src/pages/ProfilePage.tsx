import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, UserProfile, AuthError, CourseSearchResult } from '../services/api';
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
  Check
} from 'lucide-react';

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

      const [profileData, coursesData] = await Promise.all([
        apiService.getUserProfile(accessToken),
        apiService.getUserCourses(accessToken),
      ]);

      setProfile(profileData);
      setCourses(coursesData.courses);
      setOriginalCourses(coursesData.courses);
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
      </div>
    );
  }

  const maxSemesters = profile?.max_semesters || 8;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 font-montserrat tracking-tight">Profile</h1>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Profile Info Card */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 font-montserrat">Personal Information</h2>
            <a
              href="https://auth.devclub.in/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200"
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

        {/* Courses Section */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 font-montserrat">Courses Completed</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Track the courses you've completed each semester
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDefaults}
                disabled={isLoadingDefaults}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white hover:bg-gray-50 text-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 border border-gray-200"
              >
                {isLoadingDefaults ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Load Defaults
              </button>

              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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

          <div className="divide-y divide-gray-100">
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
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-gray-900 mt-1 text-sm">{value || '—'}</dd>
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
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-medium text-gray-900 text-sm">Semester {semester}</span>
          <span className="text-xs text-gray-400">
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
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {code}
                <button
                  onClick={() => onRemoveCourse(code)}
                  className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors duration-150"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {courses.length === 0 && !isAddingMode && (
              <span className="text-sm text-gray-400 italic">No courses added</span>
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
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm transition-all duration-200"
                  autoFocus
                />
                <button
                  onClick={onCancelAdding}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search results dropdown */}
              {(searchResults.length > 0 || isSearching) && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-sm max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="px-3 py-3 text-gray-400 flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    searchResults.map(course => (
                      <button
                        key={course.code}
                        onClick={() => onAddCourse(course.code)}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="text-gray-900 font-medium text-sm">{course.code}</span>
                        <span className="text-gray-500 ml-2 text-sm">{course.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Direct add option */}
              {searchQuery.length >= 2 && !searchResults.find(c => c.code === searchQuery.toUpperCase()) && (
                <button
                  onClick={() => onAddCourse(searchQuery)}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add "{searchQuery.toUpperCase()}" anyway
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onStartAdding}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
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
