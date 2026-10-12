import React, { createContext, useContext, useState, useEffect } from 'react';
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
            // Load or initialize user profile doc in Firestore
            const profile = await createUserProfile(firebaseUser.uid, {
              phoneNumber: firebaseUser.phoneNumber || '',
              displayName: firebaseUser.displayName || '',
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
    const userCredential = await verifyPhoneOtpAndSignIn(sessionInfo, code);
    if (userCredential?.user?.uid) {
      try {
        const profile = await createUserProfile(userCredential.user.uid, {
          phoneNumber: userCredential.user.phoneNumber || extraData.phoneNumber || '',
          displayName: extraData.displayName || 'Beekeeper',
          apiaryName: extraData.apiaryName || config.defaultApiaryName,
          preferredLanguage: extraData.preferredLanguage || 'en',
          role: 'beekeeper',
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
    setUserProfile(null);
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
