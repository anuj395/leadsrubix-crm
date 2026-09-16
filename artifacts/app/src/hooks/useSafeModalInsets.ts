import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Universal safe insets hook for modals, bottom sheets, and screen headers.
 * Correctly computes physical display clearance for Android 3-button navigation,
 * Android gesture bars, iOS Dynamic Island, notches, and compact displays.
 */
export function useSafeModalInsets() {
  const insets = useSafeAreaInsets();

  // Physical bottom inset (e.g. 48dp on 3-button Android, 34pt on notched iOS, 16-24dp on gesture Android)
  // Defensive fallback: if Android reports 0 (e.g. custom ROM/translucent bar), provide 16dp baseline
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 16 : 0);
  const baseBottom = Platform.select({ ios: 28, android: 24, default: 20 });

  // sheetBottomPadding ensures bottom action buttons (Submit, Cancel) float safely above navigation bars
  // On 3-button Android (48dp): 48 + 14 = 62dp (clean clearance)
  // On gesture Android (16dp): 16 + 14 = 30dp
  // On iPhone Dynamic Island / Notch (34pt): 34 + 14 = 48pt
  const sheetBottomPadding = bottomInset > 0 ? bottomInset + 14 : baseBottom + 8;

  // Header safe top clearance adapts dynamically to Dynamic Island (59pt), notches (44pt), and punch-holes (24-48dp)
  const topInset = insets.top > 0 ? insets.top : Platform.select({ ios: 44, android: 24, default: 24 });
  const headerPaddingTop = topInset + 8;

  return {
    insets,
    bottomInset,
    sheetBottomPadding,
    topInset,
    headerPaddingTop,
  };
}
