import {
  signInWithCredential,
  PhoneAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

/**
 * Phone Authentication Service
 * Uses Firebase Identity Toolkit REST API for sending SMS verification codes
 * and Firebase Auth PhoneAuthProvider.credential for authenticating the session.
 */

/**
 * Send SMS verification code to an E.164 phone number (+91XXXXXXXXXX)
 * @param {string} phoneNumber E.164 formatted number e.g. +919876543210
 * @param {string} recaptchaToken Token from reCAPTCHA verification (or empty for test numbers)
 * @returns {Promise<{ sessionInfo: string }>}
 */
export async function sendPhoneVerificationCode(phoneNumber, recaptchaToken = '') {
  if (!phoneNumber || !phoneNumber.trim()) {
    throw new Error('Phone number is required.');
  }

  const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
  if (!cleanPhone.startsWith('+')) {
    throw new Error('Phone number must include country code (e.g. +91).');
  }

  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;

  const bodyPayload = {
    phoneNumber: cleanPhone,
  };

  if (recaptchaToken) {
    bodyPayload.recaptchaToken = recaptchaToken;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || 'Failed to send verification SMS.';
    const error = new Error(errorMsg);
    error.code = data.error?.message || 'auth/unknown';
    throw error;
  }

  return {
    sessionInfo: data.sessionInfo,
    phoneNumber: cleanPhone,
  };
}

/**
 * Verify OTP and sign in the user into Firebase Auth
 * @param {string} sessionInfo The sessionInfo returned by sendPhoneVerificationCode
 * @param {string} verificationCode 6-digit OTP code
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function verifyPhoneOtpAndSignIn(sessionInfo, verificationCode) {
  if (!sessionInfo) {
    throw new Error('Verification session is missing. Please request a new OTP.');
  }
  if (!verificationCode || verificationCode.trim().length < 6) {
    throw new Error('Please enter the 6-digit verification code.');
  }

  const cleanCode = verificationCode.trim();

  // 1. Try signing in with Firebase SDK PhoneAuthProvider.credential
  try {
    const credential = PhoneAuthProvider.credential(sessionInfo, cleanCode);
    return await signInWithCredential(auth, credential);
  } catch (sdkErr) {
    // 2. If SDK credential fails or throws, try Identity Toolkit REST verification
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionInfo,
        code: cleanCode,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || sdkErr?.message || 'Invalid verification code.';
      const err = new Error(errorMsg);
      err.code = data.error?.message || sdkErr?.code || 'auth/invalid-verification-code';
      throw err;
    }

    // Attempt second credential pass with confirmed session
    const fallbackCred = PhoneAuthProvider.credential(sessionInfo, cleanCode);
    return await signInWithCredential(auth, fallbackCred);
  }
}

/**
 * Sign out user
 */
export async function signOutPhoneUser() {
  return await signOut(auth);
}

export default {
  sendPhoneVerificationCode,
  verifyPhoneOtpAndSignIn,
  signOutPhoneUser,
};
