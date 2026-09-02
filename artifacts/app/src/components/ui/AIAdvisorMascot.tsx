import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface MascotProps {
  message?: string;
  screenName?: string;
  avatarStyle?: object;
}

export const AIAdvisorMascot: React.FC<MascotProps> = () => {
  return null;
};

export const _AIAdvisorMascotDisabled: React.FC<MascotProps> = ({
  message,
  screenName = 'Dashboard',
}) => {
  const [minimized, setMinimized] = useState(false);

  // Floating animation for mascot avatar
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const getMascotDetails = () => {
    switch (screenName) {
      case 'Onboarding':
        return {
          emoji: '🦸‍♂️',
          title: 'RUBIX AI ADVISOR',
          defaultMsg: "Hi! I'm Rubix AI. Let me show you how to close 3x more property deals!",
          accentColor: '#059669',
        };
      case 'Login':
        return {
          emoji: '🦸‍♂️',
          title: 'RUBIX AI ADVISOR',
          defaultMsg: 'Welcome! Sign in to access your sales workspace & site visits.',
          accentColor: '#059669',
        };
      case 'Dashboard':
        return {
          emoji: '🦸‍♂️',
          title: 'RUBIX AI ADVISOR',
          defaultMsg: 'Great day! You have 3 site visits today. Contact fresh leads within 5 mins for 80% conversion!',
          accentColor: '#059669',
        };
      case 'Leads':
        return {
          emoji: '🏎️',
          title: 'LEAD SPEED ASSISTANT',
          defaultMsg: 'Tip: Filter by "Fresh Inquiries" and tap WhatsApp to send instant project brochures!',
          accentColor: '#D97706',
        };
      case 'Projects':
        return {
          emoji: '🏗️',
          title: 'BUILDER BOSS AI',
          defaultMsg: 'Grand Horizon Towers has 4 luxury penthouses ready for instant buyer booking!',
          accentColor: '#0284C7',
        };
      case 'Analytics':
        return {
          emoji: '🚀',
          title: 'SALES ROCKET AI',
          defaultMsg: 'Awesome momentum! Sales conversion funnel is up +18% this month!',
          accentColor: '#7C3AED',
        };
      case 'Menu':
        return {
          emoji: '🦸‍♂️',
          title: 'WORKSPACE AI ADVISOR',
          defaultMsg: 'All CRM modules & webhooks synced live with your sales workspace!',
          accentColor: theme.colors.brand700,
        };
      default:
        return {
          emoji: '🦸‍♂️',
          title: 'RUBIX AI ADVISOR',
          defaultMsg: 'Rubix AI Assistant is active and tracking your property pipeline!',
          accentColor: theme.colors.brand700,
        };
    }
  };

  const details = getMascotDetails();
  const displayMsg = message || details.defaultMsg;

  if (minimized) {
    return (
      <TouchableOpacity
        style={styles.minimizedBarFullWidth}
        onPress={() => setMinimized(false)}
        activeOpacity={0.88}
      >
        <View style={styles.minimizedLeftGroup}>
          <View style={[styles.pulseGlowDot, { backgroundColor: details.accentColor }]} />
          <Text style={styles.minimizedEmoji}>{details.emoji}</Text>
          <Text style={styles.minimizedTitleText}>Rubix AI Advisor</Text>
        </View>

        <View style={styles.minimizedRightHint}>
          <Text style={styles.minimizedHintText}>Tap for sales tip</Text>
          <Ionicons name="chevron-down-sharp" size={14} color="#64748B" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.fullWidthCardContainer}>
      {/* Full-Width 3D Luminous Glass Speech Bubble Card */}
      <View style={styles.speechBubble3D}>
        <View style={styles.bubbleHeaderRow}>
          <View style={styles.badgeTagGroup}>
            <View style={[styles.pulseGlowDot, { backgroundColor: details.accentColor }]} />
            <Text style={[styles.badgeTagText, { color: details.accentColor }]}>{details.title}</Text>
          </View>

          <TouchableOpacity onPress={() => setMinimized(true)} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close-sharp" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.bubbleBodyRow}>
          <Text style={styles.messageText}>{displayMsg}</Text>

          {/* Floating Animated Cartoon Mascot Avatar */}
          <Animated.View style={[{ transform: [{ translateY }] }]}>
            <TouchableOpacity
              style={styles.characterAvatar3D}
              onPress={() => setMinimized(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.avatarEmoji}>{details.emoji}</Text>
              <View style={styles.activeOnlineDot} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullWidthCardContainer: {
    width: '100%',
    marginVertical: 10,
  },
  speechBubble3D: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  badgeTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  bubbleBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  characterAvatar3D: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  activeOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  minimizedBarFullWidth: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  minimizedLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizedEmoji: {
    fontSize: 16,
  },
  minimizedTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  minimizedRightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  minimizedHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
