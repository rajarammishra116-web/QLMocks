import { useState, useEffect, useCallback, useRef } from 'react';
import { useProctoringMonitor } from '@/hooks/useProctoringMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, Keyboard, Info, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Test, Question, User, TestAttempt } from '@/types';

interface TakeTestProps {
  user: User;
  test: Test;
  questions: Question[];
  existingAttempt?: TestAttempt;
  onStartAttempt: (testId: string) => Promise<string>;
  onUpdateAttempt: (attemptId: string, data: Partial<TestAttempt>) => Promise<void>;
  onFinishAttempt: (attemptId: string, data: Partial<TestAttempt>) => Promise<void>;
  onCancel: () => void;
  onComplete: (attempt: TestAttempt) => void;
  language: 'en' | 'or';
}

export function TakeTest({
  user,
  test,
  questions,
  existingAttempt,
  onStartAttempt,
  onUpdateAttempt,
  onFinishAttempt,
  onCancel,
  onComplete,
  language,
}: TakeTestProps) {
  // Initialize state from existing attempt or defaults
  const [attemptId, setAttemptId] = useState<string | null>(existingAttempt?.id || null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D' | null>>(() => {
    console.log('TakeTest INIT - existingAttempt:', existingAttempt?.id, 'answers:', existingAttempt?.answers ? Object.keys(existingAttempt.answers).length : 0, 'timeRemaining:', existingAttempt?.timeRemaining);
    return existingAttempt?.answers || {};
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  const [timeLeft, setTimeLeft] = useState(() => {
    return existingAttempt?.timeRemaining ?? (test.timeLimitMinutes * 60);
  });

  const [warningCount, setWarningCount] = useState(() => {
    return existingAttempt?.warningCount || 0;
  });

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!existingAttempt); // Skip instructions if resuming
  const [isExamStarted, setIsExamStarted] = useState(!!existingAttempt);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const attemptIdRef = useRef<string | null>(existingAttempt?.id || null);
  const hasCheckedInterruption = useRef(false);

  // Proctoring Monitor
  const { requestFullscreen } = useProctoringMonitor({
    enabled: isExamStarted && !showSubmitDialog && !showInstructions && !isSubmitting,
    strictMode: true,
    onViolation: (type, _count) => {
      if (!isExamStarted || isSubmitting || showSubmitDialog) return;

      console.warn(`Proctoring violation detected: ${type}`);

      setWarningCount(prev => {
        const newCount = prev + 1;

        // Sync warning to Firestore immediately
        const currentAttemptId = attemptIdRef.current;
        if (currentAttemptId) {
          onUpdateAttempt(currentAttemptId, { warningCount: newCount });
        }

        return newCount;
      });

      if (warningCount < 2) {
        setShowWarningDialog(true);
      }
    }
  });

  // Use ref to always have synchronous access to latest answers (critical for auto-submit)
  const answersRef = useRef<Record<string, 'A' | 'B' | 'C' | 'D' | null>>(existingAttempt?.answers || {});
  const timeLeftRef = useRef<number>(existingAttempt?.timeRemaining ?? (test.timeLimitMinutes * 60));

  // Periodic Firestore Sync (Every 10s) to ensure Dashboard has fresh data
  useEffect(() => {
    if (!isExamStarted) return;

    const syncInterval = setInterval(() => {
      const currentAttemptId = attemptIdRef.current;
      if (currentAttemptId) {
        console.log('Auto-syncing to Firestore...', { answers: Object.keys(answersRef.current).length });
        onUpdateAttempt(currentAttemptId, {
          answers: answersRef.current,
          timeRemaining: timeLeftRef.current,
          lastUpdated: new Date()
        }).catch(err => console.error("Auto-sync failed:", err));
      }
    }, 10000); // Reduced from 30s to 10s

    return () => clearInterval(syncInterval);
  }, [isExamStarted, onUpdateAttempt]);

  // Initialize attempt if new
  useEffect(() => {
    if (!existingAttempt && !attemptIdRef.current) {
      console.log('Initializing new attempt...');
      onStartAttempt(test.id)
        .then(id => {
          console.log('New attempt created:', id);
          setAttemptId(id);
          attemptIdRef.current = id;
        })
        .catch(err => {
          console.error("Failed to start exam attempt:", err);
          alert("Critical Error: Failed to initialize exam session. Please check your internet connection and reload the page.");
        });
    } else if (existingAttempt && existingAttempt.id !== attemptIdRef.current) {
      // Prop update handling
      console.log('New existingAttempt prop received:', existingAttempt.id);
      setAttemptId(existingAttempt.id);
      attemptIdRef.current = existingAttempt.id;
      if (existingAttempt.answers && Object.keys(answers).length === 0) {
        console.log('Hydrating answers from prop update:', Object.keys(existingAttempt.answers).length);
        setAnswers(existingAttempt.answers);
        answersRef.current = existingAttempt.answers;
      }
    }
  }, [existingAttempt, test.id, onStartAttempt, answers]);

  const [shuffledQuestions] = useState(() => {
    if (!questions || questions.length === 0) {
      console.error('TakeTest: NO QUESTIONS RECEIVED');
      return [];
    }

    return test.shuffleQuestions
      ? [...questions].sort(() => Math.random() - 0.5)
      : questions;
  });

  // Handle empty questions case - show error instead of crashing
  if (!shuffledQuestions || shuffledQuestions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Questions Available</h2>
          <p className="text-gray-600 mb-6">
            This test doesn't have any questions loaded yet. Please contact your administrator to add questions to this test.
          </p>
          <Button onClick={onCancel} className="w-full">
            Return to Test List
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  // Load state from local storage (Recovery) OR Check for Firestore interruption
  useEffect(() => {
    if (hasCheckedInterruption.current) return;
    hasCheckedInterruption.current = true;

    const storageKey = `exam_state_${test.id}_${user.id}`;
    const savedState = localStorage.getItem(storageKey);
    console.log(`Checking localStorage [${storageKey}]:`, savedState ? 'Found' : 'Empty');

    let recoveredIds: { attemptId?: string } = {};

    // 1. Try to recover from Local Storage (Best Source)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('Found local saved state, restoring...', parsed);

        // CRITICAL: Update BOTH state AND refs for synchronous access
        if (parsed.answers) {
          setAnswers(parsed.answers);
          answersRef.current = parsed.answers; // Direct ref update!
        }
        if (parsed.timeLeft !== undefined) {
          setTimeLeft(parsed.timeLeft);
          timeLeftRef.current = parsed.timeLeft; // Direct ref update!
        }
        if (parsed.attemptId) {
          setAttemptId(parsed.attemptId);
          attemptIdRef.current = parsed.attemptId;
          recoveredIds.attemptId = parsed.attemptId;
        }

        // Logic for warnings (Check against Firestore or Local)
        // If we have an existing attempt passed from Dashboard, utilize it for warning tracking
        const dbWarningCount = existingAttempt?.warningCount || 0;
        const localWarningCount = parsed.warningCount || 0;
        const baseWarningCount = Math.max(dbWarningCount, localWarningCount);

        // If resuming an "in-progress" test, it counts as an interruption
        // (unless we paused cleanly, but 'paused' status handled by parent usually?)
        // Actually, if we are recovering from LocalStorage, it implies a refresh/crash unless status was paused.

        // Simple Rule: If page reloaded (useEffect runs again), increment warning.
        const newCount = baseWarningCount + 1;
        setWarningCount(newCount);
        console.log('Restoration/Interruption detected. Warning count:', newCount);

        // Sync warning to Firestore immediately
        const targetAttemptId = parsed.attemptId || existingAttempt?.id;
        if (targetAttemptId) {
          onUpdateAttempt(targetAttemptId, { warningCount: newCount });
        }

        if (newCount > 2) {
          alert("Too many interruptions! The test will be auto-submitted.");
          // logic to trigger submit handled by effect [warningCount]
        } else {
          setShowWarningDialog(true);
        }

        setIsExamStarted(true);
        setShowInstructions(false);
        return; // Done recovering from local
      } catch (e) {
        console.error("Failed to parse local state", e);
      }
    }

    // 2. Fallback to Firestore (existingAttempt) if Local Storage failed or empty
    if (existingAttempt) {
      console.log('Restoring from Firestore attempt...', existingAttempt);
      if (existingAttempt.answers) {
        setAnswers(existingAttempt.answers);
        answersRef.current = existingAttempt.answers; // Direct ref update!
      }
      if (existingAttempt.timeRemaining !== undefined) {
        setTimeLeft(existingAttempt.timeRemaining);
        timeLeftRef.current = existingAttempt.timeRemaining; // Direct ref update!
      }

      // If status is 'in-progress', it means they didn't pause properly -> Interruption
      if (existingAttempt.status === 'in-progress') {
        setWarningCount(prev => {
          const newCount = prev + 1;
          // Sync immediately
          if (existingAttempt.id) {
            onUpdateAttempt(existingAttempt.id, { warningCount: newCount });
          }

          if (newCount > 2) {
            alert("Too many interruptions! The test will be auto-submitted.");
          } else {
            setShowWarningDialog(true);
          }
          return newCount;
        });
      }
    }
  }, [test.id, user.id, existingAttempt, onUpdateAttempt]);

  // Check for max warnings
  useEffect(() => {
    if (warningCount > 2 && isExamStarted && !isSubmitting) {
      handleSubmit();
    }
  }, [warningCount, isExamStarted, isSubmitting]);

  // Save state to local storage ON EVERY ANSWER CHANGE (critical for recovery)
  useEffect(() => {
    // Update refs
    answersRef.current = answers;
    timeLeftRef.current = timeLeft;

    // Save to localStorage immediately - don't wait for attemptId for answers
    if (isExamStarted) {
      const state = {
        answers,
        timeLeft,
        warningCount,
        attemptId: attemptIdRef.current,
        timestamp: Date.now()
      };
      localStorage.setItem(`exam_state_${test.id}_${user.id}`, JSON.stringify(state));
      console.log('Saved to localStorage:', { answeredCount: Object.keys(answers).length });
    }
  }, [answers, timeLeft, warningCount, isExamStarted, test.id, user.id]);

  // Prevent accidental close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isExamStarted && !showTimeUpDialog && !isSubmitting) {
        e.preventDefault();
        e.returnValue = 'You have an exam in progress!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExamStarted, showTimeUpDialog, isSubmitting]);

  // Timer effect
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimeUpDialog(true);
          return 0;
        }
        if (prev === 300) {
          setShowTimeWarning(true);
          setTimeout(() => setShowTimeWarning(false), 5000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, isSubmitting]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isExamStarted || showSubmitDialog || showTimeUpDialog || showInstructions) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Number keys 1-4 for options A-D
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optionMap: Record<string, 'A' | 'B' | 'C' | 'D'> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        handleAnswer(optionMap[e.key]);
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }

      // M for mark for review
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleFlag();
      }

      // C for clear response
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        clearAnswer();
      }

      // ? for keyboard help
      if (e.key === '?') {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isExamStarted, currentQuestionIndex, showSubmitDialog, showTimeUpDialog, showInstructions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: prev[currentQuestion.id] === option ? null : option,
    }));
  };

  const clearAnswer = () => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: null,
    }));
  };

  const handleFlag = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleStartExam = () => {
    setShowInstructions(false);
    setIsExamStarted(true);
    requestFullscreen();
  };

  const handlePause = async () => {
    if (!attemptId) return;

    // Save current state to Firestore
    await onUpdateAttempt(attemptId, {
      answers,
      timeRemaining: timeLeft,
      status: 'paused',
      warningCount
    });

    onCancel(); // Go back
  };

  const handleSubmit = useCallback(async () => {
    const currentAttemptId = attemptIdRef.current;
    if (!currentAttemptId || isSubmitting) {
      console.error('Cannot submit: no attemptId or already submitting');
      if (!currentAttemptId) {
        alert("Critial Error: Exam initialization failed (Missing Attempt ID). Please try refreshing the page or checking your connection.");
      }
      return;
    }

    setIsSubmitting(true);

    // CRITICAL: Read answers from ref (most recent) or localStorage as fallback
    let finalAnswers = answersRef.current;

    // If answers is empty, try to recover from localStorage
    if (Object.keys(finalAnswers).length === 0) {
      console.warn('Answers state empty, attempting localStorage recovery...');
      try {
        const savedState = localStorage.getItem(`exam_state_${test.id}_${user.id}`);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            finalAnswers = parsed.answers;
            console.log('Recovered answers from localStorage:', Object.keys(finalAnswers).length);
          }
        }
      } catch (e) {
        console.error('Failed to recover from localStorage:', e);
      }
    }

    const currentTimeLeft = timeLeftRef.current;
    const timeTaken = test.timeLimitMinutes * 60 - currentTimeLeft;

    // Calculate results locally for immediate display
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let maxScore = 0;

    questions.forEach(question => {
      const marks = test.marksPerQuestion ?? question.marks;
      maxScore += marks;
      const answer = finalAnswers[question.id];

      if (!answer) {
        unattemptedCount++;
      } else if (answer === question.correctOption) {
        score += marks;
        correctCount++;
      } else {
        if (test.negativeMarkingEnabled) {
          score -= test.negativeMarkValue;
        }
        incorrectCount++;
      }
    });

    score = Math.max(0, score);
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    console.log('Submitting with:', { answeredCount: Object.keys(finalAnswers).length, correctCount, incorrectCount });

    const finalAttemptData: Partial<TestAttempt> = {
      answers: finalAnswers,
      timeRemaining: 0,
      warningCount,
      score,
      maxScore,
      percentage,
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeTakenSeconds: timeTaken,
      status: 'completed'
    };

    // Update Firestore
    try {
      await onFinishAttempt(currentAttemptId, finalAttemptData);

      // Clear local storage
      localStorage.removeItem(`exam_state_${test.id}_${user.id}`);

      // Pass complete object back
      onComplete({
        id: currentAttemptId,
        testId: test.id,
        studentId: user.id,
        studentName: user.name,
        startedAt: existingAttempt?.startedAt || new Date(),
        submittedAt: new Date(),
        ...finalAttemptData
      } as TestAttempt);
    } catch (error: any) {
      console.error('Submission failed:', error);
      alert(`Failed to submit exam: ${error.message || 'Unknown error'}. Please check your internet connection and try again.`);
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, test, user, onFinishAttempt, onComplete, existingAttempt, warningCount]);

  const getOptionLabel = (option: 'A' | 'B' | 'C' | 'D') => {
    const labels: Record<'en' | 'or', Record<string, string>> = {
      en: { A: 'A', B: 'B', C: 'C', D: 'D' },
      or: { A: 'କ', B: 'ଖ', C: 'ଗ', D: 'ଘ' },
    };
    return labels[language][option];
  };

  const attemptedCount = Object.values(answers).filter(a => a !== null).length;
  const notVisitedCount = shuffledQuestions.length - attemptedCount - flaggedQuestions.size;
  const progress = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;

  // Timer color classes
  const getTimerClass = () => {
    if (timeLeft < 60) return 'timer-danger';
    if (timeLeft < 300) return 'timer-warning';
    return 'timer-normal';
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="glass-card sticky top-0 z-20 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{test.name}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg transition-all",
                getTimerClass()
              )}>
                <Clock className="w-5 h-5" />
                <span className="font-bold">{formatTime(timeLeft)}</span>
                {timeLeft < 60 && <AlertTriangle className="w-5 h-5 animate-bounce" />}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPauseDialog(true)}
                className="hidden md:flex text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <PauseCircle className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardHelp(prev => !prev)}
                className="hidden md:flex"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Shortcuts
              </Button>
              <Button variant="default" onClick={() => setShowSubmitDialog(true)}>
                Submit
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </div>
      </header>

      {/* Time Warning Toast */}
      {showTimeWarning && (
        <Alert variant="destructive" className="fixed top-20 right-4 w-80 z-50 shadow-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Time Warning!</strong> Only {Math.floor(timeLeft / 60)} minutes remaining
          </AlertDescription>
        </Alert>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <Card className="fixed top-20 right-4 w-80 z-50 shadow-lg glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">1-4</kbd>
                <span>Select option</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">M</kbd>
                <span>Mark review</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">→</kbd>
                <span>Next</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">←</kbd>
                <span>Previous</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">C</kbd>
                <span>Clear answer</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">?</kbd>
                <span>Toggle help</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card className="elevated-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Q{currentQuestionIndex + 1}
                  </Badge>
                  {flaggedQuestions.has(currentQuestionIndex) && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      <Flag className="w-3 h-3 mr-1 fill-amber-600" />
                      Marked for Review
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFlag}
                  className={cn(
                    "transition-colors",
                    flaggedQuestions.has(currentQuestionIndex) && "text-amber-600 hover:text-amber-700"
                  )}
                >
                  <Flag className={cn(
                    "w-4 h-4 mr-2",
                    flaggedQuestions.has(currentQuestionIndex) && "fill-amber-500"
                  )} />
                  {flaggedQuestions.has(currentQuestionIndex) ? 'Marked' : 'Mark for Review'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Text */}
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100 leading-relaxed preserve-whitespace">
                  {language === 'or' && currentQuestion.questionTextOR
                    ? currentQuestion.questionTextOR
                    : currentQuestion.questionTextEN}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => {
                    const optionData = currentQuestion.options[option];
                    const isSelected = answers[currentQuestion.id] === option;

                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className={cn(
                          "w-full p-4 text-left rounded-lg border-2 transition-all touch-target",
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors",
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          )}>
                            {getOptionLabel(option)}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 pt-1 flex-1">
                            {language === 'or' && optionData.or
                              ? optionData.or
                              : optionData.en}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Clear Answer Button */}
                {answers[currentQuestion.id] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAnswer}
                    className="w-full sm:w-auto"
                  >
                    Clear Response
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="touch-target"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === shuffledQuestions.length - 1}
                className="touch-target"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 elevated-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Marked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <span>Not Visited</span>
                  </div>
                </div>

                {/* Question Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {shuffledQuestions.map((q, index) => {
                    const isAttempted = answers[q.id] !== null && answers[q.id] !== undefined;
                    const isCurrent = index === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(index);

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={cn(
                          "relative w-full aspect-square rounded text-sm font-medium transition-all touch-target",
                          isCurrent && "question-current ring-2 ring-primary ring-offset-2",
                          !isCurrent && isFlagged && "question-marked",
                          !isCurrent && !isFlagged && isAttempted && "question-answered",
                          !isCurrent && !isFlagged && !isAttempted && "question-not-visited"
                        )}
                      >
                        {index + 1}
                        {isFlagged && !isCurrent && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-amber-600 fill-amber-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="font-semibold text-green-600">{attemptedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marked:</span>
                    <span className="font-semibold text-amber-600">{flaggedQuestions.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Not Visited:</span>
                    <span className="font-semibold">{notVisitedCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Instructions Dialog */}
      <AlertDialog open={showInstructions}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Exam Instructions</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Test Details
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                  <li><strong>Total Questions:</strong> {shuffledQuestions.length}</li>
                  <li><strong>Duration:</strong> {test.timeLimitMinutes} minutes</li>
                  <li><strong>Marking:</strong> +{test.marksPerQuestion || 1} for correct, {test.negativeMarkingEnabled ? `-${test.negativeMarkValue}` : '0'} for incorrect</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Important Guidelines</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li>Do not refresh the page during the exam</li>
                  <li>Your progress is auto-saved every 30 seconds</li>
                  <li>Use "Mark for Review" if you are unsure about an answer</li>
                  <li>Use keyboard shortcuts for faster navigation (press ? during exam)</li>
                  <li>The test will auto-submit when time is up</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleStartExam} className="w-full sm:w-auto gradient-primary text-white">
              I'm Ready to Begin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Attempted:</span>
                  <span className="font-semibold text-green-600">{attemptedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Marked for Review:</span>
                  <span className="font-semibold text-amber-600">{flaggedQuestions.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Not Attempted:</span>
                  <span className="font-semibold text-red-600">{shuffledQuestions.length - attemptedCount}</span>
                </div>
              </div>

              {flaggedQuestions.size > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>{flaggedQuestions.size}</strong> questions marked for review will be submitted with your selected answers.
                  </AlertDescription>
                </Alert>
              )}

              {shuffledQuestions.length - attemptedCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{shuffledQuestions.length - attemptedCount}</strong> questions are still unattempted.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                Once submitted, you <strong>cannot make any changes</strong>. Are you sure?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="gradient-primary text-white">
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              Pause Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved. You can resume the test later from your dashboard.
              <br /><br />
              <strong>Note:</strong> The timer will stop, but you must resume to complete the test.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePause} className="bg-amber-600 hover:bg-amber-700 text-white">
              Pause & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Dialog (Immediate Interruption) */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Test Interrupted ({warningCount}/2)
            </AlertDialogTitle>
            <AlertDialogDescription>
              You refreshed the page or switched windows. This is recorded as a warning.
              <br /><br />
              <strong>After 2 warnings, your test will be auto-submitted.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => setShowWarningDialog(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
