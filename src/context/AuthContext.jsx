import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../constants/config';
import {
  auth,
  signOutUser,
  onAuthStateChanged,
} from '../services/firebase';
import {
  sendPhoneVerificationCode,
  verifyPhoneOtpAndSignIn,
} from '../services/phoneAuthService';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/userService';

const AuthContext = createContext(null);
const AUTH_SESSION_KEY = '@honeychain_auth_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Restore local session immediately for smooth offline & demo persistence
    AsyncStorage.getItem(AUTH_SESSION_KEY)
      .then(async (raw) => {
        if (!isMounted) return;
        if (raw) {
          try {
            const cachedUser = JSON.parse(raw);
            if (cachedUser?.uid) {
              setUser(cachedUser);
              const profile = await getUserProfile(cachedUser.uid);
              if (profile && isMounted) {
                setUserProfile(profile);
              }
            }
          } catch (_) {}
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!isMounted) return;
        if (firebaseUser) {
          setUser(firebaseUser);
          await AsyncStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify({
              uid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber || '',
              displayName: firebaseUser.displayName || 'Beekeeper',
            })
          );
          try {
            const profile = await createUserProfile(firebaseUser.uid, {
              phoneNumber: firebaseUser.phoneNumber || '',
              displayName: firebaseUser.displayName || '',
              isProfileComplete: true,
            });
            setUserProfile(profile);
          } catch (profileErr) {
            console.warn('[HoneyChain Auth] User profile load error:', profileErr?.message);
          }
        }
        setLoading(false);
        setAuthError(null);
      },
      (error) => {
        if (!isMounted) return;
        console.error('[HoneyChain Auth] onAuthStateChanged error:', error);
        setAuthError(error);
        setLoading(false);
      }
    );

    // Clean up subscription on unmount
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Request OTP SMS for phone number
   */
  const sendOtp = async (phoneNumber, recaptchaToken = '') => {
    setAuthError(null);
    return await sendPhoneVerificationCode(phoneNumber, recaptchaToken);
  };

  /**
   * Verify OTP and complete sign-in
   */
  const verifyOtp = async (sessionInfo, code, extraData = {}) => {
    setAuthError(null);
    const userCredential = await verifyPhoneOtpAndSignIn(sessionInfo, code, extraData.phoneNumber || '');

    if (userCredential?.user?.uid) {
      const activeUser = userCredential.user;

      // Immediately activate user in state so navigation triggers to Home
      setUser(activeUser);

      await AsyncStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({
          uid: activeUser.uid,
          phoneNumber: activeUser.phoneNumber || extraData.phoneNumber || '',
          displayName: activeUser.displayName || extraData.displayName || 'Beekeeper',
        })
      );

      try {
        const profile = await createUserProfile(activeUser.uid, {
          phoneNumber: activeUser.phoneNumber || extraData.phoneNumber || '',
          displayName: extraData.displayName || 'Beekeeper',
          apiaryName: extraData.apiaryName || config.defaultApiaryName,
          preferredLanguage: extraData.preferredLanguage || 'en',
          role: 'beekeeper',
          isProfileComplete: true, // Direct entry to Home page
        });
        setUserProfile(profile);
      } catch (e) {
        console.warn('[HoneyChain Auth] Profile creation warning:', e?.message);
      }
    }
    return userCredential;
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    setAuthError(null);
    setUser(null);
    setUserProfile(null);
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    return await signOutUser();
  };

  /**
   * Update beekeeper profile
   */
  const updateProfile = async (data) => {
    if (!user?.uid) throw new Error('Cannot update profile without active session.');
    const updated = await updateUserProfile(user.uid, data);
    setUserProfile(updated);
    return updated;
  };

  // Derived Beekeeper display profile
  const currentUser = user
    ? {
        uid: user.uid,
        name: userProfile?.displayName || user.displayName || 'Beekeeper',
        phoneNumber: user.phoneNumber || userProfile?.phoneNumber || '',
        role: userProfile?.role || 'beekeeper',
        apiaryName: userProfile?.apiaryName || config.defaultApiaryName,
        photoUrl: userProfile?.photoUrl || user.photoURL || null,
        state: userProfile?.state || 'Karnataka',
        district: userProfile?.district || 'General',
        entityType: userProfile?.entityType || 'farmer',
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
        sendOtp,
        verifyOtp,
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
