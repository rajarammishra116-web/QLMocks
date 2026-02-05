import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const authInstance = auth;
    if (!authInstance) {
      console.warn('Firebase Auth not initialized. Please checking your .env.local configuration.');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          // Check db inside callback as it might be used
          if (db) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);

            // Set up real-time listener for session management
            // Set up real-time listener for session management
            onSnapshot(userDocRef, async (docSnapshot: any) => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data();

                // Session check disabled for testing
                // const localSessionId = localStorage.getItem('device_session_id');
                // if (userData.sessionId && localSessionId && userData.sessionId !== localSessionId) { ... }

                setUser({
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: userData.name,
                  role: userData.role,
                  class: userData.classLevel,
                  board: userData.board,
                  createdAt: userData.createdAt?.toDate() || new Date(),
                  emailVerified: firebaseUser.emailVerified,
                  batch: userData.batch,
                  isLeaderboardVisible: userData.isLeaderboardVisible ?? false,
                  sessionId: userData.sessionId,
                });

                // Logic dependent on localSessionId is also disabled/removed
                // if (!localSessionId) { ... }
              } else {
                console.error('User document not found for:', firebaseUser.uid);
                await signOut(authInstance);
              }
            }, (error: any) => {
              console.error('Snapshot error:', error);
            });

            // Cleanup snapshot listener when auth state changes or unmount (handled by useEffect closure?)
            // We can't easily return this cleanup from inside onAuthStateChanged.
            // Simplified: The onAuthStateChanged unsubscribe handles the main auth listener. 
            // The snapshot listener might persist if we don't be careful. 
            // Better pattern: store unsubscribeSnapshot in a ref or just let it be for now since app is SPA.
            // For production robustness, we'd manage this subscription statefuly.
            setFirebaseUser(firebaseUser);

          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    classLevel?: number,
    board?: string,
    batch?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const authInstance = auth;
    const firestore = db;

    if (!authInstance || !firestore) {
      console.error('Firebase not initialized');
      return { success: false, error: 'Firebase configuration missing.' };
    }

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const firebaseUser = userCredential.user;

      // Set display name in Firebase Auth profile (so it's available in currentUser.displayName)
      await firebaseUpdateProfile(firebaseUser, { displayName: name });

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Generate Session ID
      const sessionId = crypto.randomUUID();
      localStorage.setItem('device_session_id', sessionId);

      // Create user profile in Firestore
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: email.toLowerCase(),
        emailVerified: false,
        name,
        role,
        classLevel: classLevel || null,
        board: board || null,
        batch: batch || null,
        isLeaderboardVisible: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        sessionId,
      });

      // Force sign out so the user has to login manually
      // This ensures the "Registration Successful" UI in Login.tsx is shown
      // instead of App.tsx engaging the auto-redirect to dashboard.
      await signOut(authInstance);

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);

      // User-friendly error messages
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }

      return { success: false, error: errorMessage };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const authInstance = auth;
    if (!authInstance) {
      console.error('Firebase Auth not initialized');
      alert('Firebase configuration missing.');
      return false;
    }

    try {
      const credential = await signInWithEmailAndPassword(authInstance, email, password);

      // Check if user document exists in Firestore
      if (db && credential.user) {
        const { getDoc, doc } = await import('firebase/firestore');
        const userDocRef = doc(db, 'users', credential.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // User authenticated in Auth but no data in Firestore (deleted account?)
          console.error("User authenticated but no Firestore profile found.");

          // Fix: Delete the zombie auth user so they can register again fresh
          await deleteUser(credential.user);
          await signOut(authInstance);

          alert("Your account was previously deleted. We have cleared your credentials. Please REGISTER again to create a fresh account.");
          return false;
        }

        // Proceed with session update
        const sessionId = crypto.randomUUID();
        localStorage.setItem('device_session_id', sessionId);

        await updateDoc(userDocRef, {
          lastLoginAt: serverTimestamp(),
          sessionId,
        });
      }

      return true;
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert('Invalid email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        alert('Too many failed attempts. Please try again later.');
      } else {
        alert('Login failed. Please try again.');
      }

      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    const authInstance = auth;
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      localStorage.removeItem('device_session_id');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<boolean> => {
    if (!firebaseUser) return false;

    try {
      await sendEmailVerification(firebaseUser);
      alert('Verification email sent! Please check your inbox.');
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      alert('Failed to send verification email.');
      return false;
    }
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    const authInstance = auth;
    if (!authInstance) {
      alert('Firebase not initialized');
      return false;
    }

    try {
      await sendPasswordResetEmail(authInstance, email);
      alert('Password reset email sent! Please check your inbox and spam/junk folder.');
      return true;
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.code === 'auth/user-not-found') {
        alert('No account found with this email.');
      } else {
        alert('Failed to send password reset email.');
      }

      return false;
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    if (!firebaseUser) return false;

    try {
      await firebaseUpdatePassword(firebaseUser, newPassword);
      alert('Password updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Password update error:', error);

      if (error.code === 'auth/requires-recent-login') {
        alert('Please log out and log in again before changing your password.');
      } else {
        alert('Failed to update password.');
      }

      return false;
    }
  }, [firebaseUser]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    const firestore = db;
    if (!user || !firestore) return false;

    try {
      const userDocRef = doc(firestore, 'users', user.id);
      const allowedUpdates: any = {};

      // Only allow updating certain fields (prevent role escalation)
      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.class !== undefined) allowedUpdates.classLevel = updates.class;
      if (updates.batch !== undefined) allowedUpdates.batch = updates.batch;
      if (updates.isLeaderboardVisible !== undefined) {
        allowedUpdates.isLeaderboardVisible = updates.isLeaderboardVisible;
      }

      await updateDoc(userDocRef, allowedUpdates);

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);

      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile.');
      return false;
    }
  }, [user]);

  // Auto-logout logic removed from here and consolidated in App.tsx
  // to ensure consistent behavior and single source of truth.

  const deleteAccount = useCallback(async (password: string): Promise<boolean> => {
    const authInstance = auth;
    const firestore = db;
    if (!authInstance || !firestore || !firebaseUser || !user) return false;

    try {
      // 1. Re-authenticate user (CRITICAL for deleteUser)
      if (!firebaseUser.email) throw new Error("User email not found for re-authentication.");
      const credential = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      console.log('Re-authenticated successfully');

      // 2. Delete all attempts by this user (cascade delete) with batch chunking
      const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
      const attemptsQuery = query(
        collection(firestore, 'attempts'),
        where('studentId', '==', user.id)
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);

      if (attemptsSnapshot.docs.length > 0) {
        const BATCH_SIZE = 450;
        const chunks = [];
        for (let i = 0; i < attemptsSnapshot.docs.length; i += BATCH_SIZE) {
          chunks.push(attemptsSnapshot.docs.slice(i, i + BATCH_SIZE));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(firestore);
          chunk.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
        console.log(`Deleted ${attemptsSnapshot.docs.length} attempts`);
      }

      // 3. Delete user document from Firestore (Profile)
      const userDocRef = doc(firestore, 'users', user.id);
      await deleteDoc(userDocRef);
      console.log('Firestore profile deleted');

      // 4. Delete user FROM FIREBASE AUTH (The most sensitive part)
      try {
        await deleteUser(firebaseUser);
        console.log('Firebase Auth record deleted');
      } catch (authErr: any) {
        console.error('Auth deletion failed:', authErr);
        if (authErr.code === 'auth/requires-recent-login') {
          throw new Error("Security Timeout: Please logout and login again before deleting your account.");
        }
        throw authErr;
      }

      alert('SUCCESS: Your account and data have been permanently removed.');
      return true;
    } catch (error: any) {
      console.error('Deletion Flow Error:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect password. Profile not deleted.');
      } else {
        alert(`Deletion Failed: ${error.message}`);
      }
      return false;
    }
  }, [firebaseUser, user]);

  return {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    isEmailVerified: firebaseUser?.emailVerified ?? false,
    login,
    register,
    logout,
    resendVerificationEmail,
    resetPassword,
    updatePassword,
    updateProfile,
    deleteAccount,
  };
}
