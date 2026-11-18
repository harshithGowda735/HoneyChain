import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, borderRadius, typography, shadows } from '../constants/layout';
import { globalStyles } from '../styles/globalStyles';
import SchemeCard from '../components/schemes/SchemeCard';
import SchemeDetailModal from '../components/schemes/SchemeDetailModal';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getVerifiedSchemes,
  getUserSavedSchemes,
  saveSchemeBookmark,
  removeSchemeBookmark,
} from '../services/schemesService';
import { evaluateSchemeRelevance } from '../utils/schemeRelevance';

export function SchemesPage({ onBack, hivesCount = 0 }) {
  const { user, currentUser, userProfile } = useAuth();
  const { language, t } = useLanguage();

  const [schemes, setSchemes] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedScheme, setSelectedScheme] = useState(null);

  // Load schemes & bookmarks
  const loadData = useCallback(async () => {
    try {
      const [allSchemes, userBookmarks] = await Promise.all([
        getVerifiedSchemes(),
        user?.uid ? getUserSavedSchemes(user.uid) : Promise.resolve([]),
      ]);

      setSchemes(allSchemes);
      const bookmarkSet = new Set(userBookmarks.map((b) => b.schemeId));
      setBookmarks(bookmarkSet);
    } catch (err) {
      console.warn('[SchemesPage] Error loading schemes:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Toggle bookmark in Firestore
  const handleToggleBookmark = async (schemeId) => {
    if (!user?.uid) return;

    const isCurrentlySaved = bookmarks.has(schemeId);
    const updated = new Set(bookmarks);

    if (isCurrentlySaved) {
      updated.delete(schemeId);
      setBookmarks(updated);
      try {
        await removeSchemeBookmark(user.uid, schemeId);
      } catch (err) {
        console.warn('Failed to remove bookmark:', err?.message);
      }
    } else {
      updated.add(schemeId);
      setBookmarks(updated);
      try {
        await saveSchemeBookmark(user.uid, schemeId);
      } catch (err) {
        console.warn('Failed to save bookmark:', err?.message);
      }
    }
  };

  const userState = (currentUser?.state || userProfile?.state || 'Karnataka').trim();
  const userStateLower = userState.toLowerCase();

  // Automatic state & Central government matching
  const filteredSchemes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return schemes.filter((scheme) => {
      // 1. Auto-match by User State or Central Government
      const schemeStates = (scheme.applicableStates || []).map((s) => s.toLowerCase());
      const isCentral = scheme.level === 'Central' || schemeStates.includes('all');
      const isStateMatch =
        (scheme.state || '').toLowerCase() === userStateLower ||
        schemeStates.includes(userStateLower);

      if (!isCentral && !isStateMatch) {
        return false;
      }

      // 2. Search Text
      if (query) {
        const matchesTitle = scheme.name.toLowerCase().includes(query);
        const matchesShort = scheme.shortName.toLowerCase().includes(query);
        const matchesDept = scheme.department.toLowerCase().includes(query);
        const matchesMinistry = scheme.ministry.toLowerCase().includes(query);
        const matchesPurpose = scheme.purpose.toLowerCase().includes(query);
        const matchesBenefits = scheme.benefits.toLowerCase().includes(query);

        if (!matchesTitle && !matchesShort && !matchesDept && !matchesMinistry && !matchesPurpose && !matchesBenefits) {
          return false;
        }
      }

      return true;
    });
  }, [schemes, searchQuery, userStateLower]);

  // Selected scheme relevance
  const selectedSchemeRelevance = useMemo(() => {
    if (!selectedScheme) return null;
    return evaluateSchemeRelevance(selectedScheme, userProfile || {}, hivesCount);
  }, [selectedScheme, userProfile, hivesCount]);

  return (
    <View style={globalStyles.screenContainer}>
      {/* Top Header with Back Button */}
      <View style={styles.topBar}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{t('tabSchemes', 'Government Schemes')}</Text>
          <Text style={styles.pageSubtitle}>
            Subsidies, grants & equipment support for beekeepers
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryDark}
            colors={[colors.primaryDark]}
          />
        }
      >
        {/* Auto Location & Central Government Match Banner */}
        <View style={styles.autoLocationBanner}>
          <View style={styles.locationIconBox}>
            <Ionicons name="location" size={18} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoLocationTitle}>
              {userState} & Central Government Schemes
            </Text>
            <Text style={styles.autoLocationSub}>
              Automatically filtered for your registered farm location
            </Text>
          </View>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchSchemesPlaceholder', 'Search schemes...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Schemes List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={styles.loadingText}>Loading verified schemes...</Text>
          </View>
        ) : filteredSchemes.length > 0 ? (
          <View style={styles.schemesList}>
            {filteredSchemes.map((scheme) => {
              const relevance = evaluateSchemeRelevance(scheme, userProfile || {}, hivesCount);
              const isBookmarked = bookmarks.has(scheme.id);

              return (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  relevance={relevance}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={handleToggleBookmark}
                  onPressDetails={(sc) => setSelectedScheme(sc)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={t('noSchemesFound', 'No government schemes found')}
            description={
              language === 'kn'
                ? 'ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. "NBHM", "ಪೆಟ್ಟಿಗೆ", ಅಥವಾ "ಸಬ್ಸಿಡಿ" ಎಂದು ಹುಡುಕಿ ನೋಡಿ.'
                : language === 'hi'
                ? 'कोई सरकारी योजना नहीं मिली। "NBHM", "बॉक्सेस" या "सब्सिडी" खोजें।'
                : 'No government schemes matched your search. Try searching for "MIDH", "NBHM", or "boxes".'
            }
            actionTitle={searchQuery ? 'Clear Search' : undefined}
            onActionPress={searchQuery ? () => setSearchQuery('') : undefined}
          />
        )}
      </ScrollView>

      {/* Scheme Detail Modal */}
      <SchemeDetailModal
        visible={Boolean(selectedScheme)}
        scheme={selectedScheme}
        relevance={selectedSchemeRelevance}
        isBookmarked={selectedScheme ? bookmarks.has(selectedScheme.id) : false}
        onToggleBookmark={handleToggleBookmark}
        onClose={() => setSelectedScheme(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  pageTitle: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl + 32,
  },
  autoLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.softAmber,
    gap: spacing.sm,
    ...shadows.sm,
  },
  locationIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softAmber,
  },
  autoLocationTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primaryDark,
  },
  autoLocationSub: {
    fontSize: typography.size.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  clearSearchBtn: {
    padding: 2,
  },
  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  schemesList: {
    gap: spacing.xs,
  },
});

export default SchemesPage;
