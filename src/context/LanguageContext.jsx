import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = '@honeychain_language';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && TRANSLATIONS[saved]) {
          setLanguageState(saved);
        }
      } catch (err) {
        console.warn('[LanguageContext] Failed to load language:', err?.message);
      } finally {
        setLoading(false);
      }
    };

    loadSavedLanguage();
  }, []);

  const setLanguage = async (langCode) => {
    if (!TRANSLATIONS[langCode]) return;
    setLanguageState(langCode);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    } catch (err) {
      console.warn('[LanguageContext] Failed to save language:', err?.message);
    }
  };

  const t = (key, fallback) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const fallbackDict = TRANSLATIONS.en;
    if (fallbackDict && fallbackDict[key] !== undefined) {
      return fallbackDict[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: LANGUAGES,
        loading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
