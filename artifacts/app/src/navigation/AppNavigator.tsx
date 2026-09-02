import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { safeStorage } from '../utils/safeStorage';
import { theme } from '../theme/theme';
import { CompanyLogo } from '../components/ui/CompanyLogo';
import { getIndustrySemantics } from '../utils/industryLabels';

// Screens
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { LeadsListScreen } from '../screens/leads/LeadsListScreen';
import { LeadDetailScreen } from '../screens/leads/LeadDetailScreen';
import { LeadFormScreen } from '../screens/leads/LeadFormScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { TaskFormScreen } from '../screens/tasks/TaskFormScreen';
import { CallLogsScreen } from '../screens/callLogs/CallLogsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { ProjectsScreen } from '../screens/projects/ProjectsScreen';
import { IntegrationsScreen } from '../screens/integrations/IntegrationsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { MenuScreen } from '../screens/menu/MenuScreen';

type ScreenName =
  | 'Onboarding'
  | 'Dashboard'
  | 'Leads'
  | 'LeadDetail'
  | 'LeadForm'
  | 'Tasks'
  | 'TaskForm'
  | 'CallLogs'
  | 'Profile'
  | 'Analytics'
  | 'Projects'
  | 'Integrations'
  | 'Notifications'
  | 'Settings'
  | 'Menu'
  | 'Login'
  | 'Signup';

