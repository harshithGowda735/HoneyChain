import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';
import AppButton from '../common/AppButton';

export function QRScannerModal({ visible, onClose, onScanSuccess }) {
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
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
      return;
    }

    onScanSuccess(code);
    setScanned(false);
  };

  const handleManualSubmit = () => {
    const code = extractBatchCode(manualCode);
    if (!code) {
      Alert.alert('Required', 'Please enter a valid batch code.');
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
            <Text style={styles.headerTitle}>Verify Honey Batch</Text>
            <Text style={styles.headerSub}>Scan jar label QR code or enter batch code</Text>
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
              Camera Scanner
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
              Manual Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Camera Scanner View */}
        {inputMode === 'camera' && (
          <View style={styles.cameraArea}>
            {!permission ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>Checking camera permissions...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-reverse-outline" size={48} color={colors.textMuted} />
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                  HoneyChain requires access to your camera to scan jar QR codes and verify origin records.
                </Text>
                <AppButton
                  title="Grant Camera Access"
                  variant="primary"
                  size="md"
                  onPress={requestPermission}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <View style={styles.scannerWrapper}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />

                {/* Viewfinder Overlay */}
                <View style={styles.overlay}>
                  <View style={styles.reticle}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <Text style={styles.reticleHint}>Align honey jar QR code within frame</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Manual Input Fallback */}
        {inputMode === 'manual' && (
          <View style={styles.manualArea}>
            <View style={styles.manualCard}>
              <Ionicons name="qr-code-outline" size={36} color={colors.primary} />
              <Text style={styles.manualTitle}>Enter Batch Identifier</Text>
              <Text style={styles.manualSub}>
                Type or paste the batch code printed on the honey jar label (e.g. HC-2026-4819).
              </Text>

              <TextInput
                style={styles.manualInput}
                placeholder="e.g. HC-2026-4819"
                placeholderTextColor={colors.textMuted}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <AppButton
                title="Verify Batch"
                variant="primary"
                size="lg"
                iconName="search-outline"
                disabled={!manualCode.trim()}
                onPress={handleManualSubmit}
                style={{ width: '100%', marginTop: spacing.md }}
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
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerBackBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    borderRadius: borderRadius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
  },
  modeTabText: {
    fontSize: typography.size.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.weight.medium,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  cameraArea: {
    flex: 1,
  },
  scannerWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reticle: {
    width: 250,
    height: 250,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  reticleHint: {
    marginTop: spacing.xl,
    fontSize: typography.size.sm,
    color: colors.surface,
    fontWeight: typography.weight.semibold,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  permissionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  permissionText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  manualArea: {
    flex: 1,
    padding: spacing.lg,
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  manualTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  manualSub: {
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  manualInput: {
    width: '100%',
    height: 50,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default QRScannerModal;
