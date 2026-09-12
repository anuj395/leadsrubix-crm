import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Smooth Fade-in and gentle Scale-up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(badgeAnim, {
        toValue: 1,
        duration: 900,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Minimum display duration before auto-navigating
    const timer = setTimeout(() => {
      if (onFinish) {
        // Subtle exit fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, badgeAnim, onFinish, minDurationMs]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#272944" translucent={false} />

      {/* Decorative ambient background rings */}
      <View style={styles.ambientGlowRing1} />
      <View style={styles.ambientGlowRing2} />

      {/* Center Branding Block */}
      <Animated.View
        style={[
          styles.brandBlock,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Modern Brand Logo Icon Emblem */}
        <View style={styles.logoBadgeContainer}>
          <View style={styles.logoBadgeInner}>
            <Ionicons name="cube" size={44} color="#FFFFFF" />
          </View>
          <View style={styles.badgePulseGlow} />
        </View>

        {/* Brand Title */}
        <Text style={styles.brandTitle}>LEADS RUBIX</Text>

        {/* Accent Divider */}
        <View style={styles.accentDividerRow}>
          <View style={styles.accentLine} />
          <View style={styles.accentDiamond} />
          <View style={styles.accentLine} />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>ENTERPRISE MULTI-TENANT CRM</Text>
      </Animated.View>

      {/* Bottom Footer Trust & Version Badges */}
      <Animated.View style={[styles.footerBlock, { opacity: badgeAnim }]}>
        <View style={styles.securityPill}>
          <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
          <Text style={styles.securityPillText}>256-Bit Encrypted • Real-time Cloud Sync</Text>
        </View>
        <Text style={styles.versionText}>v1.0.0 • Enterprise Edition</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#272944',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ambientGlowRing1: {
    position: 'absolute',
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
  },
  ambientGlowRing2: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBadgeInner: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePulseGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  accentDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  accentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
  },
  accentDiamond: {
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#38BDF8',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  footerBlock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    gap: 8,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  securityPillText: {
    fontSize: 10.5,
    color: '#E2E8F0',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  versionText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});
