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
import { spacing, borderRadius, typography } from '../constants/layout';
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

  // Automatic state & Central government matching (no manual filters needed)
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
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Government Schemes</Text>
          <Text style={styles.pageSubtitle}>
            Subsidies & grants for beekeepers
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Auto Location & Central Government Match Banner */}
        <View style={styles.autoLocationBanner}>
          <View style={styles.locationIconBox}>
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoLocationTitle}>
              {userState} & Central Schemes
            </Text>
            <Text style={styles.autoLocationSub}>
              Matched to your registered location
            </Text>
          </View>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchSchemesPlaceholder')}
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
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
            icon="search-outline"
            title={t('noSchemesFound')}
            message={
              language === 'kn'
                ? 'ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. "NBHM", "ಪೆಟ್ಟಿಗೆ", ಅಥವಾ "ಸಬ್ಸಿಡಿ" ಎಂದು ಹುಡುಕಿ ನೋಡಿ.'
                : language === 'hi'
                ? 'कोई सरकारी योजना नहीं मिली। "NBHM", "बॉक्सेस" या "सब्सिडी" खोजें।'
                : 'No government schemes matched your search. Try searching for "MIDH", "NBHM", or "boxes".'
            }
            actionLabel={searchQuery ? (language === 'kn' ? 'ಹುಡುಕಾಟ ತೆರವುಗೊಳಿಸಿ' : language === 'hi' ? 'खोज साफ़ करें' : 'Clear Search') : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  pageTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 16,
  },
  autoLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCF8ED',
    borderWidth: 1,
    borderColor: '#F0E6D2',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoLocationTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  autoLocationSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  autoMatchBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  autoMatchBadgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
    letterSpacing: 0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  clearSearchBtn: {
    padding: spacing.xs,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  schemesList: {
    gap: spacing.sm,
  },
});

export default SchemesPage;
