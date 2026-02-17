import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    limit,
    startAfter,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TestAttempt } from '@/types';

export function useAttempts(userId?: string, isAdmin: boolean = false) {
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination for Admin
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    // Student: Real-time listener for OWN attempts
    useEffect(() => {
        if (isAdmin || !userId || !db) return;

        setLoading(true);
        // Note: Removed orderBy('startedAt', 'desc') to avoid needing a composite index for every user query
        // We will sort client-side instead.
        const q = query(
            collection(db, 'attempts'),
            where('studentId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startedAt: doc.data().startedAt?.toDate() || new Date(),
                submittedAt: doc.data().submittedAt?.toDate() || new Date(),
                lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
            })) as TestAttempt[];

            // Sort client-side
            loaded.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

            setAttempts(loaded);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching student attempts:", err);
            // Don't set error visible to user immediately as it might be permission issue during auth init
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, isAdmin]);

    // Admin: Fetch All Attempts (Paginated)
    const fetchAdminAttempts = useCallback(async (isNextPage: boolean = false) => {
        if (!isAdmin || !db) return;

        // Reset pagination state on full refresh
        if (!isNextPage) {
            setHasMore(true);
            setLastDoc(null);
        }

        setLoading(true);
        try {
            let q = query(
                collection(db, 'attempts'),
                orderBy('startedAt', 'desc'),
                limit(PAGE_SIZE)
            );

            if (isNextPage && lastDoc && db) {
                q = query(
                    collection(db, 'attempts'),
                    orderBy('startedAt', 'desc'),
                    startAfter(lastDoc),
                    limit(PAGE_SIZE)
                );
            }

            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startedAt: doc.data().startedAt?.toDate() || new Date(),
                submittedAt: doc.data().submittedAt?.toDate() || new Date(),
                lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
            })) as TestAttempt[];

            if (loaded.length < PAGE_SIZE) {
                setHasMore(false);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setAttempts(prev => isNextPage ? [...prev, ...loaded] : loaded);

        } catch (err) {
            console.error("Error fetching admin attempts:", err);
            setError("Failed to fetch attempts.");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, lastDoc]);

    // Initial Admin Fetch
    useEffect(() => {
        if (isAdmin) {
            fetchAdminAttempts(false);
        }
    }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        attempts,
        loading,
        error,
        hasMore,
        fetchMore: () => fetchAdminAttempts(true),
        refresh: () => fetchAdminAttempts(false)
    };
}
