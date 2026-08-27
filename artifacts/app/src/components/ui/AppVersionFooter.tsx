import React from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { APP_CONFIG } from '../../constants/appConstants';

interface AppVersionFooterProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppVersionFooter: React.FC<AppVersionFooterProps> = ({ style, textStyle }) => {
  return (
    <View style={[styles.bottomFooterInfo, style]}>
      <Text style={[styles.bottomFooterText, textStyle]}>
        {APP_CONFIG.footerVersionText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomFooterInfo: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  bottomFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
