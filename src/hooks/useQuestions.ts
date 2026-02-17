import { useState, useCallback } from 'react';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Question, Test } from '@/types';
import { useQuestionCache } from './useQuestionCache';

export function useQuestions() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const questionCache = useQuestionCache();

    // Lazy load questions for a specific test
    const loadQuestionsForTest = useCallback(async (test: Test) => {
        if (!db) return;
        if (!test.questionIds || test.questionIds.length === 0) return;

        setLoading(true);
        console.log(`Lazy loading ${test.questionIds.length} questions for test ${test.id}...`);

        try {
            // 1. Check loaded
            const loadedIds = new Set(questions.map(q => q.id));
            const missingIds = test.questionIds.filter(id => !loadedIds.has(id));

            if (missingIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Try Cache FIRST (Optimization)
            const newQuestions: Question[] = [];
            const reallyMissingIds: string[] = [];

            for (const id of missingIds) {
                const cached = await questionCache.getQuestion(id);
                if (cached) {
                    newQuestions.push(cached as Question);
                } else {
                    reallyMissingIds.push(id);
                }
            }

            // 3. Fetch really missing from DB
            if (reallyMissingIds.length > 0) {
                console.log(`Fetching ${reallyMissingIds.length} from Firestore...`);
                const fetchPromises = reallyMissingIds.map(id => getDoc(doc(db!, 'questions', id)));
                const snapshots = await Promise.all(fetchPromises);

                const fetched: Question[] = [];
                snapshots.forEach(snap => {
                    if (snap.exists()) {
                        fetched.push({
                            id: snap.id,
                            ...snap.data(),
                            createdAt: snap.data().createdAt?.toDate() || new Date(),
                        } as unknown as Question);
                    }
                });

                // Cache them for next time
                if (fetched.length > 0) {
                    await questionCache.cacheQuestions(fetched);
                    newQuestions.push(...fetched);
                }
            }

            if (newQuestions.length > 0) {
                setQuestions(prev => [...prev, ...newQuestions]);
            }

        } catch (error) {
            console.error("Error lazy loading questions:", error);
        } finally {
            setLoading(false);
        }
    }, [questions, questionCache]);

    // Admin: Load All (Warning: Heavy)
    const loadAllQuestions = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            // TODO: Pagination here too eventually
            const qQuery = query(collection(db, 'questions'));
            const snapshot = await getDocs(qQuery);
            const allQuestions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as unknown as Question[];

            setQuestions(allQuestions);
        } catch (e) {
            console.error("Error loading all questions:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        questions,
        loading,
        loadQuestionsForTest,
        loadAllQuestions,
        setQuestions // Exposed for updates
    };
}
