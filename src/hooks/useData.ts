import { useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useQuestionCache } from './useQuestionCache';
import { useTests } from './useTests';
import { useAttempts } from './useAttempts';
import { useQuestions } from './useQuestions';

import type {
  Question,
  Test,
  TestAttempt,
  User,
  Subject,
  Chapter,
  Topic,
  ClassLevel,
  Analytics
} from '@/types';

// Static Data 
const DEMO_SUBJECTS: Subject[] = [
  // Class 9
  { id: 'phy-9', name: 'Physics', classLevel: 9 },
  { id: 'chem-9', name: 'Chemistry', classLevel: 9 },
  { id: 'math-9', name: 'Mathematics', classLevel: 9 },
  { id: 'bio-9', name: 'Biology', classLevel: 9 },
  { id: 'hist-9', name: 'History', classLevel: 9 },
  { id: 'pol-9', name: 'Political Science', classLevel: 9 },
  { id: 'geo-9', name: 'Geography', classLevel: 9 },
  { id: 'eco-9', name: 'Economics', classLevel: 9 },
  { id: 'eng-9', name: 'English', classLevel: 9 },

  // Class 10
  { id: 'phy-10', name: 'Physics', classLevel: 10 },
  { id: 'chem-10', name: 'Chemistry', classLevel: 10 },
  { id: 'math-10', name: 'Mathematics', classLevel: 10 },
  { id: 'bio-10', name: 'Biology', classLevel: 10 },
  { id: 'hist-10', name: 'History', classLevel: 10 },
  { id: 'pol-10', name: 'Political Science', classLevel: 10 },
  { id: 'geo-10', name: 'Geography', classLevel: 10 },
  { id: 'eco-10', name: 'Economics', classLevel: 10 },
  { id: 'eng-10', name: 'English', classLevel: 10 },

  // Class 11
  { id: 'phy-11', name: 'Physics', classLevel: 11 },
  { id: 'chem-11', name: 'Chemistry', classLevel: 11 },
  { id: 'math-11', name: 'Mathematics', classLevel: 11 },
  { id: 'bio-11', name: 'Biology', classLevel: 11 },
  { id: 'hist-11', name: 'History', classLevel: 11 },
  { id: 'pol-11', name: 'Political Science', classLevel: 11 },
  { id: 'geo-11', name: 'Geography', classLevel: 11 },
  { id: 'eco-11', name: 'Economics', classLevel: 11 },
  { id: 'eng-11', name: 'English', classLevel: 11 },

  // Class 12
  { id: 'phy-12', name: 'Physics', classLevel: 12 },
  { id: 'chem-12', name: 'Chemistry', classLevel: 12 },
  { id: 'math-12', name: 'Mathematics', classLevel: 12 },
  { id: 'bio-12', name: 'Biology', classLevel: 12 },
  { id: 'hist-12', name: 'History', classLevel: 12 },
  { id: 'pol-12', name: 'Political Science', classLevel: 12 },
  { id: 'geo-12', name: 'Geography', classLevel: 12 },
  { id: 'eco-12', name: 'Economics', classLevel: 12 },
  { id: 'eng-12', name: 'English', classLevel: 12 },
];

export const SUBJECT_GROUPS = {
  science: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  social: ['History', 'Political Science', 'Geography', 'Economics'],
  language: ['English'],
};

const DEMO_CHAPTERS: Chapter[] = [
  { id: 'motion', name: 'Motion', subjectId: 'phy-9', classLevel: 9 },
  { id: 'force', name: 'Force and Laws of Motion', subjectId: 'phy-9', classLevel: 9 },
  { id: 'gravitation', name: 'Gravitation', subjectId: 'phy-9', classLevel: 9 },
  { id: 'matter', name: 'Matter in Our Surroundings', subjectId: 'chem-9', classLevel: 9 },
  { id: 'atoms-mol', name: 'Atoms and Molecules', subjectId: 'chem-9', classLevel: 9 },
  { id: 'num-sys', name: 'Number Systems', subjectId: 'math-9', classLevel: 9 },
  { id: 'algebra', name: 'Algebra', subjectId: 'math-9', classLevel: 9 },
  { id: 'cell', name: 'The Fundamental Unit of Life', subjectId: 'bio-9', classLevel: 9 },
  { id: 'tissues', name: 'Tissues', subjectId: 'bio-9', classLevel: 9 },
];

