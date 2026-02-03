import { useState, useCallback, useEffect } from 'react';
import { Login } from '@/sections/Login';
import { StudentDashboard } from '@/sections/StudentDashboard';
import { TestList } from '@/sections/TestList';
import { TakeTest } from '@/sections/TakeTest';
import { ResultPage } from '@/sections/ResultPage';
import { AdminDashboard } from '@/sections/AdminDashboard';
import { UploadQuestions } from '@/sections/UploadQuestions';
import { CreateTest } from '@/sections/CreateTest';
import { AllResults } from '@/sections/AllResults';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/contexts/ThemeContext';
import { PageTransition } from '@/components/PageTransition';
import type { TestAttempt, Test, Question, ClassLevel } from '@/types';

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

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
        // Restore active test/attempt if needed (simplified for now)
        // ideally state should contain all context
      } else {
        // Default fallbacks based on auth
        if (isAuthenticated) {
          setCurrentView(isAdmin ? 'admin-dashboard' : 'student-dashboard');
        } else {
          setCurrentView('login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, isAdmin]);

  // Trigger admin data load
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      data.loadAllQuestions(); // Trigger background load of all questions
    }
  }, [isAuthenticated, isAdmin, data.loadAllQuestions]);

  // Enhanced navigation that pushes history
  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
    window.history.pushState({ view }, '', `#${view}`);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const success = await login(email, password);
    // Navigation is handled by the useEffect watching isAuthenticated and user state
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
    const result = await register(name, email, password, role, classLevel, board);
    // Login component will handle displaying the error if result.success is false
    return result;
  }, [register]);

  const handleLogout = useCallback(() => {
    logout();
    navigateTo('login');
    setActiveTest(null);
    setActiveAttempt(null);
    // Clear legacy local storage if it exists to prevent future bugs
    localStorage.removeItem('examtrack_auth');
  }, [logout, navigateTo]);

  // Test handlers
  const handleStartTest = useCallback(async (testId: string) => {
    console.log('=== START TEST ===');
    const test = data.getTestById(testId);

    if (test) {
      // Check for existing in-progress attempt
      const existingAttempt = data.attempts.find(
        a => a.testId === testId &&
          (a.status === 'in-progress' || a.status === 'paused')
      );

      // Check for total attempts count (completed + in-progress, excluding current if resuming)
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
        console.log('Resuming existing attempt:', existingAttempt.id, existingAttempt);
        setActiveAttempt(existingAttempt);
      } else {
        console.log('Starting new test session');
        setActiveAttempt(null);
      }

      // Lazy load questions before starting
      try {
        await data.loadQuestionsForTest(test);
      } catch (err) {
        console.error("Failed to load questions", err);
        alert("Failed to load test questions. Please check your connection.");
        return;
      }

      // Re-confirm attempt state just in case (optional, but good for debugging)
      if (existingAttempt) {
        console.log('Proceeding with attempt:', existingAttempt.id);
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
      console.log('Creating test with data:', testData);
      await data.createTest(testData);
      console.log('Test created successfully:', testData.name);
      navigateTo('admin-dashboard');
    } catch (error: any) {
      console.error('Failed to create test:', error);
      const errorMsg = error?.message || error?.code || String(error);
      alert(`Failed to create test: ${errorMsg}`);
    }
  }, [data, navigateTo]);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        alert('You have been logged out due to inactivity to protect your account.');
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Set initial timer
    resetTimer();

    // Add listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, handleLogout]);

  // Initial redirect based on auth (run once)
  // Initial redirect based on auth (run once)
  useEffect(() => {
    if (currentView === 'login' && isAuthenticated && user) {
      // Direct traffic based on role
      const nextView = user.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
      setCurrentView(nextView);
      window.history.replaceState({ view: nextView }, '', `#${nextView}`);
    } else if (isAuthenticated && user) {
      // Security check: Prevent students from accessing admin dashboard
      if (currentView === 'admin-dashboard' && user.role !== 'admin') {
        setCurrentView('student-dashboard');
      }
      // Security check: Prevent admins from being stuck on student dashboard (optional, but good for UX)
      if (currentView === 'student-dashboard' && user.role === 'admin') {
        setCurrentView('admin-dashboard');
      }
    }
  }, [isAuthenticated, user, currentView]);

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
    if (!isAuthenticated) {
      content = <Login onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={resetPassword} t={t} />;
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
                onBack={() => {
                  window.history.back(); // Use browser back for "Back" buttons to keep history consistent?
                  // Or navigateTo('student-dashboard')?
                  // Using navigateTo mimics standard app behavior but might add to stack.
                  // Let's use navigateTo for explicit "Back" buttons to be safe with state, 
                  // but user REQUESTED back gesture support.
                  navigateTo('student-dashboard');
                }}
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
              onCleanupOldAttempts={data.cleanupOldAttempts}
              getSubjectName={data.getSubjectName}
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
          // Create sync wrapper for getQuestionsByFilter using already-loaded questions
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
              onCleanupOldAttempts={data.cleanupOldAttempts}
              getSubjectName={data.getSubjectName}
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
        {content}
      </PageTransition>
    );
  };

  // Language toggle button (shown when authenticated)
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
