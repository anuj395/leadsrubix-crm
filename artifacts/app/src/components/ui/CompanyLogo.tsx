import React from 'react';
import { Image, StyleSheet, View, ImageStyle, StyleProp } from 'react-native';

interface CompanyLogoProps {
  variant?: 'dark' | 'white';
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  variant = 'dark',
  height = 36,
  style,
}) => {
  const logoSource =
    variant === 'white'
      ? require('../../../assets/companylogo_white.png')
      : require('../../../assets/companylogo_dark.png');

  // Aspect ratio for Leads Rubix company logo (exact 3.88:1)
  const width = height * 3.88;

  return (
    <View style={styles.wrapper}>
      <Image
        source={logoSource}
        style={[{ height, width, maxWidth: 260 }, style]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
