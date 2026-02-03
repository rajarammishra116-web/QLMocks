import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  writeBatch,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useQuestionCache } from './useQuestionCache';
import type {
  Question,
  Test,
  TestAttempt,
  Subject,
  Chapter,
  Topic,
  ClassLevel,
  Analytics
} from '@/types';

// Static Data (keeping these local for now to save DB reads, but could be moved to DB)
// Subject groups for filtering: Science (Physics, Chemistry, Biology, Math), Social Studies (History, Pol Sci, Geo, Eco)
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

// Subject group definitions for filtering
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
  const [subjects] = useState<Subject[]>(DEMO_SUBJECTS);
  const [chapters] = useState<Chapter[]>(DEMO_CHAPTERS);
  const [topics] = useState<Topic[]>(DEMO_TOPICS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [initLoad, setInitLoad] = useState({ tests: false, attempts: false });

  const questionCache = useQuestionCache();

  // Unified loading state
  useEffect(() => {
    if (initLoad.tests && initLoad.attempts) {
      setLoading(false);
    }
  }, [initLoad]);

  // Load initial data
  useEffect(() => {
    const firestore = db;
    if (!firestore) return;

    // Real-time listener for tests
    const testsQuery = query(collection(firestore, 'tests'), orderBy('createdAt', 'desc'));
    const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
      const loadedTests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Test[];
      setTests(loadedTests);
      setInitLoad(prev => ({ ...prev, tests: true }));
      console.log('Loaded', loadedTests.length, 'tests from Firebase');
    });

    return () => {
      unsubscribeTests();
    };
  }, []);

  // Fetch attempts - for admin load ALL, for students load only their own
  useEffect(() => {
    const firestore = db;

    // Logic: If admin, we don't need userId. If not admin, we NEED userId.
    if (!firestore) return;
    if (!isAdmin && !userId) {
      // If student but no userId yet, don't fetch attempts yet
      return;
    }

    // Admin sees ALL attempts, students see only their own
    const attemptsQuery = isAdmin
      ? query(collection(firestore, 'attempts'))
      : query(
        collection(firestore, 'attempts'),
        where('studentId', '==', userId)
      );

    const unsubscribeAttempts = onSnapshot(attemptsQuery, (snapshot) => {
      const loadedAttempts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate() || new Date(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
      })) as TestAttempt[];
      setAttempts(loadedAttempts);
      setInitLoad(prev => ({ ...prev, attempts: true }));
      console.log('Loaded', loadedAttempts.length, 'attempts for', isAdmin ? 'admin' : 'student');
    }, (error) => {
      console.error("Error fetching attempts (likely missing index):", error);
      // Even on error, we mark as loaded so app doesn't hang
      setInitLoad(prev => ({ ...prev, attempts: true }));
    });

    return () => unsubscribeAttempts();
  }, [userId, isAdmin]);

  // Handle case where no user is logged in - we shouldn't wait for attempts
  useEffect(() => {
    if (!auth?.currentUser) {
      setInitLoad(prev => ({ ...prev, attempts: true }));
    }
  }, [auth?.currentUser]);

  // Lazy load questions for a specific test
  const loadQuestionsForTest = useCallback(async (test: Test) => {
    if (!db) return;
    if (!test.questionIds || test.questionIds.length === 0) return;

    console.log(`Lazy loading ${test.questionIds.length} questions for test ${test.id}...`);

    try {
      // 1. Check which questions are already loaded
      const loadedIds = new Set(questions.map(q => q.id));
      const missingIds = test.questionIds.filter(id => !loadedIds.has(id));

      if (missingIds.length === 0) {
        console.log('All questions already loaded.');
        return;
      }

      // 2. Fetch missing questions
      const newQuestions: Question[] = [];
      const fetchPromises = missingIds.map(id => getDoc(doc(db!, 'questions', id)));
      const snapshots = await Promise.all(fetchPromises);

      snapshots.forEach(snap => {
        if (snap.exists()) {
          newQuestions.push({
            id: snap.id,
            ...snap.data(),
            createdAt: snap.data().createdAt?.toDate() || new Date(),
          } as unknown as Question);
        }
      });

      console.log(`Fetched ${newQuestions.length} new questions.`);

      if (newQuestions.length > 0) {
        setQuestions(prev => [...prev, ...newQuestions]);
      }

    } catch (error) {
      console.error("Error lazy loading questions:", error);
    }
  }, [questions]);

  // Manual load all questions (for Admin)
  const loadAllQuestions = useCallback(async () => {
    if (!db) return;
    console.log("Admin: Loading ALL questions...");

    try {
      const qQuery = query(collection(db, 'questions'));
      const snapshot = await getDocs(qQuery);
      const allQuestions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as unknown as Question[];

      setQuestions(allQuestions);
      console.log(`Admin loaded ${allQuestions.length} questions.`);
    } catch (e) {
      console.error("Error loading all questions:", e);
    }
  }, []);

  // Question operations with caching
  const addQuestions = useCallback(async (newQuestions: Question[]): Promise<Question[]> => {
    const firestore = db;
    if (!firestore) return [];

    try {
      const batch = writeBatch(firestore);

      // Create a map to track Firebase IDs for each question
      const questionsWithFirebaseIds: Question[] = [];

      newQuestions.forEach(q => {
        const qRef = doc(collection(firestore, 'questions'));
        const questionWithFirebaseId = {
          ...q,
          id: qRef.id, // Use Firebase-generated ID
          createdAt: new Date(),
        };
        questionsWithFirebaseIds.push(questionWithFirebaseId);

        batch.set(qRef, {
          ...questionWithFirebaseId,
          createdAt: serverTimestamp(), // Use serverTimestamp for Firestore
        });
      });

      await batch.commit();
      console.log('Questions saved to Firebase with IDs:', questionsWithFirebaseIds.map(q => q.id));

      // Update local cache with the correct Firebase IDs
      await questionCache.cacheQuestions(questionsWithFirebaseIds);

      // Note: calculate state update happens via listener now, but we return the valid IDs immediately
      // knowing the listener will also catch up.

      return questionsWithFirebaseIds;
    } catch (error) {
      console.error('Error adding questions:', error);
      throw error;
    }
  }, [questionCache]);

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
  }, []);

  // Test operations
  const createTest = useCallback(async (test: Omit<Test, 'id' | 'createdAt'>) => {
    const firestore = db;
    const currentUser = auth?.currentUser;

    if (!firestore || !currentUser) throw new Error('Auth required');

    try {
      const docRef = await addDoc(collection(firestore, 'tests'), {
        ...test,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      const newTest = { ...test, id: docRef.id, createdAt: new Date() } as Test;
      return newTest;
    } catch (error) {
      console.error('Error creating test:', error);
      throw error;
    }
  }, []);

  const getTestsByClass = useCallback((classLevel: ClassLevel) => {
    return tests.filter(t => t.classLevel === classLevel);
  }, [tests]);

  const getTestById = useCallback((testId: string) => {
    return tests.find(t => t.id === testId);
  }, [tests]);

  const deleteTest = useCallback(async (testId: string) => {
    if (!db) return;

    try {
      // Find the test to get its questionIds
      const test = tests.find(t => t.id === testId);

      // Use batch for efficient cascade delete
      const batch = writeBatch(db);

      // 1. Delete all questions belonging to this test
      if (test?.questionIds && test.questionIds.length > 0) {
        for (const qId of test.questionIds) {
          batch.delete(doc(db, 'questions', qId));
        }
        console.log(`Queued ${test.questionIds.length} questions for deletion`);
      }

      // 2. Delete all attempts for this test
      const attemptsToDelete = attempts.filter(a => a.testId === testId);
      for (const attempt of attemptsToDelete) {
        batch.delete(doc(db, 'attempts', attempt.id));
      }
      console.log(`Queued ${attemptsToDelete.length} attempts for deletion`);

      // 3. Delete the test itself
      batch.delete(doc(db, 'tests', testId));

      // 4. Commit all deletions atomically
      await batch.commit();

      // Optimistic local state update (real-time listeners will also update)
      setTests(prev => prev.filter(t => t.id !== testId));
      setQuestions(prev => prev.filter(q => !test?.questionIds?.includes(q.id)));
      setAttempts(prev => prev.filter(a => a.testId !== testId));

      console.log(`Test ${testId} and all related data permanently deleted`);
    } catch (error) {
      console.error('Error deleting test with cascade:', error);
    }
  }, [tests, attempts]);

  // Cleanup orphaned questions (questions not belonging to any test)
  const cleanupOrphanedQuestions = useCallback(async () => {
    if (!db) return 0;

    try {
      // Get all question IDs that belong to existing tests
      const activeQuestionIds = new Set<string>();
      tests.forEach(test => {
        test.questionIds?.forEach(qId => activeQuestionIds.add(qId));
      });

      // Find orphaned questions
      const orphanedQuestions = questions.filter(q => !activeQuestionIds.has(q.id));

      if (orphanedQuestions.length === 0) {
        console.log('No orphaned questions found');
        return 0;
      }

      // Delete orphaned questions in batches (Firestore batch limit is 500)
      const batch = writeBatch(db);
      orphanedQuestions.forEach(q => {
        batch.delete(doc(db!, 'questions', q.id));
      });

      await batch.commit();

      // Update local state
      setQuestions(prev => prev.filter(q => activeQuestionIds.has(q.id)));

      console.log(`Cleaned up ${orphanedQuestions.length} orphaned questions`);
      return orphanedQuestions.length;
    } catch (error) {
      console.error('Error cleaning up orphaned questions:', error);
      return 0;
    }
  }, [tests, questions]);

  // Attempt operations
  const startAttempt = useCallback(async (testId: string): Promise<string> => {
    const firestore = db;
    const currentUser = auth?.currentUser;
    if (!firestore || !currentUser) throw new Error('Auth required');

    try {
      const attemptData: Partial<TestAttempt> = {
        testId,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        answers: {},
        status: 'in-progress',
        startedAt: new Date(),
        lastUpdated: new Date(),
        warningCount: 0,
      };

      const docRef = await addDoc(collection(firestore, 'attempts'), {
        ...attemptData,
        startedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error starting attempt:', error);
      throw error;
    }
  }, []);

  const updateAttempt = useCallback(async (attemptId: string, data: Partial<TestAttempt>) => {
    const firestore = db;
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'attempts', attemptId), {
        ...data,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating attempt:', error);
      throw error;
    }
  }, []);

  const finishAttempt = useCallback(async (attemptId: string, finalData: Partial<TestAttempt>) => {
    const firestore = db;
    const currentUser = auth?.currentUser;
    if (!firestore || !currentUser) return;

    try {
      // First, get the attempt to find the testId
      const attemptDoc = await getDoc(doc(firestore, 'attempts', attemptId));
      const attemptData = attemptDoc.data();
      const testId = attemptData?.testId;

      // Finish the current attempt
      await updateDoc(doc(firestore, 'attempts', attemptId), {
        ...finalData,
        status: 'completed',
        submittedAt: serverTimestamp(),
      });

      // Cleanup: Delete any other in-progress attempts for the same test/student
      if (testId) {
        const orphanedQuery = query(
          collection(firestore, 'attempts'),
          where('studentId', '==', currentUser.uid),
          where('testId', '==', testId),
          where('status', '==', 'in-progress')
        );
        const orphanedSnapshot = await getDocs(orphanedQuery);

        // Delete orphaned attempts (don't delete the one we just finished)
        const batch = writeBatch(firestore);
        let orphanCount = 0;
        orphanedSnapshot.docs.forEach(orphanDoc => {
          if (orphanDoc.id !== attemptId) {
            batch.delete(orphanDoc.ref);
            orphanCount++;
          }
        });
        if (orphanCount > 0) {
          await batch.commit();
          console.log(`Cleaned up ${orphanCount} orphaned in-progress attempts for test ${testId}`);
        }
      }
    } catch (error) {
      console.error('Error finishing attempt:', error);
      throw error;
    }
  }, []);

  // Backward compatibility wrapper (creates and finishes immediately if no ID provided, 
  // but strictly speaking we should migrate UI to use start/finish sequence)
  const submitAttempt = useCallback(async (attempt: Omit<TestAttempt, 'id'>) => {
    // Legacy support: If UI calls this directly without an existing attempt ID, we create one and finish it.
    // Ideally, TakeTest should call startAttempt -> attemptId -> finishAttempt(attemptId, ...).

    // For now, let's assume we might need to handle both flows or refactor TakeTest. 
    // Given the new requirements, we WILL refactor TakeTest to use startAttempt.
    // But passing 'submitAttempt' to legacy components might break if we remove it?
    // Let's implement it as: Create -> Finish (Atomic-ish)

    const firestore = db;
    const currentUser = auth?.currentUser;

    if (!firestore || !currentUser) throw new Error('Auth required');

    try {
      // Logic for computing score is done in UI or here? 
      // UI sends calculated stats. We just save.

      const docRef = await addDoc(collection(firestore, 'attempts'), {
        ...attempt,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        status: 'completed',
        submittedAt: serverTimestamp(),
        startedAt: attempt.startedAt,
      });

      const newAttempt = {
        ...attempt,
        id: docRef.id,
        startedAt: new Date(attempt.startedAt),
        submittedAt: new Date(),
        status: 'completed'
      } as TestAttempt;

      return newAttempt;
    } catch (error) {
      console.error('Error submitting attempt:', error);
      throw error;
    }
  }, []);

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

  // Helper functions - these stay simple for now
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

  const cleanupOldAttempts = useCallback(async (daysToKeep = 30) => {
    const firestore = db;
    if (!firestore) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const q = query(
        collection(firestore, 'attempts'),
        where('submittedAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      let count = 0;
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    } catch (e) {
      console.error('Error cleaning up attempts:', e);
      return 0;
    }
  }, []);

  return {
    subjects,
    chapters,
    topics,
    questions,
    tests,
    attempts,
    loading,
    loadQuestionsForTest,
    loadAllQuestions,
    addQuestions,
    getQuestionsByFilter,
    createTest,
    deleteTest,
    cleanupOrphanedQuestions,
    getTestsByClass,
    getTestById,
    startAttempt,
    updateAttempt,
    finishAttempt,
    submitAttempt,
    getAttemptsByStudent,
    getAttemptById,
    calculateAnalytics,
    getSubjectName,
    getChapterName,
    getTopicName,
    getSubjectsByClass,
    getChaptersBySubject,
    getTopicsByChapter,
    cleanupOldAttempts,
  };
}
