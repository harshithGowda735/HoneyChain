import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { spacing, borderRadius, typography } from '../../constants/layout';

const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'honeychain-fa9c9.firebaseapp.com';
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

export function FirebaseRecaptchaModal({ visible, onClose, onSuccess, onError }) {
  const [loading, setLoading] = React.useState(true);

  // HTML page that hosts Google reCAPTCHA
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <script src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit" async defer></script>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 20px;
            background-color: #F9F6F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .title {
            font-size: 16px;
            font-weight: 600;
            color: #1B4332;
            margin-bottom: 20px;
            text-align: center;
          }
          #recaptcha-widget {
            display: flex;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <div class="title">Security Verification</div>
        <div id="recaptcha-widget"></div>

        <script>
          function onloadCallback() {
            try {
              window.grecaptcha.render('recaptcha-widget', {
                'sitekey': '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Google standard test key or project key
                'callback': function(token) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', token: token }));
                },
                'expired-callback': function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
                },
                'error-callback': function(err) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'reCAPTCHA verification failed' }));
                }
              });
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
            }
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success' && data.token) {
        onSuccess(data.token);
      } else if (data.type === 'expired') {
        onError && onError(new Error('Verification token expired. Please try again.'));
      } else if (data.type === 'error') {
        onError && onError(new Error(data.message || 'Verification challenge failed.'));
      }
    } catch (e) {
      onError && onError(e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Security Check</Text>
              <Text style={styles.headerSub}>Verify you are a real beekeeper</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.webviewContainer}>
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading verification...</Text>
              </View>
            )}
            <WebView
              originWhitelist={['*']}
              source={{
                html: htmlContent,
                baseUrl: `https://${FIREBASE_AUTH_DOMAIN}`,
              }}
              onMessage={handleMessage}
              onLoadEnd={() => setLoading(false)}
              style={styles.webview}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    height: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceSubtle,
  },
  headerTitle: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
});

export default FirebaseRecaptchaModal;
