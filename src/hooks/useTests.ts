import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    getDocs,
    limit,
    startAfter
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Test } from '@/types';

export function useTests(isAdmin: boolean = false) {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state (for Admin)
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    // Real-time listener for Students (Active/Published tests)
    useEffect(() => {
        if (isAdmin || !db) return; // Admin uses manual fetch

        setLoading(true);
        // For students, we might want to filter by 'published' status eventually
        // For now, mirroring useData behavior but confirming connection
        const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(testsQuery, (snapshot) => {
            const loadedTests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as Test[];

            setTests(loadedTests);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching tests (RT):", err);
            setError("Failed to load tests.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    // Admin: Initial Fetch (Pagination ready)
    const fetchAdminTests = useCallback(async (isNextPage: boolean = false) => {
        if (!isAdmin || !db) return;

        setLoading(true);
        try {
            let q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

            if (isNextPage && lastDoc && db) {
                q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
            }

            const snapshot = await getDocs(q);

            const loadedTests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as Test[];

            if (loadedTests.length < PAGE_SIZE) {
                setHasMore(false);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

            setTests(prev => isNextPage ? [...prev, ...loadedTests] : loadedTests);
        } catch (err) {
            console.error("Error fetching admin tests:", err);
            setError("Failed to fetch tests.");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, lastDoc]);

    // Trigger admin fetch on mount
    useEffect(() => {
        if (isAdmin) {
            fetchAdminTests(false);
        }
    }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        tests,
        loading,
        error,
        hasMore,
        fetchMore: () => fetchAdminTests(true),
        refresh: () => fetchAdminTests(false)
    };
}
