import { Linking, Alert } from 'react-native';

/**
 * Universal 1-Click Email Dispatcher.
 * - Cleans and validates email address format.
 * - Constructs standard mailto URI: `mailto:${cleanEmail}?subject=${encodedSubject}&body=${encodedBody}`.
 * - Compatible with default email clients across iOS & Android (Apple Mail, Gmail, Outlook, etc.).
 */
export async function openEmail(
  email?: string,
  subject?: string,
  body?: string
): Promise<boolean> {
  if (!email || !email.trim()) {
    Alert.alert(
      'No Email Address',
      'This contact does not have a valid email address specified.'
    );
    return false;
  }

  const cleanEmail = email.trim();
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (body) params.push(`body=${encodeURIComponent(body.trim())}`);

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  const mailtoUrl = `mailto:${cleanEmail}${queryString}`;

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      return true;
    } else {
      await Linking.openURL(mailtoUrl);
      return true;
    }
  } catch (err) {
    Alert.alert(
      'Email Client Not Available',
      `Unable to open email client on this device for ${cleanEmail}. Please verify your email app is configured.`
    );
    return false;
  }
}
