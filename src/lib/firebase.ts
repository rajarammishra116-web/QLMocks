import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
const validateConfig = () => {
    const required = ['apiKey', 'authDomain', 'projectId'];
    const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

    if (missing.length > 0) {
        console.error('Missing Firebase configuration:', missing);
        console.error('Please create a .env.local file based on .env.example');
        throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
    }
};

// Initialize Firebase only if config is valid
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;
let performance: FirebasePerformance | undefined;

const initializeFirebase = () => {
    try {
        validateConfig();

        // Initialize Firebase
        if (!app) {
            app = initializeApp(firebaseConfig);
        }

        // Initialize services
        auth = getAuth(app);
        db = getFirestore(app);

        // Initialize Analytics (only in production)
        if (import.meta.env.PROD && firebaseConfig.measurementId) {
            analytics = getAnalytics(app);
        }

        // Initialize Performance Monitoring (only in production)
        if (import.meta.env.PROD) {
            performance = getPerformance(app);
        }

        // Connect to emulators in development (optional)
        if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
            connectAuthEmulator(auth, 'http://localhost:9099');
            connectFirestoreEmulator(db, 'localhost', 8080);
            console.log('🔧 Connected to Firebase Emulators');
        }

        if (import.meta.env.DEV) {
            console.log('✅ Firebase initialized successfully with project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
};

// Initialize app immediately
initializeFirebase();

export { app, auth, db, analytics, performance };
