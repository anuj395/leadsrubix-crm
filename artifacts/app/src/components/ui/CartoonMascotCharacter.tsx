import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CartoonCharacterProps {
  type: 'super_agent' | 'tour_guide' | 'builder_boss' | 'rocket_champ';
}

export const CartoonMascotCharacter: React.FC<CartoonCharacterProps> = ({ type }) => {
  const getCharacterDetails = () => {
    switch (type) {
      case 'super_agent':
        return {
          emoji: '🦸‍♂️',
          badge: 'SUPER AGENT RUBIX',
          quote: 'Super-fast lead dialer mode activated! No buyer lead escapes my sight!',
          icon: 'flash-sharp' as const,
          accentColor: '#34D399',
          glowBg: 'rgba(52, 211, 153, 0.25)',
        };
      case 'tour_guide':
        return {
          emoji: '🏎️',
          badge: 'PROPERTY TOUR GUIDE',
          quote: "Vroom vroom! Today's luxury site visit tour is ready! Buckle up, buyers!",
          icon: 'car-sport-sharp' as const,
          accentColor: '#FBBF24',
          glowBg: 'rgba(251, 191, 36, 0.25)',
        };
      case 'builder_boss':
        return {
          emoji: '🏰',
          badge: 'BUILDER BOSS RUBIX',
          quote: 'Building deals brick by brick! Luxury penthouses sold out in 3, 2, 1!',
          icon: 'business-sharp' as const,
          accentColor: '#38BDF8',
          glowBg: 'rgba(56, 189, 248, 0.25)',
        };
      case 'rocket_champ':
        return {
          emoji: '🚀',
          badge: 'SALES ROCKET CHAMPION',
          quote: 'To the moon! Our sales conversion graph just broke the ceiling!',
          icon: 'rocket-sharp' as const,
          accentColor: '#C084FC',
          glowBg: 'rgba(192, 132, 252, 0.25)',
        };
    }
  };

  const info = getCharacterDetails();

  return (
    <View style={styles.container}>
      {/* 3D Mascot Character Sphere */}
      <View style={[styles.outerGlowRing, { backgroundColor: info.glowBg }]}>
        <View style={styles.innerGlassSphere}>
          <Text style={styles.emojiDisplay}>{info.emoji}</Text>
          <View style={[styles.miniBadgeIcon, { backgroundColor: info.accentColor }]}>
            <Ionicons name={info.icon} size={14} color="#0F101E" />
          </View>
        </View>
      </View>

      {/* Frosted Glass Speech Bubble */}
      <View style={styles.frostedSpeechCard}>
        <View style={styles.badgeHeaderRow}>
          <View style={[styles.pulseDot, { backgroundColor: info.accentColor }]} />
          <Text style={[styles.badgeText, { color: info.accentColor }]}>{info.badge}</Text>
        </View>
        <Text style={styles.quoteText}>"{info.quote}"</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  outerGlowRing: {
    padding: 8,
    borderRadius: 60,
    marginBottom: 16,
  },
  innerGlassSphere: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  emojiDisplay: {
    fontSize: 46,
  },
  miniBadgeIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  frostedSpeechCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