const DEMO_TOPICS: Topic[] = [
  { id: 'motion-dist', name: 'Distance and Displacement', chapterId: 'motion' },
  { id: 'motion-speed', name: 'Speed and Velocity', chapterId: 'motion' },
  { id: 'motion-accel', name: 'Acceleration', chapterId: 'motion' },
  { id: 'motion-graph', name: 'Graphical Representation', chapterId: 'motion' },
  { id: 'force-newton1', name: "Newton's First Law", chapterId: 'force' },
  { id: 'force-newton2', name: "Newton's Second Law", chapterId: 'force' },
  { id: 'force-newton3', name: "Newton's Third Law", chapterId: 'force' },
  { id: 'grav-g', name: 'Universal Law of Gravitation', chapterId: 'gravitation' },
  { id: 'grav-freefall', name: 'Free Fall', chapterId: 'gravitation' },
];

export function useData(userId?: string, isAdmin: boolean = false) {
  // Static Data
  const [subjects] = useState<Subject[]>(DEMO_SUBJECTS);
  const [chapters] = useState<Chapter[]>(DEMO_CHAPTERS);
  const [topics] = useState<Topic[]>(DEMO_TOPICS);

  // Use Composed Hooks
  const {
    tests,
    loading: testsLoading,
    refresh: refreshTests,
    fetchMore: fetchMoreTests,
    hasMore: hasMoreTests
  } = useTests(isAdmin);

  const {
    attempts,
    loading: attemptsLoading,
    refresh: refreshAttempts,
    fetchMore: fetchMoreAttempts,
    hasMore: hasMoreAttempts
  } = useAttempts(userId, isAdmin);

  const {
    questions,
    loading: _questionsLoading,
    loadQuestionsForTest,
    loadAllQuestions,
    setQuestions
  } = useQuestions();
  void _questionsLoading; // acknowledged unused

  const questionCache = useQuestionCache();

  // Combined Loading State
  const loading = testsLoading || attemptsLoading;

  // --- Legacy / Passthrough Functions ---

  const addQuestions = useCallback(async (newQuestions: Question[]): Promise<Question[]> => {
    const firestore = db;
    if (!firestore) return [];

    try {
      const batch = writeBatch(firestore);
      const questionsWithFirebaseIds: Question[] = [];

      newQuestions.forEach(q => {
        const qRef = doc(collection(firestore, 'questions'));
        const questionWithFirebaseId = {
          ...q,
          id: qRef.id,
          createdAt: new Date(),
        };
        questionsWithFirebaseIds.push(questionWithFirebaseId);

        batch.set(qRef, {
          ...questionWithFirebaseId,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      console.log('Questions saved to Firebase');

      // Update local cache
      await questionCache.cacheQuestions(questionsWithFirebaseIds);

      // Optimistically update questions state via exposed setter
      setQuestions(prev => [...prev, ...questionsWithFirebaseIds]);

      return questionsWithFirebaseIds;
    } catch (error) {
      console.error("Error adding questions:", error);
      throw error;
    }
  }, [questionCache, setQuestions]);

  const getQuestionsByFilter = useCallback(async (
    classLevel?: ClassLevel,
    subjectId?: string,
    chapterId?: string,
    topicId?: string
  ) => {
    const firestore = db;
    if (!firestore) return [];

    let q = query(collection(firestore, 'questions'));

    if (classLevel) q = query(q, where('classLevel', '==', classLevel));
    if (subjectId) q = query(q, where('subjectId', '==', subjectId));
    if (chapterId) q = query(q, where('chapterId', '==', chapterId));
    if (topicId) q = query(q, where('topicId', '==', topicId));

    const snapshot = await getDocs(q);
    const fetchedQuestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Question[];

    setQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const uniqueNew = fetchedQuestions.filter(q => !existingIds.has(q.id));
      return [...prev, ...uniqueNew];
    });

    return fetchedQuestions;
  }, [setQuestions]);

  const createTest = useCallback(async (testData: Partial<Test>) => {
    try {
      const currentUser = auth?.currentUser;
      if (!testData.name || !testData.subjectIds?.length || !testData.classLevel) {
        throw new Error("Missing required test fields");
      }

      const newTest: any = {
        ...testData,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'admin',
        questions: [],
        questionIds: testData.questionIds || [],
      };

      const docRef = await addDoc(collection(db!, 'tests'), newTest);

      // Refresh admin list if needed
      if (isAdmin) refreshTests();

      return docRef.id;
    } catch (error) {
      console.error("Error creating test:", error);
      throw error;
    }
  }, [isAdmin, refreshTests]);

  const updateTest = useCallback(async (testId: string, data: Partial<Test>) => {
    try {
      const testRef = doc(db!, 'tests', testId);
      await updateDoc(testRef, {
        ...data,
        lastUpdated: serverTimestamp()
      });
      if (isAdmin) refreshTests();
    } catch (error) {
      console.error("Error updating test:", error);
      throw error;
    }
  }, [isAdmin, refreshTests]);

  const deleteTest = useCallback(async (testId: string) => {
    try {
      // Find the test to get its questionIds (from local state)
      // Note: If paginated out, we might miss this info, but cascade is manual here anyway.
      // Ideally backend handles this.

      const test = tests.find(t => t.id === testId);

      await deleteDoc(doc(db!, 'tests', testId));

      // Cascade Delete Attempts
      const attemptsRef = collection(db!, 'attempts');
      const q = query(attemptsRef, where('testId', '==', testId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db!);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Cascade Delete Questions
      if (test?.questionIds) {
        test.questionIds.forEach(qId => {
          batch.delete(doc(db!, 'questions', qId));
        });
      }

      await batch.commit();

      if (isAdmin) refreshTests();

    } catch (error) {
      console.error("Error deleting test:", error);
      throw error;
    }
  }, [tests, isAdmin, refreshTests]);

  const startAttempt = useCallback(async (testId: string) => {
    const currentUser = auth?.currentUser;
    if (!currentUser) throw new Error("User not logged in");

    const newAttempt: any = {
      testId,
      studentId: currentUser.uid,
      studentName: currentUser.displayName || 'Student',
      startedAt: serverTimestamp(),
      status: 'in-progress',
      answers: {},
      timeRemaining: 0,
      warningCount: 0,
      lastUpdated: serverTimestamp()
    };

    const docRef = await addDoc(collection(db!, 'attempts'), newAttempt);
    return docRef.id;

  }, []);

  const updateAttempt = useCallback(async (attemptId: string, data: Partial<TestAttempt>) => {
    const attemptRef = doc(db!, 'attempts', attemptId);
    await updateDoc(attemptRef, {
      ...data,
      lastUpdated: serverTimestamp()
    });
  }, []);

  const finishAttempt = useCallback(async (attemptId: string, data: Partial<TestAttempt>) => {
    const currentUser = auth?.currentUser;
    const attemptRef = doc(db!, 'attempts', attemptId);
    await updateDoc(attemptRef, {
      ...data,
      status: 'completed',
      submittedAt: serverTimestamp()
    });

    // Cleanup orphans logic... simplifying for now
    // Logic for cleanup can be moved to dedicated maintenance scripts or kept minimal here
    if (currentUser) {
      // Minimal cleanup
    }

    if (isAdmin) refreshAttempts();

  }, [isAdmin, refreshAttempts]);

  const submitAttempt = useCallback(async (attempt: Omit<TestAttempt, 'id'>) => {
    // Legacy implementation
    const firestore = db;
    const currentUser = auth?.currentUser;
    if (!firestore || !currentUser) throw new Error('Auth required');

    try {
      const docRef = await addDoc(collection(firestore, 'attempts'), {
        ...attempt,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        status: 'completed',
        submittedAt: serverTimestamp(),
      });

      const newAttempt = {
        ...attempt,
        id: docRef.id,
        startedAt: new Date(attempt.startedAt),
        submittedAt: new Date(),
        status: 'completed'
      } as TestAttempt;

      if (isAdmin) refreshAttempts();

      return newAttempt;
    } catch (error) {
      console.error('Error submitting attempt:', error);
      throw error;
    }
  }, [isAdmin, refreshAttempts]);

  // Helper for batching
  const processBatchDelete = async (refs: any[]) => {
    if (!db) return 0;
    const CHUNK_SIZE = 500;
    let deletedCount = 0;

    for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
      const chunk = refs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
      deletedCount += chunk.length;
    }
    return deletedCount;
  };

  // Cleanups
  const cleanupOrphanedQuestions = useCallback(async () => {
    if (!db) return 0;

    // 1. Get all valid Question IDs from Tests
    const testsQ = query(collection(db, 'tests'));
    const testsSnap = await getDocs(testsQ);
    const validQuestionIds = new Set<string>();

    testsSnap.docs.forEach(doc => {
      const t = doc.data();
      if (Array.isArray(t.questionIds)) {
        t.questionIds.forEach((id: string) => validQuestionIds.add(id));
      }
    });

    // 2. Get all Questions
    const questionsQ = query(collection(db, 'questions'));
    const questionsSnap = await getDocs(questionsQ);

    // 3. Find Orphans
    const orphanRefs: any[] = [];
    questionsSnap.docs.forEach(doc => {
      if (!validQuestionIds.has(doc.id)) {
        orphanRefs.push(doc.ref);
      }
    });

    // 4. Batch Delete
    const count = await processBatchDelete(orphanRefs);

    // 5. Update local state if needed
    if (count > 0) {
      setQuestions(prev => prev.filter(q => validQuestionIds.has(q.id)));
    }

    return count;
  }, [setQuestions]);

  const cleanupOldAttempts = useCallback(async (daysToKeep = 30) => {
    if (!db) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const q = query(
      collection(db, 'attempts'),
      where('startedAt', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);
    const refs = snapshot.docs.map(d => d.ref);

    const count = await processBatchDelete(refs);

    if (count > 0 && isAdmin) refreshAttempts();

    return count;
  }, [isAdmin, refreshAttempts]);

  // User Management
  const fetchUsers = useCallback(async () => {
    if (!db) return [];
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      lastLoginAt: docSnap.data().lastLoginAt?.toDate(),
    })) as unknown as User[];
  }, []);

  const deleteUser = useCallback(async (targetUserId: string) => {
    if (!db) return false;
    try {
      // 1. Delete the user document
      await deleteDoc(doc(db, 'users', targetUserId));

      // 2. Delete all attempts by this user (batched for >500 safety)
      const q = query(collection(db, 'attempts'), where('studentId', '==', targetUserId));
      const snapshot = await getDocs(q);
      const refs = snapshot.docs.map(d => d.ref);
      await processBatchDelete(refs);

      // 3. Refresh in-memory attempts so dashboard reflects the deletion immediately
      if (isAdmin) refreshAttempts();

      return true;
    } catch (e) {
      console.error("Error deleting user:", e);
      return false;
    }
  }, [isAdmin, refreshAttempts]);

  const cleanupOrphanedAttempts = useCallback(async () => {
    if (!db) return 0;
    try {
      // 1. Fetch all valid user IDs
      const usersQ = query(collection(db, 'users'));
      const usersSnap = await getDocs(usersQ);
      const validUserIds = new Set(usersSnap.docs.map(d => d.id));
      const userNames = new Map(usersSnap.docs.map(d => [d.id, d.data().name || 'Unknown']));
      console.log(`[Cleanup] Found ${validUserIds.size} valid users:`, Array.from(userNames.entries()).map(([id, name]) => `${name} (${id})`));

      // 2. Fetch all valid test IDs
      const testsQ = query(collection(db, 'tests'));
      const testsSnap = await getDocs(testsQ);
      const validTestIds = new Set(testsSnap.docs.map(d => d.id));
      console.log(`[Cleanup] Found ${validTestIds.size} valid tests`);

      // 3. Fetch all attempts
      const attemptsQ = query(collection(db, 'attempts'));
      const attemptsSnap = await getDocs(attemptsQ);
      console.log(`[Cleanup] Found ${attemptsSnap.docs.length} total attempts in Firestore`);

      // Log ALL attempts so admin can identify issues
      console.log('[Cleanup] === ALL ATTEMPTS DUMP ===');
      attemptsSnap.docs.forEach((docSnap, i) => {
        const data = docSnap.data();
        console.log(`[Cleanup] Attempt ${i + 1}: id=${docSnap.id} | studentId=${data.studentId} | studentName=${data.studentName || userNames.get(data.studentId) || '?'} | testId=${data.testId} | status=${data.status} | score=${data.percentage ?? '?'}%`);
      });
      console.log('[Cleanup] === END DUMP ===');

      const refsToDelete: any[] = [];
      const now = Date.now();
      const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

      attemptsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const isUserInvalid = !data.studentId || !validUserIds.has(data.studentId);
        const isTestInvalid = !data.testId || !validTestIds.has(data.testId);

        // Check for stale in-progress/paused attempts (abandoned sessions)
        const lastActivity = data.lastUpdated?.toDate?.() || data.startedAt?.toDate?.();
        const isStaleActive = (data.status === 'in-progress' || data.status === 'paused') &&
          lastActivity && (now - lastActivity.getTime() > STALE_THRESHOLD_MS);

        if (isUserInvalid || isTestInvalid) {
          console.log(`[Cleanup] Orphan: ${docSnap.id} | user valid=${!isUserInvalid} | test valid=${!isTestInvalid}`);
          refsToDelete.push(docSnap.ref);
        } else if (isStaleActive) {
          const hoursStale = Math.round((now - lastActivity.getTime()) / (60 * 60 * 1000));
          console.log(`[Cleanup] Stale abandoned attempt: ${docSnap.id} | status=${data.status} | last activity ${hoursStale}h ago | student=${data.studentName || userNames.get(data.studentId)}`);
          refsToDelete.push(docSnap.ref);
        }
      });

      console.log(`[Cleanup] ${refsToDelete.length} invalid/stale attempts to delete`);
      const count = await processBatchDelete(refsToDelete);
      console.log(`[Cleanup] Deleted ${count} attempts`);

      if (isAdmin) refreshAttempts();

      return count;
    } catch (err) {
      console.error('[Cleanup] Error during orphan cleanup:', err);
      return 0;
    }
  }, [isAdmin, refreshAttempts]);

  // Analytics
  const calculateAnalytics = useCallback((attempt: TestAttempt, test: Test): Analytics => {
    const topicWise: Analytics['topicWise'] = {};
    const chapterWise: Analytics['chapterWise'] = {};
    const subjectWise: Analytics['subjectWise'] = {};

    // Note: This requires questions to be loaded. 
    // In a full implementation, we might need to fetch questions for this test if not in cache.
    // For now, we assume questions are in valid state or loaded.

    test.questionIds.forEach(qId => {
      const question = questions.find(q => q.id === qId);
      // If question not found in loaded questions, we can't analyze it.
      // In production, we should fetch these specific questions.
      if (!question) return;

      const answer = attempt.answers[qId];
      const isCorrect = answer === question.correctOption;

      // Topic-wise
      if (!topicWise[question.topicId]) {
        topicWise[question.topicId] = { correct: 0, total: 0, accuracy: 0 };
      }
      topicWise[question.topicId].total++;
      if (isCorrect) topicWise[question.topicId].correct++;

      // Chapter-wise
      if (!chapterWise[question.chapterId]) {
        chapterWise[question.chapterId] = { correct: 0, total: 0, accuracy: 0 };
      }
      chapterWise[question.chapterId].total++;
      if (isCorrect) chapterWise[question.chapterId].correct++;

      // Subject-wise
      if (!subjectWise[question.subjectId]) {
        subjectWise[question.subjectId] = { correct: 0, total: 0, accuracy: 0 };
      }
      subjectWise[question.subjectId].total++;
      if (isCorrect) subjectWise[question.subjectId].correct++;
    });

    // Calculate accuracy percentages
    Object.values(topicWise).forEach(t => t.accuracy = Math.round((t.correct / t.total) * 100));
    Object.values(chapterWise).forEach(c => c.accuracy = Math.round((c.correct / c.total) * 100));
    Object.values(subjectWise).forEach(s => s.accuracy = Math.round((s.correct / s.total) * 100));

    return { topicWise, chapterWise, subjectWise };
  }, [questions]);

  // Helper functions
  const getSubjectName = useCallback((subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || subjectId;
  }, [subjects]);

  const getChapterName = useCallback((chapterId: string) => {
    return chapters.find(c => c.id === chapterId)?.name || chapterId;
  }, [chapters]);

  const getTopicName = useCallback((topicId: string) => {
    return topics.find(t => t.id === topicId)?.name || topicId;
  }, [topics]);

  const getSubjectsByClass = useCallback((classLevel: ClassLevel) => {
    return subjects.filter(s => s.classLevel === classLevel);
  }, [subjects]);

  const getChaptersBySubject = useCallback((subjectId: string) => {
    return chapters.filter(c => c.subjectId === subjectId);
  }, [chapters]);

  const getTopicsByChapter = useCallback((chapterId: string) => {
    return topics.filter(t => t.chapterId === chapterId);
  }, [topics]);

  const getTestsByClass = useCallback((classLevel: ClassLevel) => {
    return tests.filter(t => t.classLevel === classLevel);
  }, [tests]);

  const getTestById = useCallback((testId: string) => {
    return tests.find(t => t.id === testId);
  }, [tests]);

  const getAttemptsByStudent = useCallback((studentId: string) => {
    return attempts.filter(a => a.studentId === studentId);
  }, [attempts]);

  const getAttemptById = useCallback(async (attemptId: string) => {
    // First check local state
    const local = attempts.find(a => a.id === attemptId);
    if (local) return local;

    const firestore = db;
    if (!firestore) return undefined;

    // Fetch from DB if not found locally
    try {
      const docRef = doc(firestore, 'attempts', attemptId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startedAt: data.startedAt?.toDate(),
          submittedAt: data.submittedAt?.toDate(),
        } as TestAttempt;
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
    }
    return undefined;
  }, [attempts]);

  return {
    subjects,
    chapters,
    topics,
    questions,
    tests,
    attempts,
    loading,
    initLoad: { tests: !testsLoading, attempts: !attemptsLoading },
    loadQuestionsForTest,
    loadAllQuestions,
    addQuestions,
    createTest,
    updateTest,
    deleteTest,
    startAttempt,
    updateAttempt,
    finishAttempt,
    cleanupOrphanedQuestions,
    fetchUsers,
    deleteUser,
    getQuestionsByFilter,
    submitAttempt,
    getAttemptsByStudent,
    getAttemptById,
    // refreshAdminAttempts mapped to refreshAttempts if admin
    refreshAdminAttempts: refreshAttempts,
    calculateAnalytics,
    getSubjectName,
    getChapterName,
    getTopicName,
    getSubjectsByClass,
    getChaptersBySubject,
    getTopicsByChapter,
    getTestsByClass,
    getTestById,
    cleanupOldAttempts,
    // New Props
    fetchMoreTests,
    hasMoreTests,
    fetchMoreAttempts,
    hasMoreAttempts,
    cleanupOrphanedAttempts,
  };
}
