import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import colors from '../constants/colors';
import BottomTabBar from '../components/navigation/BottomTabBar';
import HomePage from '../pages/HomePage';
import ApiaryPage from '../pages/ApiaryPage';
import ProfilePage from '../pages/ProfilePage';
import SchemesPage from '../pages/SchemesPage';
import AuthPage from '../pages/AuthPage';
import FirstTimeSetupPage from '../pages/FirstTimeSetupPage';
import { useAuth } from '../context/AuthContext';
import { useHiveData } from '../hooks/useHiveData';
import { QRScannerModal } from '../components/batches/QRScannerModal';
import { PublicVerificationModal } from '../components/batches/PublicVerificationModal';
import { RecordHarvestModal } from '../components/batches/RecordHarvestModal';
import { QRCodeModal } from '../components/batches/QRCodeModal';

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [publicVerifyCode, setPublicVerifyCode] = useState(null);
  const [publicScannerVisible, setPublicScannerVisible] = useState(false);

  // Harvest modal from Home screen
  const [recordHarvestVisible, setRecordHarvestVisible] = useState(false);
  const [createdBatchForQr, setCreatedBatchForQr] = useState(null);

  // Shared Hive, Batch, and Activity State
  const hiveData = useHiveData();

  // Listen to incoming deep links (e.g. honeychain://verify/HC-2026-XXXX or https://honeychain.app/verify/HC-2026-XXXX)
  useEffect(() => {
    const handleUrl = (url) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        let code = null;
        if (parsed.path) {
          const parts = parsed.path.replace(/^\/+/, '').split('/');
          const verifyIndex = parts.indexOf('verify');
          if (verifyIndex !== -1 && parts[verifyIndex + 1]) {
            code = parts[verifyIndex + 1];
          } else if (parts.length > 0 && parts[0].startsWith('HC-')) {
            code = parts[0];
          }
        }
        if (!code && parsed.queryParams?.code) {
          code = parsed.queryParams.code;
        }
        if (code) {
          setPublicVerifyCode(code.trim().toUpperCase());
        }
      } catch (e) {
        console.warn('Failed parsing deep link:', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  const handleScanCode = (scannedCode) => {
    setPublicScannerVisible(false);
    if (scannedCode) {
      setPublicVerifyCode(scannedCode.trim().toUpperCase());
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting to HoneyChain...</Text>
      </View>
    );
  }

  // Consumer verification modals available whether logged in or out
  const verificationModals = (
    <>
      <QRScannerModal
        visible={publicScannerVisible}
        onClose={() => setPublicScannerVisible(false)}
        onScanSuccess={handleScanCode}
      />
      <PublicVerificationModal
        visible={Boolean(publicVerifyCode)}
        batchCode={publicVerifyCode}
        onClose={() => setPublicVerifyCode(null)}
        onScanAnother={() => setPublicScannerVisible(true)}
      />
    </>
  );

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <AuthPage onOpenPublicScanner={() => setPublicScannerVisible(true)} />
        {verificationModals}
      </View>
    );
  }

  // First-time beekeeper setup flow
  if (userProfile && userProfile.isProfileComplete === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <FirstTimeSetupPage onComplete={() => setActiveTab('home')} />
      </View>
    );
  }

  const handleTabChange = (tabKey) => {
    // Graceful routing from legacy tab names to unified apiary tab
    if (tabKey === 'hives' || tabKey === 'batches') {
      setActiveTab('apiary');
    } else {
      setActiveTab(tabKey);
    }
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            stats={hiveData.stats}
            loading={hiveData.loading}
            error={hiveData.error}
            onRefresh={hiveData.refreshData}
            onNavigateToTab={handleTabChange}
            onOpenRecordHarvest={() => setRecordHarvestVisible(true)}
          />
        );
      case 'apiary':
      case 'hives':
      case 'batches':
        return (
          <ApiaryPage
            hives={hiveData.hives}
            batches={hiveData.batches}
            loading={hiveData.loading}
            error={hiveData.error}
            onRefresh={hiveData.refreshData}
            onAddHive={hiveData.addHive}
            onUpdateHive={hiveData.updateHive}
            onDeleteHive={hiveData.deleteHive}
            onAddBatch={hiveData.addBatch}
            onUpdateBatch={hiveData.updateBatch}
            onDeleteBatch={hiveData.deleteBatch}
            onAddReading={hiveData.addReading}
            onOpenScanner={() => setPublicScannerVisible(true)}
            onOpenPublicVerify={(code) => setPublicVerifyCode(code)}
          />
        );
      case 'schemes':
        return (
          <SchemesPage
            onBack={() => setActiveTab('home')}
            hivesCount={hiveData.stats.totalHives}
          />
        );
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <HomePage
            stats={hiveData.stats}
            loading={hiveData.loading}
            error={hiveData.error}
            onRefresh={hiveData.refreshData}
            onNavigateToTab={handleTabChange}
            onOpenRecordHarvest={() => setRecordHarvestVisible(true)}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.screenArea}>{renderActiveScreen()}</View>
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabChange}
        bottomInset={insets.bottom}
      />
      {verificationModals}

      {/* Global Record Harvest Modal from Home Action */}
      <RecordHarvestModal
        visible={recordHarvestVisible}
        hives={hiveData.hives}
        onClose={() => setRecordHarvestVisible(false)}
        onSubmitHarvest={hiveData.addBatch}
        onOpenAddHive={() => {
          setRecordHarvestVisible(false);
          setActiveTab('apiary');
        }}
        onViewQrForBatch={(batch) => {
          setCreatedBatchForQr(batch);
        }}
      />

      {/* QR Code Modal for newly recorded batch */}
      <QRCodeModal
        visible={Boolean(createdBatchForQr)}
        batch={createdBatchForQr}
        onClose={() => setCreatedBatchForQr(null)}
        onPreviewVerification={(code) => {
          setCreatedBatchForQr(null);
          setPublicVerifyCode(code);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default AppNavigator;
