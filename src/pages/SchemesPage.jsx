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
import ProfileQuickEditModal from '../components/schemes/ProfileQuickEditModal';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/common/LanguageSelector';
import {
  getVerifiedSchemes,
  getUserSavedSchemes,
  saveSchemeBookmark,
  removeSchemeBookmark,
} from '../services/schemesService';
import { evaluateSchemeRelevance } from '../utils/schemeRelevance';

export function SchemesPage({ onBack, hivesCount = 0 }) {
  const { user, userProfile, updateProfile } = useAuth();
  const { language, t } = useLanguage();

  const filterTabs = [
    { key: 'all', label: t('filterAll') },
    { key: 'central', label: t('filterCentral') },
    { key: 'karnataka', label: t('filterKarnataka') },
    { key: 'bookmarked', label: t('filterSaved') },
  ];

  const [schemes, setSchemes] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals state
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

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

  // Profile update handler
  const handleSaveProfile = async (updatedData) => {
    if (updateProfile) {
      await updateProfile(updatedData);
    }
  };

  // Filter & Search Evaluation
  const filteredSchemes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return schemes.filter((scheme) => {
      // 1. Level / Category Filter
      if (activeFilter === 'central' && scheme.level !== 'Central') return false;
      if (activeFilter === 'karnataka' && scheme.state.toLowerCase() !== 'karnataka') return false;
      if (activeFilter === 'bookmarked' && !bookmarks.has(scheme.id)) return false;

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
  }, [schemes, searchQuery, activeFilter, bookmarks]);

  // Selected scheme relevance
  const selectedSchemeRelevance = useMemo(() => {
    if (!selectedScheme) return null;
    return evaluateSchemeRelevance(selectedScheme, userProfile || {}, hivesCount);
  }, [selectedScheme, userProfile, hivesCount]);

  const userStateDisplay = userProfile?.state || 'Karnataka (Default)';
  const userEntityDisplay = userProfile?.entityType === 'farmer'
    ? 'Farmer'
    : userProfile?.entityType === 'enterprise'
    ? 'Enterprise'
    : userProfile?.entityType === 'fpo_shg'
    ? 'FPO / SHG'
    : 'Individual Beekeeper';

  return (
    <View style={globalStyles.screenContainer}>
      {/* Top Header with Back Button & Language Selector */}
      <View style={styles.topBar}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{t('schemesPageTitle')}</Text>
          <Text style={styles.pageSubtitle}>
            {t('schemesPageSub')}
          </Text>
        </View>
        <LanguageSelector compact />
        <TouchableOpacity
          onPress={() => setProfileModalVisible(true)}
          style={styles.profileEditIconBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
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
        {/* Profile Criteria Bar */}
        <TouchableOpacity
          style={styles.profileBar}
          activeOpacity={0.8}
          onPress={() => setProfileModalVisible(true)}
        >
          <View style={styles.profileBarLeft}>
            <View style={styles.profileIconCircle}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileBarTitle}>{t('matchingCriteria')}</Text>
              <Text style={styles.profileBarSub}>
                {userStateDisplay} • {userEntityDisplay} • {hivesCount} {hivesCount === 1 ? 'Hive' : 'Hives'}
              </Text>
            </View>
          </View>
          <View style={styles.profileBarAction}>
            <Text style={styles.profileBarActionText}>{t('changeCriteria')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>

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

        {/* Category & Region Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                  {tab.key === 'bookmarked' && bookmarks.size > 0 ? ` (${bookmarks.size})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
            icon={activeFilter === 'bookmarked' ? 'bookmark-outline' : 'search-outline'}
            title={activeFilter === 'bookmarked' ? t('noSavedSchemes') : t('noSchemesFound')}
            message={
              activeFilter === 'bookmarked'
                ? (language === 'kn' ? 'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಯೋಜನೆಗಳನ್ನು ಉಳಿಸಿಲ್ಲ. ನಂತರ ನೋಡಲು ಬುಕ್‌ಮಾರ್ಕ್ ಚಿಹ್ನೆಯನ್ನು ಒತ್ತಿ.' : language === 'hi' ? 'आपने अभी तक कोई योजना सहेजी नहीं है। बाद में देखने के लिए बुकमार्क आइकन पर टैप करें।' : 'You have not saved any schemes yet. Tap the bookmark ribbon on any scheme to revisit it later.')
                : (language === 'kn' ? 'ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. "NBHM", "ಪೆಟ್ಟಿಗೆ", ಅಥವಾ ಫಿಲ್ಟರ್ ಬದಲಾಯಿಸಿ ನೋಡಿ.' : language === 'hi' ? 'कोई सरकारी योजना नहीं मिली। "NBHM", "बॉक्सेस" या फ़िल्ಟರ್ बदल कर खोजें।' : 'No government schemes matched your search. Try searching for "MIDH", "NBHM", "boxes", or change your filter.')
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

      {/* Profile Quick Edit Modal */}
      <ProfileQuickEditModal
        visible={profileModalVisible}
        currentProfile={userProfile || {}}
        onSave={handleSaveProfile}
        onClose={() => setProfileModalVisible(false)}
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
  profileEditIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  profileBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  profileIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBarTitle: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  profileBarSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  profileBarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  profileBarActionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
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
  filterTabsContainer: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  filterChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
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
