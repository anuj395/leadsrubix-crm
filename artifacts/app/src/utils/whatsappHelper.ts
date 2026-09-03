import { Linking, Alert } from 'react-native';

/**
 * Normalizes phone numbers for WhatsApp.
 * - Strips all non-numeric characters.
 * - If 10 digits (standard mobile number), prepends '91' (default India country code).
 * - Leaves international numbers (11+ digits) intact.
 */
export function normalizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';

  // If 10 digits, default to Indian country code 91
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  return digitsOnly;
}

/**
 * Universal 1-Click WhatsApp Dispatcher.
 * Tries native WhatsApp protocol first, with automatic fallback to Universal Web Link (wa.me).
 * Compatible with standard WhatsApp, WhatsApp Business, iOS & Android.
 */
export async function openWhatsApp(phone?: string, message?: string): Promise<boolean> {
  const cleanPhone = normalizePhoneForWhatsApp(phone);

  if (!cleanPhone || cleanPhone.length < 7) {
    Alert.alert(
      'Invalid Phone Number',
      'This contact does not have a valid phone number for WhatsApp messaging.'
    );
    return false;
  }

  const encodedText = message ? encodeURIComponent(message.trim()) : '';
  const nativeUrl = `whatsapp://send?phone=${cleanPhone}${encodedText ? `&text=${encodedText}` : ''}`;
  const webFallbackUrl = `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webFallbackUrl);
      return true;
    }
  } catch (_err) {
    // Attempt web fallback as last resort
    try {
      await Linking.openURL(webFallbackUrl);
      return true;
    } catch (_fallbackErr) {
      Alert.alert(
        'WhatsApp Not Available',
        'Unable to open WhatsApp. Please check if WhatsApp is installed or verify your network connection.'
      );
      return false;
    }
  }
}
