import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 2000,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation: Smooth Fade-in, gentle Spring Scale, and Badge reveal
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(badgeAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: minDurationMs - 400,
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Auto-dismiss after minDurationMs with smooth fade out
    const timer = setTimeout(() => {
      if (onFinish) {
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
  }, [fadeAnim, scaleAnim, badgeAnim, progressAnim, onFinish, minDurationMs]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151728" translucent={false} />

      {/* Atmospheric Executive Radial Glows (Subtle, no sharp circular ridges) */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* Center Branding Hero */}
      <Animated.View
        style={[
          styles.brandBlock,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Authentic Leads Rubix Brand Emblem Card */}
        <View style={styles.logoCardOuter}>
          <View style={styles.logoCardInner}>
            <Image
              source={require('../../../assets/android-icon-foreground.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.logoGlowHalo} />
        </View>

        {/* Brand Title */}
        <Text style={styles.brandTitle}>LEADS RUBIX</Text>

        {/* Executive Sector Status Pill */}
        <View style={styles.statusBadgePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusBadgeText}>ENTERPRISE MULTI-TENANT CRM</Text>
        </View>

        {/* Sync / Boot Progress Bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
      </Animated.View>

      {/* Bottom Footer: Trust & Version */}
      <Animated.View style={[styles.footerBlock, { opacity: badgeAnim }]}>
        <View style={styles.securityPill}>
          <Ionicons name="shield-checkmark" size={13} color="#10B981" />
          <Text style={styles.securityPillText}>256-Bit SSL Encrypted • Real-time Cloud Sync</Text>
        </View>
        <Text style={styles.versionText}>v1.0.0 • Enterprise Edition</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151728',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCardOuter: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoCardInner: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: '#1E1F38',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 66,
    height: 66,
  },
  logoGlowHalo: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3.8,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  greenPulseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 1.5,
  },
  progressBarTrack: {
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  footerBlock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    gap: 7,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  securityPillText: {
    fontSize: 10.5,
    color: '#CBD5E1',
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
