import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppButton from '../common/AppButton';
import { useLanguage } from '../../context/LanguageContext';

export function QRScannerModal({ visible, onClose, onScanSuccess }) {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'manual'

  const extractBatchCode = (rawData) => {
    if (!rawData) return '';
    const trimmed = rawData.trim();

    // Check for URL: https://honeychain.app/verify/HC-2026-1234
    if (trimmed.includes('/verify/')) {
      const parts = trimmed.split('/verify/');
      if (parts[1]) {
        return parts[1].split('?')[0].split('#')[0].trim();
      }
    }

    // Check for custom URI scheme: honeychain://verify/HC-2026-1234
    if (trimmed.startsWith('honeychain://verify/')) {
      const parts = trimmed.replace('honeychain://verify/', '').split('?');
      return parts[0].trim();
    }

    return trimmed;
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const code = extractBatchCode(data);
    if (!code) {
      Alert.alert('Invalid QR Code', 'The scanned QR code is not a recognized HoneyChain batch identifier.', [
        { text: t('retry'), onPress: () => setScanned(false) },
      ]);
      return;
    }

    onScanSuccess(code);
    setScanned(false);
  };

  const handleManualSubmit = () => {
    const code = extractBatchCode(manualCode);
    if (!code) {
      Alert.alert(t('required'), 'Please enter a valid batch code.');
      return;
    }

    setManualCode('');
    onScanSuccess(code);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('publicVerifyTitle')}</Text>
            <Text style={styles.headerSub}>{t('verifyJarDesc')}</Text>
          </View>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'camera' && styles.modeTabActive]}
            onPress={() => {
              setInputMode('camera');
              setScanned(false);
            }}
          >
            <Ionicons
              name="camera-outline"
              size={18}
              color={inputMode === 'camera' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                inputMode === 'camera' && styles.modeTabTextActive,
              ]}
            >
              {t('scanQrBtn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'manual' && styles.modeTabActive]}
            onPress={() => setInputMode('manual')}
          >
            <Ionicons
              name="keypad-outline"
              size={18}
              color={inputMode === 'manual' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                inputMode === 'manual' && styles.modeTabTextActive,
              ]}
            >
              {t('enterCodeManual')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode 1: Camera Scanner */}
        {inputMode === 'camera' && (
          <View style={styles.cameraContainer}>
            {!permission ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>{t('loading')}</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <View style={styles.permissionIconCircle}>
                  <Ionicons name="camera-outline" size={40} color={colors.accentDeep} />
                </View>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                  {t('cameraPermissionNeeded')}
                </Text>
                <AppButton
                  title={t('grantPermission')}
                  iconName="shield-checkmark-outline"
                  variant="primary"
                  size="md"
                  onPress={requestPermission}
                  style={styles.permissionBtn}
                />
                <TouchableOpacity onPress={() => setInputMode('manual')}>
                  <Text style={styles.fallbackManualLink}>
                    Or enter batch code manually →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scannerWrapper}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                >
                  <View style={styles.overlay}>
                    <View style={styles.unfocusedTop} />
                    <View style={styles.centerRow}>
                      <View style={styles.unfocusedSide} />
                      <View style={styles.scanTarget}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                      </View>
                      <View style={styles.unfocusedSide} />
                    </View>
                    <View style={styles.unfocusedBottom}>
                      <Text style={styles.scanInstruction}>
                        Align jar label QR code inside the frame
                      </Text>
                    </View>
                  </View>
                </CameraView>
              </View>
            )}
          </View>
        )}

        {/* Mode 2: Manual Code Entry */}
        {inputMode === 'manual' && (
          <View style={styles.manualContainer}>
            <View style={styles.manualCard}>
              <View style={styles.manualIconCircle}>
                <Ionicons name="document-text-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.manualTitle}>{t('manualEntryTitle')}</Text>
              <Text style={styles.manualSub}>
                Enter the batch code printed on the jar label (e.g. HC-2026-1042)
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="barcode-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="HC-2026-XXXX"
                  placeholderTextColor={colors.textMuted}
                  value={manualCode}
                  onChangeText={(val) => setManualCode(val.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              <AppButton
                title="Verify Batch Record"
                iconName="search-outline"
                variant="primary"
                size="lg"
                disabled={!manualCode.trim()}
                onPress={handleManualSubmit}
                style={styles.submitBtn}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  headerBackBtn: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomColor: colors.primary,
  },
  modeTabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  unfocusedTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  centerRow: {
    flexDirection: 'row',
    height: 250,
  },
  unfocusedSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.surface,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  unfocusedBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  permissionBox: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  permissionText: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  permissionBtn: {
    width: 240,
    marginBottom: spacing.sm,
  },
  fallbackManualLink: {
    fontSize: typography.size.xs + 1,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  manualContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  manualCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  manualIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  manualTitle: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  manualSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  submitBtn: {
    width: '100%',
  },
});

export default QRScannerModal;
