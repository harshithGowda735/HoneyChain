import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase Configuration for HoneyChain
 * Reads exclusively from EXPO_PUBLIC_ environment variables.
 * Never hardcode API keys or credentials directly.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 1. Initialize or reuse existing Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize React Native Auth with persistence
let authInstance;
try {
  if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    authInstance = getAuth(app);
  }
} catch (error) {
  // If already initialized during hot reload/fast refresh, retrieve existing instance
  authInstance = getAuth(app);
}

export const auth = authInstance;

// 3. Initialize Firestore Database instance
export const db = getFirestore(app);

// 4. Status Metadata
export const FIREBASE_STATUS = {
  isInitialized: true,
  projectId: firebaseConfig.projectId || 'honeychain-fa9c9',
  authPersistence: Platform.OS !== 'web' ? 'AsyncStorage' : 'BrowserLocal',
};

// 5. Authentication helper functions
export async function signUpWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  return await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUser() {
  return await signOut(auth);
}

export { onAuthStateChanged };

export default {
  app,
  auth,
  db,
  FIREBASE_STATUS,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  onAuthStateChanged,
};
