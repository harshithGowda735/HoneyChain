import React, { createContext, useContext, useState, useEffect } from 'react';
import config from '../constants/config';
import {
  auth,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  onAuthStateChanged,
} from '../services/firebase';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            // Ensure a profile doc exists without overwriting on login
            const profile = await createUserProfile(firebaseUser.uid, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            });
            setUserProfile(profile);
          } catch (profileErr) {
            console.warn('[HoneyChain Auth] User profile load error:', profileErr?.message);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
        setAuthError(null);
      },
      (error) => {
        console.error('[HoneyChain Auth] onAuthStateChanged error:', error);
        setAuthError(error);
        setLoading(false);
      }
    );

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setAuthError(null);
    return await signInWithEmail(email, password);
  };

  const signUp = async (email, password, extraData = {}) => {
    setAuthError(null);
    const userCredential = await signUpWithEmail(email, password);
    if (userCredential?.user?.uid) {
      try {
        const profile = await createUserProfile(userCredential.user.uid, {
          email: userCredential.user.email,
          displayName: extraData.displayName || userCredential.user.email?.split('@')[0] || 'Apiarist',
          apiaryName: extraData.apiaryName || config.defaultApiaryName,
          role: 'beekeeper',
        });
        setUserProfile(profile);
      } catch (e) {
        console.warn('[HoneyChain Auth] Profile creation warning:', e?.message);
      }
    }
    return userCredential;
  };

  const signOut = async () => {
    setAuthError(null);
    setUserProfile(null);
    return await signOutUser();
  };

  const updateProfile = async (data) => {
    if (!user?.uid) throw new Error('Cannot update profile without active session.');
    const updated = await updateUserProfile(user.uid, data);
    setUserProfile(updated);
    return updated;
  };

  // Beekeeper display profile derived from real Firestore profile
  const currentUser = user
    ? {
        uid: user.uid,
        name: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Apiarist',
        role: userProfile?.role || 'beekeeper',
        email: user.email,
        apiaryName: userProfile?.apiaryName || config.defaultApiaryName,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        currentUser,
        isRealAuthConnected: Boolean(user),
        authError,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
