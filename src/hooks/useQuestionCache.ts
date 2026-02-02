import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface QuestionCacheDB extends DBSchema {
    questions: {
        key: string;
        value: {
            id: string;
            data: any;
            timestamp: number;
            version: number;
        };
    };
    metadata: {
        key: string;
        value: {
            lastSync: number;
            version: number;
        };
    };
}

const DB_NAME = 'examtrack-cache';
const DB_VERSION = 1;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class QuestionCacheService {
    private db: IDBPDatabase<QuestionCacheDB> | null = null;

    async init() {
        if (this.db) return this.db;

        this.db = await openDB<QuestionCacheDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Create object stores
                if (!db.objectStoreNames.contains('questions')) {
                    db.createObjectStore('questions', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata');
                }
            },
        });

        return this.db;
    }

    async cacheQuestion(id: string, data: any, version: number = 1) {
        const db = await this.init();
        await db.put('questions', {
            id,
            data,
            timestamp: Date.now(),
            version,
        });
    }

    async cacheQuestions(questions: any[], version: number = 1) {
        const db = await this.init();
        const tx = db.transaction('questions', 'readwrite');

        await Promise.all([
            ...questions.map(q => tx.store.put({
                id: q.id,
                data: q,
                timestamp: Date.now(),
                version,
            })),
            tx.done,
        ]);
    }

    async getQuestion(id: string): Promise<any | null> {
        const db = await this.init();
        const cached = await db.get('questions', id);

        if (!cached) return null;

        // Check if cache is still valid
        const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
        if (isExpired) {
            await db.delete('questions', id);
            return null;
        }

        return cached.data;
    }

    async getAllQuestions(): Promise<any[]> {
        const db = await this.init();
        const all = await db.getAll('questions');

        const now = Date.now();
        const valid: any[] = [];
        const expired: string[] = [];

        for (const item of all) {
            if (now - item.timestamp > CACHE_DURATION) {
                expired.push(item.id);
            } else {
                valid.push(item.data);
            }
        }

        // Clean up expired entries
        if (expired.length > 0) {
            const tx = db.transaction('questions', 'readwrite');
            await Promise.all([
                ...expired.map(id => tx.store.delete(id)),
                tx.done,
            ]);
        }

        return valid;
    }

    async clearCache() {
        const db = await this.init();
        await db.clear('questions');
        await db.clear('metadata');
    }

    async getCacheMetadata() {
        const db = await this.init();
        return await db.get('metadata', 'sync-info');
    }

    async updateCacheMetadata(version: number) {
        const db = await this.init();
        await db.put('metadata', {
            lastSync: Date.now(),
            version,
        }, 'sync-info');
    }

    async getCacheSize(): Promise<number> {
        const db = await this.init();
        const count = await db.count('questions');
        return count;
    }
}

export const questionCache = new QuestionCacheService();

// React hook for using question cache
export function useQuestionCache() {
    const cacheQuestion = async (id: string, data: any, version?: number) => {
        await questionCache.cacheQuestion(id, data, version);
    };

    const cacheQuestions = async (questions: any[], version?: number) => {
        await questionCache.cacheQuestions(questions, version);
    };

    const getQuestion = async (id: string) => {
        return await questionCache.getQuestion(id);
    };

    const getAllQuestions = async () => {
        return await questionCache.getAllQuestions();
    };

    const clearCache = async () => {
        await questionCache.clearCache();
    };

    const getCacheSize = async () => {
        return await questionCache.getCacheSize();
    };

    return {
        cacheQuestion,
        cacheQuestions,
        getQuestion,
        getAllQuestions,
        clearCache,
        getCacheSize,
    };
}