export const AppNavigator = () => {
  const { token, user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.select({ ios: 16, android: 12, default: 8 }));

  // Navigation stack & route state
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Dashboard');
  const [authScreen, setAuthScreen] = useState<'Onboarding' | 'Login' | 'Signup' | 'ForgotPassword' | 'ResetPassword'>('Login');
  const [routeParams, setRouteParams] = useState<any>({});
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const val = await safeStorage.getItem('@has_seen_onboarding');
        if (!val) {
          setAuthScreen('Onboarding');
          setHasSeenOnboarding(false);
        } else {
          setHasSeenOnboarding(true);
        }
      } catch (e) {
        setHasSeenOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />
        <CompanyLogo variant="white" height={44} />
        <ActivityIndicator color="#60A5FA" size="small" style={{ marginTop: 24 }} />
        <Text style={styles.loadingSubtext}>POWERING CRM ENGINE...</Text>
      </View>
    );
  }

  // If not logged in, render Auth / Onboarding Stack
  if (!token) {
    const authNav = {
      navigate: (
        screen: 'Onboarding' | 'Login' | 'Signup' | 'ForgotPassword' | 'ResetPassword',
        params?: any
      ) => {
        if (params) setRouteParams(params);
        setAuthScreen(screen);
      },
    };

    const handleFinishOnboarding = () => {
      setHasSeenOnboarding(true);
      setAuthScreen('Login');
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1C30" />
        {authScreen === 'Onboarding' ? (
          <OnboardingScreen navigation={authNav} onFinish={handleFinishOnboarding} />
        ) : authScreen === 'Login' ? (
          <LoginScreen navigation={authNav} />
        ) : authScreen === 'Signup' ? (
          <SignupScreen navigation={authNav} />
        ) : authScreen === 'ForgotPassword' ? (
          <ForgotPasswordScreen navigation={authNav} route={{ params: routeParams }} />
        ) : (
          <ResetPasswordScreen navigation={authNav} route={{ params: routeParams }} />
        )}
      </SafeAreaView>
    );
  }

  // Main Navigation Handler
  const navigation = {
    navigate: (
      screen:
        | ScreenName
        | 'DashboardTab'
        | 'LeadsTab'
        | 'TasksTab'
        | 'AnalyticsTab'
        | 'MenuTab'
        | 'CallLogsTab'
        | 'ProfileTab',
      params?: any
    ) => {
      let target = screen as ScreenName;
      if (screen === 'DashboardTab') target = 'Dashboard';
      if (screen === 'LeadsTab') target = 'Leads';
      if (screen === 'TasksTab') target = 'Tasks';
      if (screen === 'AnalyticsTab') target = 'Analytics';
      if (screen === 'MenuTab') target = 'Menu';
      if (screen === 'CallLogsTab') target = 'CallLogs';
      if (screen === 'ProfileTab') target = 'Profile';

      setRouteParams(params || {});
      setCurrentScreen(target);
    },
    goBack: () => {
      if (currentScreen === 'LeadDetail' || currentScreen === 'LeadForm') {
        setCurrentScreen('Leads');
      } else if (currentScreen === 'TaskForm') {
        setCurrentScreen('Tasks');
      } else if (
        currentScreen === 'CallLogs' ||
        currentScreen === 'Projects' ||
        currentScreen === 'Integrations' ||
        currentScreen === 'Notifications' ||
        currentScreen === 'Settings' ||
        currentScreen === 'Profile'
      ) {
        setCurrentScreen('Menu');
      } else {
        setCurrentScreen('Dashboard');
      }
    },
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardScreen navigation={navigation} />;
      case 'Leads':
        return <LeadsListScreen navigation={navigation} />;
      case 'LeadDetail':
        return <LeadDetailScreen route={{ params: routeParams }} navigation={navigation} />;
      case 'LeadForm':
        return <LeadFormScreen route={{ params: routeParams }} navigation={navigation} />;
      case 'Tasks':
        return <TasksScreen navigation={navigation} />;
      case 'TaskForm':
        return <TaskFormScreen route={{ params: routeParams }} navigation={navigation} />;
      case 'CallLogs':
        return <CallLogsScreen />;
      case 'Analytics':
        return <AnalyticsScreen />;
      case 'Projects':
        return <ProjectsScreen />;
      case 'Integrations':
        return <IntegrationsScreen />;
      case 'Notifications':
        return <NotificationsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      case 'Menu':
        return <MenuScreen navigation={navigation} />;
      default:
        return <DashboardScreen navigation={navigation} />;
    }
  };

  const isTabActive = (tabName: ScreenName) => {
    if (tabName === 'Leads' && (currentScreen === 'Leads' || currentScreen === 'LeadDetail' || currentScreen === 'LeadForm')) return true;
    if (tabName === 'Tasks' && (currentScreen === 'Tasks' || currentScreen === 'TaskForm')) return true;
    if (tabName === 'Menu' && (currentScreen === 'Menu' || currentScreen === 'CallLogs' || currentScreen === 'Projects' || currentScreen === 'Integrations' || currentScreen === 'Notifications' || currentScreen === 'Settings' || currentScreen === 'Profile')) return true;
    return currentScreen === tabName;
  };

  const hideTabBar = currentScreen === 'LeadForm' || currentScreen === 'TaskForm' || currentScreen === 'LeadDetail';

  const semantics = getIndustrySemantics(user?.industryId);

  const tabs: { name: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    { name: 'Leads', label: semantics.leadEntityPlural, icon: 'people-outline', iconActive: 'people' },
    { name: 'Tasks', label: semantics.taskEntityPlural, icon: 'checkbox-outline', iconActive: 'checkbox' },
    { name: 'Analytics', label: 'Analytics', icon: 'trending-up-outline', iconActive: 'trending-up' },
    { name: 'Menu', label: 'Menu', icon: 'menu-outline', iconActive: 'menu' },
  ];

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#272944" />

      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* High-Legibility Executive 3D Bottom Navigation Dock */}
      {!hideTabBar && (
        <View style={[styles.tabBarDock, { paddingBottom: bottomInset }]}>
          {tabs.map((tab) => {
            const active = isTabActive(tab.name);
            return (
              <TouchableOpacity
                key={tab.name}
                activeOpacity={0.8}
                style={styles.tabItem}
                onPress={() => navigation.navigate(tab.name)}
              >
                <View style={[styles.iconPill3D, active && styles.iconPill3DActive]}>
                  <Ionicons
                    name={active ? tab.iconActive : tab.icon}
                    size={21}
                    color={active ? '#FFFFFF' : '#64748B'}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabelText, active && styles.tabLabelTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1C30',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#272944',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1C30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: 12,
  },
  tabBarDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 16,
    flexShrink: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconPill3D: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  iconPill3DActive: {
    backgroundColor: theme.colors.brand700,
    shadowColor: theme.colors.brand700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tabLabelTextActive: {
    color: theme.colors.brand700,
    fontWeight: '600',
  },
});
