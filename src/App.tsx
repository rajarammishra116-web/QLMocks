import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { useData } from '@/hooks/useData';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/contexts/ThemeContext';
import { PageTransition } from '@/components/PageTransition';
import type { TestAttempt, Test, Question, ClassLevel } from '@/types';

// Lazy load components for code splitting
const Login = lazy(() => import('@/sections/Login').then(module => ({ default: module.Login })));
const StudentDashboard = lazy(() => import('@/sections/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const TestList = lazy(() => import('@/sections/TestList').then(module => ({ default: module.TestList })));
const TakeTest = lazy(() => import('@/sections/TakeTest').then(module => ({ default: module.TakeTest })));
const ResultPage = lazy(() => import('@/sections/ResultPage').then(module => ({ default: module.ResultPage })));
const AdminDashboard = lazy(() => import('@/sections/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UploadQuestions = lazy(() => import('@/sections/UploadQuestions').then(module => ({ default: module.UploadQuestions })));
const CreateTest = lazy(() => import('@/sections/CreateTest').then(module => ({ default: module.CreateTest })));
const AllResults = lazy(() => import('@/sections/AllResults').then(module => ({ default: module.AllResults })));

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading...</p>
    </div>
  </div>
);

// View types for navigation
type View =
  | 'login'
  | 'student-dashboard'
  | 'test-list'
  | 'take-test'
  | 'result'
  | 'admin-dashboard'
  | 'upload-questions'
  | 'create-test'
  | 'all-results';

function App() {
  const { user, isAuthenticated, isAdmin, login, register, logout, updatePassword, deleteAccount, resetPassword, isLoading: authLoading } = useAuth();
  const data = useData(user?.id, isAdmin);
  const { language, toggleLanguage, t } = useLanguage();
  const { theme } = useTheme();

  const [currentView, setCurrentView] = useState<View>('login');
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<TestAttempt | null>(null);

  // Registration race condition fix
  const [isRegistrationInProgress, setIsRegistrationInProgress] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
      } else {
        if (isAuthenticated && !isLoggingOut) {
          setCurrentView(isAdmin ? 'admin-dashboard' : 'student-dashboard');
        } else {
          setCurrentView('login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, isAdmin, isLoggingOut]);

  // Trigger admin data load
  useEffect(() => {
    if (isAuthenticated && isAdmin && !isLoggingOut) {
      data.loadAllQuestions();
    }
  }, [isAuthenticated, isAdmin, data.loadAllQuestions, isLoggingOut]);

  // Enhanced navigation that pushes history
  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
    window.history.pushState({ view }, '', `#${view}`);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      // Move to login view immediately to give feedback
      navigateTo('login');
      setActiveTest(null);
      setActiveAttempt(null);
      localStorage.removeItem('examtrack_auth'); // Legacy cleanup
      localStorage.removeItem('device_session_id');

      // Await actual firebase logout
      await logout();

      // Force hard reload to clear all in-memory state
      // This is the most robust way to ensure no "bounce back" or state artifacts
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed", error);
      // Fallback force reload even if firebase fails
      window.location.href = "/";
    }
  }, [logout, navigateTo]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const success = await login(email, password);
    return success;
  }, [login]);

  const handleRegister = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'admin',
    classLevel?: number,
    board?: string
  ) => {
    // Flag prevents switching to dashboard when Firebase auto-logs in after creation
    setIsRegistrationInProgress(true);
    try {
      const result = await register(name, email, password, role, classLevel, board);
      if (!result.success) {
        setIsRegistrationInProgress(false);
      }
      // Flag remains true on success - cleared only when user clicks "Proceed to Login"
      return result;
    } catch (e) {
      setIsRegistrationInProgress(false);
      throw e;
    }
  }, [register]);

  // Callback for Login.tsx to clear registration flag when user dismisses success screen
  const handleDismissRegistration = useCallback(() => {
    setIsRegistrationInProgress(false);
  }, []);

  const handleStartTest = useCallback(async (testId: string) => {
    console.log('=== START TEST ===');
    const test = data.getTestById(testId);

    if (test) {
      const existingAttempt = data.attempts
        .filter(a => a.testId === testId && (a.status === 'in-progress' || a.status === 'paused'))
        .sort((a, b) => new Date(b.lastUpdated || b.startedAt || 0).getTime() - new Date(a.lastUpdated || a.startedAt || 0).getTime())
      [0] || null;

      const previousAttemptsCount = data.attempts.filter(
        a => a.testId === testId && a.status === 'completed'
      ).length;

      if (previousAttemptsCount >= 2 && !existingAttempt) {
        alert("You have reached the maximum limit of 2 attempts for this test.");
        return;
      }

      if (previousAttemptsCount === 1 && !existingAttempt) {
        if (!confirm("Warning: This is your 2nd and LAST attempt for this test. Do you want to proceed?")) {
          return;
        }
      }

      if (existingAttempt) {
        setActiveAttempt(existingAttempt);
      } else {
        setActiveAttempt(null);
      }

      try {
        await data.loadQuestionsForTest(test);
      } catch (err) {
        console.error("Failed to load questions", err);
        alert("Failed to load test questions. Please check your connection.");
        return;
      }

      setActiveTest(test);
      navigateTo('take-test');
    } else {
      console.error('Test not found!');
      alert('Test not found. Please try again.');
    }
  }, [data, navigateTo]);

  const handleViewResult = useCallback(async (attemptId: string) => {
    const attempt = await data.getAttemptById(attemptId);
    if (attempt) {
      const test = data.tests.find(t => t.id === attempt.testId);
      if (test) {
        try {
          await data.loadQuestionsForTest(test);
        } catch (err) {
          console.error("Failed to load questions for result view", err);
        }
      }
      setActiveAttempt(attempt);
      navigateTo('result');
    }
  }, [data, navigateTo]);

  const handleUploadQuestions = useCallback((questions: Question[]) => {
    data.addQuestions(questions);
    navigateTo('admin-dashboard');
  }, [data, navigateTo]);

  const handleCreateTest = useCallback(async (testData: Omit<Test, 'id' | 'createdAt'>) => {
    try {
      await data.createTest(testData);
      navigateTo('admin-dashboard');
    } catch (error: any) {
      console.error('Failed to create test:', error);
      const errorMsg = error?.message || error?.code || String(error);
      alert(`Failed to create test: ${errorMsg}`);
    }
  }, [data, navigateTo]);

  // Auto-logout on inactivity
  const handleInactivityTimeout = useCallback(() => {
    handleLogout();
    alert('You have been logged out due to inactivity to protect your account.');
  }, [handleLogout]);

  useInactivityTimer(
    30 * 60 * 1000, // 30 minutes
    handleInactivityTimeout,
    isAuthenticated && !isRegistrationInProgress
  );

  // Reset isLoggingOut when auth state clears
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoggingOut(false);
    }
  }, [isAuthenticated]);

  // Initial redirect based on auth (run once or when auth changes)
  useEffect(() => {
    if (isRegistrationInProgress || isLoggingOut) return;

    if (currentView === 'login' && isAuthenticated && user) {
      const nextView = user.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
      setCurrentView(nextView);
      window.history.replaceState({ view: nextView }, '', `#${nextView}`);
    } else if (isAuthenticated && user) {
      if (currentView === 'admin-dashboard' && user.role !== 'admin') {
        setCurrentView('student-dashboard');
      }
      if (currentView === 'student-dashboard' && user.role === 'admin') {
        setCurrentView('admin-dashboard');
      }
    }
  }, [isAuthenticated, user, currentView, isRegistrationInProgress, isLoggingOut]);

  // Loading state
  if (authLoading || (isAuthenticated && data.loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading Quantum Leap...</p>
        </div>
      </div>
    );
  }

  // Render current view
  const renderView = () => {
    let content;
    // CRITICAL FIX: Keep Login mounted if registration is in progress, even if firebase momentarily logs in
    const showLogin = !isAuthenticated || (isRegistrationInProgress && isAuthenticated);

    if (showLogin) {
      content = <Login onLogin={handleLogin} onRegister={handleRegister} onDismissRegistration={handleDismissRegistration} onForgotPassword={resetPassword} t={t} />;
    } else {
      switch (currentView) {
        case 'student-dashboard':
          content = (
            <StudentDashboard
              user={user!}
              attempts={data.getAttemptsByStudent(user!.id)}
              tests={data.tests}
              onStartTest={() => navigateTo('test-list')}
              onResumeTest={handleStartTest}
              onViewResult={handleViewResult}
              onLogout={handleLogout}
              onUpdatePassword={updatePassword}
              getSubjectName={data.getSubjectName}
              getChapterName={data.getChapterName}
              t={t}
              deleteAccount={deleteAccount}
            />
          );
          break;

        case 'test-list':
          content = (
            <div className={theme === 'dark' ? 'dark' : ''}>
              <TestList
                user={user!}
                tests={data.tests}
                onStartTest={handleStartTest}
                onBack={() => navigateTo('student-dashboard')}
                getSubjectName={data.getSubjectName}
                t={t}
                language={language}
                getSubjectsByClass={data.getSubjectsByClass}
              />
            </div>
          );
          break;

        case 'take-test':
          if (!activeTest) return null;
          const testQuestions = activeTest.questionIds
            .map(id => data.questions.find(q => q.id === id))
            .filter((q): q is Question => q !== undefined);
          content = (
            <div className={theme === 'dark' ? 'dark' : ''}>
              <TakeTest
                user={user!}
                test={activeTest}
                questions={testQuestions}
                existingAttempt={activeAttempt || undefined}
                onStartAttempt={data.startAttempt}
                onUpdateAttempt={data.updateAttempt}
                onFinishAttempt={data.finishAttempt}
                onCancel={() => {
                  setActiveAttempt(null);
                  navigateTo('test-list');
                }}
                onComplete={(attempt) => {
                  setActiveAttempt(attempt);
                  setActiveTest(null);
                  navigateTo('result');
                }}
                language={language}
              />
            </div>
          );
          break;

        case 'result':
          if (!activeAttempt) return null;
          const resultTest = data.tests.find(t => t.id === activeAttempt.testId);
          if (!resultTest) return null;
          const resultQuestions = resultTest.questionIds
            .map(id => data.questions.find(q => q.id === id))
            .filter((q): q is Question => q !== undefined);
          const analytics = data.calculateAnalytics(activeAttempt, resultTest);
          content = (
            <div className={!isAdmin && theme === 'dark' ? 'dark' : ''}>
              <ResultPage
                attempt={activeAttempt}
                test={resultTest}
                questions={resultQuestions}
                analytics={analytics}
                onBack={() => navigateTo(isAdmin ? 'admin-dashboard' : 'student-dashboard')}
                getSubjectName={data.getSubjectName}
                getChapterName={data.getChapterName}
                getTopicName={data.getTopicName}
                t={t}
                language={language}
              />
            </div>
          );
          break;

        case 'admin-dashboard':
          content = (
            <AdminDashboard
              user={user!}
              tests={data.tests}
              questions={data.questions}
              attempts={data.attempts}
              onUploadQuestions={() => navigateTo('upload-questions')}
              onCreateTest={() => navigateTo('create-test')}
              onViewResults={() => navigateTo('all-results')}
              onLogout={handleLogout}
              onDeleteTest={data.deleteTest}
              onCleanupOrphanedQuestions={data.cleanupOrphanedQuestions}
              onCleanupOrphanedAttempts={data.cleanupOrphanedAttempts}
              onCleanupOldAttempts={data.cleanupOldAttempts}
              onFetchUsers={data.fetchUsers}
              onDeleteUser={data.deleteUser}
              getSubjectName={data.getSubjectName}
              refreshAttempts={data.refreshAdminAttempts}
              fetchMoreTests={data.fetchMoreTests}
              hasMoreTests={data.hasMoreTests}
              t={t}
            />
          );
          break;

        case 'upload-questions':
          content = (
            <UploadQuestions
              onUpload={handleUploadQuestions}
              onBack={() => navigateTo('admin-dashboard')}
              t={t}
            />
          );
          break;

        case 'create-test':
          const syncGetQuestionsByFilter = (classLevel?: ClassLevel, subjectId?: string, chapterId?: string, topicId?: string) => {
            let filtered = data.questions;
            if (classLevel) filtered = filtered.filter((q: Question) => q.classLevel === classLevel);
            if (subjectId) filtered = filtered.filter((q: Question) => q.subjectId === subjectId);
            if (chapterId) filtered = filtered.filter((q: Question) => q.chapterId === chapterId);
            if (topicId) filtered = filtered.filter((q: Question) => q.topicId === topicId);
            return filtered;
          };

          content = (
            <CreateTest
              questions={data.questions}
              onCreate={handleCreateTest}
              onAddQuestions={data.addQuestions}
              onBack={() => navigateTo('admin-dashboard')}
              getSubjectsByClass={data.getSubjectsByClass}
              getQuestionsByFilter={syncGetQuestionsByFilter}
              t={t}
            />
          );
          break;

        case 'all-results':
          content = (
            <div className={!isAdmin && theme === 'dark' ? 'dark' : ''}>
              <AllResults
                attempts={data.attempts}
                tests={data.tests}
                onViewAttempt={handleViewResult}
                onBack={() => navigateTo(isAdmin ? 'admin-dashboard' : 'student-dashboard')}
                getSubjectName={data.getSubjectName}
                t={t}
              />
            </div>
          );
          break;

        default:
          content = isAdmin ? (
            <AdminDashboard
              user={user!}
              tests={data.tests}
              questions={data.questions}
              attempts={data.attempts}
              onUploadQuestions={() => navigateTo('upload-questions')}
              onCreateTest={() => navigateTo('create-test')}
              onViewResults={() => navigateTo('all-results')}
              onLogout={handleLogout}
              onDeleteTest={data.deleteTest}
              onCleanupOrphanedQuestions={data.cleanupOrphanedQuestions}
              onCleanupOrphanedAttempts={data.cleanupOrphanedAttempts}
              onCleanupOldAttempts={data.cleanupOldAttempts}
              onFetchUsers={data.fetchUsers}
              onDeleteUser={data.deleteUser}
              getSubjectName={data.getSubjectName}
              refreshAttempts={data.refreshAdminAttempts}
              fetchMoreTests={data.fetchMoreTests}
              hasMoreTests={data.hasMoreTests}
              t={t}
            />
          ) : (
            <StudentDashboard
              user={user!}
              attempts={data.getAttemptsByStudent(user!.id)}
              tests={data.tests}
              onStartTest={() => navigateTo('test-list')}
              onResumeTest={handleStartTest}
              onViewResult={handleViewResult}
              onLogout={handleLogout}
              onUpdatePassword={updatePassword}
              getSubjectName={data.getSubjectName}
              getChapterName={data.getChapterName}
              t={t}
              deleteAccount={deleteAccount}
            />
          );
      }
    }

    return (
      <PageTransition key={currentView} className="w-full">
        <Suspense fallback={<LoadingScreen />}>
          {content}
        </Suspense>
      </PageTransition>
    );
  };

  const LanguageToggle = () => (
    <button
      onClick={toggleLanguage}
      className="fixed bottom-4 right-4 z-50 bg-white shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border"
    >
      {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderView()}
      {isAuthenticated && <LanguageToggle />}
    </div>
  );
}

export default App;
