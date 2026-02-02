// Academic Performance Platform - Type Definitions

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role: UserRole;
  class?: number; // 9, 10, 11, 12
  board?: string; // CBSE, ICSE, etc.
  batch?: string; // e.g., "Morning Batch", "Batch A"
  isLeaderboardVisible?: boolean; // Privacy control for leaderboard
  createdAt: Date;
}

export type ClassLevel = 9 | 10 | 11 | 12;

export interface Subject {
  id: string;
  name: string;
  classLevel: ClassLevel;
}

export interface Chapter {
  id: string;
  name: string;
  subjectId: string;
  classLevel: ClassLevel;
}

export interface Topic {
  id: string;
  name: string;
  chapterId: string;
}

export interface Question {
  id: string;
  classLevel: ClassLevel;
  subjectId: string;
  chapterId: string;
  topicId: string;
  questionTextEN: string;
  questionTextOR?: string;
  options: {
    A: { en: string; or?: string };
    B: { en: string; or?: string };
    C: { en: string; or?: string };
    D: { en: string; or?: string };
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  marks: number;
}

export type TestType = 'chapter-wise' | 'subject-wise';

export interface Test {
  id: string;
  name: string;
  type: TestType;
  classLevel: ClassLevel;
  board: string; // CBSE, Odisha
  subjectIds: string[];
  chapterIds: string[];
  topicIds: string[];
  questionIds: string[];
  totalQuestions: number;
  timeLimitMinutes: number;
  marksPerQuestion?: number; // Optional override for question marks
  negativeMarkingEnabled: boolean;
  negativeMarkValue: number;
  passingPercentage: number;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  examDate?: string | null; // Date of the exam (YYYY-MM-DD format)
  examTime?: string | null; // Time of the exam (HH:MM format)
  createdAt: Date;
  createdBy: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  studentName?: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>; // questionId -> answer
  status: 'in-progress' | 'paused' | 'completed';
  startedAt: Date;
  lastUpdated?: Date;
  submittedAt?: Date; // Undefined while in-progress
  timeRemaining?: number; // Seconds remaining when paused/saved
  warningCount?: number; // Number of tab switches/refresh warnings

  // Results (calculated only when status === 'completed')
  score?: number;
  maxScore?: number;
  percentage?: number;
  correctCount?: number;
  incorrectCount?: number;
  unattemptedCount?: number;
  timeTakenSeconds?: number;

  proctoring?: {
    tabSwitches: number;
    fullScreenExits: number;
    copiedContent: boolean;
    focusLostCount: number;
  };
}

export interface Analytics {
  topicWise: Record<string, { correct: number; total: number; accuracy: number }>;
  chapterWise: Record<string, { correct: number; total: number; accuracy: number }>;
  subjectWise: Record<string, { correct: number; total: number; accuracy: number }>;
}

export interface StudentProgress {
  subjectId: string;
  testsTaken: number;
  averageScore: number;
  bestScore: number;
  weakestChapters: string[];
  recentTests: TestAttempt[];
}

export type Language = 'en' | 'or';

export interface AppState {
  currentUser: User | null;
  language: Language;
  isAuthenticated: boolean;
}
