import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompanyLogo } from '../../components/ui/CompanyLogo';
import { CartoonMascotCharacter } from '../../components/ui/CartoonMascotCharacter';
import { safeStorage } from '../../utils/safeStorage';
import { theme } from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideItem {
  id: string;
  characterType: 'super_agent' | 'tour_guide' | 'builder_boss' | 'rocket_champ';
  title: string;
  highlight: string;
  description: string;
  color: string;
}

const ONBOARDING_SLIDES: SlideItem[] = [
  {
    id: '1',
    characterType: 'super_agent',
    title: 'High-Conversion',
    highlight: 'Real Estate Leads',
    description:
      'Track property inquiries from Google Ads, Housing, and MagicBricks with one-tap Call & WhatsApp dialers.',
    color: '#34D399',
  },
  {
    id: '2',
    characterType: 'tour_guide',
    title: 'Seamless Property',
    highlight: 'Visit Scheduling',
    description:
      'Schedule buyer site visits, set automated follow-up reminders, and log meeting notes effortlessly.',
    color: '#FBBF24',
  },
  {
    id: '3',
    characterType: 'builder_boss',
    title: 'Real Estate Portfolio',
    highlight: '& Unit Bookings',
    description:
      'Manage project availability, floor plans, unit prices, and close bookings with digital deal tracking.',
    color: '#38BDF8',
  },
  {
    id: '4',
    characterType: 'rocket_champ',
    title: 'Data-Driven Sales',
    highlight: 'Conversion Funnels',
    description:
      'Monitor revenue targets, team performance, lead velocity, and closing rates in real time.',
    color: '#C084FC',
  },
];

export const OnboardingScreen = ({ navigation, onFinish }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Animated floating bubble movement
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY1 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  const translateY2 = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await safeStorage.setItem('@has_seen_onboarding', 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
    if (onFinish) {
      onFinish();
    } else if (navigation) {
      navigation.navigate('Login');
    }
  };

  const renderSlide = ({ item }: { item: SlideItem }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Sleek Cartoon Mascot Character */}
        <CartoonMascotCharacter type={item.characterType} />

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={[styles.slideHighlight, { color: item.color }]}>{item.highlight}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.darkGlassCanvas}>
      <StatusBar barStyle="light-content" backgroundColor="#0F101E" />

      {/* Animated Moving Floating Ambient Spheres */}
      <Animated.View
        style={[
          styles.ambientBubbleIndigo,
          { transform: [{ translateY: translateY1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ambientBubbleCyan,
          { transform: [{ translateY: translateY2 }] },
        ]}
      />

      {/* Top Header Nav Bar with Logo & Skip Button */}
      <View style={styles.topHeaderNav}>
        <CompanyLogo variant="white" height={36} />

        <TouchableOpacity style={styles.skipButtonGlass} onPress={finishOnboarding} activeOpacity={0.7}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
      />

      {/* Footer Controls & Glass Pagination */}
      <View style={styles.footerContainer}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {ONBOARDING_SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dotGlass,
                  isActive && styles.dotGlassActive,
                ]}
              />
            );
          })}
        </View>

        {/* Crisp Primary CTA Button (Pure White Card with Executive Navy Text & Arrow Icon) */}
        <TouchableOpacity
          style={styles.primaryCtaBtnMaster}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <View style={styles.btnContentRow}>
            <Text style={styles.btnTextMaster}>
              {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <View style={styles.btnArrowCircleMaster}>
              <Ionicons name="arrow-forward-sharp" size={16} color="#272944" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  darkGlassCanvas: {
    flex: 1,
    backgroundColor: '#0F101E',
  },
  ambientBubbleIndigo: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.28)',
  },
  ambientBubbleCyan: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(14, 165, 233, 0.28)',
  },
  topHeaderNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  skipButtonGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 28,
  },
  slideHighlight: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 26,
  },
  slideDescription: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dotGlass: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotGlassActive: {
    width: 26,
    backgroundColor: '#38BDF8',
  },
  primaryCtaBtnMaster: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnTextMaster: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#272944',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  btnArrowCircleMaster: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
