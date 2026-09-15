const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

let serviceAccount = null;
let cachedAccessToken = null;
let tokenExpiresAt = 0;

// Resolve Service Account JSON from config or environment variable
try {
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = path.join(__dirname, '../../config/lead-rubix-crm-firebase-adminsdk.json');
  const targetPath = customPath || defaultPath;

  if (fs.existsSync(targetPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    console.log(`[FirebaseNotificationService] Loaded service account for project: ${serviceAccount.project_id}`);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log(`[FirebaseNotificationService] Loaded service account from environment JSON: ${serviceAccount.project_id}`);
  } else {
    console.warn('[FirebaseNotificationService] No Firebase service account file found. Push will use fallback delivery.');
  }
} catch (e) {
  console.error('[FirebaseNotificationService] Error loading Firebase service account:', e.message);
  serviceAccount = null;
}

/**
 * Generates an RSA-SHA256 signed Google OAuth2 JWT for Firebase Messaging scope
 */
function createSignedJwt() {
  if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Incomplete Firebase service account credentials');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaimSet = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Retrieves a valid Google OAuth2 Bearer Access Token (with in-memory caching and auto-renewal)
 */
async function getAccessToken() {
  const nowMs = Date.now();
  // Return cached token if valid for at least 5 more minutes
  if (cachedAccessToken && tokenExpiresAt - nowMs > 300000) {
    return cachedAccessToken;
  }

  const signedJwt = createSignedJwt();
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    }
  );

  if (response.data && response.data.access_token) {
    cachedAccessToken = response.data.access_token;
    tokenExpiresAt = nowMs + (response.data.expires_in || 3600) * 1000;
    return cachedAccessToken;
  }

  throw new Error('Failed to acquire Google OAuth2 access token for Firebase FCM');
}

/**
 * Sends a high-priority push notification directly via Google FCM HTTP v1
 * Supports Android Heads-Up Notifications, Sound, Vibration, and iOS APNs Alerts
 */
async function sendDirectPushNotification({ token, title, message, data = {} }) {
  if (!token || String(token).trim() === '') {
    return { success: false, error: 'Push token is required' };
  }

  if (String(token).startsWith('sim_device_')) {
    return { success: false, error: 'Simulator tokens cannot receive push notifications', isSimulator: true };
  }

  if (!serviceAccount) {
    return { success: false, error: 'Firebase service account not configured' };
  }

  // Google FCM strictly requires all data dictionary values to be strings
  const sanitizedData = {};
  for (const [key, val] of Object.entries(data || {})) {
    if (val === null || val === undefined) {
      sanitizedData[key] = '';
    } else if (typeof val === 'object') {
      try {
        sanitizedData[key] = JSON.stringify(val);
      } catch (e) {
        sanitizedData[key] = String(val);
      }
    } else {
      sanitizedData[key] = String(val);
    }
  }

  try {
    const accessToken = await getAccessToken();
    const projectId = serviceAccount.project_id;
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const fcmPayload = {
      message: {
        token,
        notification: {
          title: title || '🎯 New CRM Alert',
          body: message || ''
        },
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'default',
            sound: 'default',
            default_vibrate_timings: true,
            notification_priority: 'PRIORITY_MAX',
            visibility: 'PUBLIC'
          }
        },
        apns: {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              alert: {
                title: title || '🎯 New CRM Alert',
                body: message || ''
              },
              sound: 'default',
              badge: 1,
              'content-available': 1
            }
          }
        },
        data: sanitizedData
      }
    };

    const res = await axios.post(fcmEndpoint, fcmPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`[FirebaseNotificationService] FCM Push sent successfully! Message Name: ${res.data?.name}`);
    return {
      success: true,
      provider: 'firebase_fcm_v1',
      messageId: res.data?.name
    };
  } catch (err) {
    const errorDetails = err.response?.data?.error || err.message;
    console.error('[FirebaseNotificationService] FCM Push dispatch failed:', JSON.stringify(errorDetails));

    const errorCode = err.response?.data?.error?.status || err.response?.data?.error?.code || '';
    const isUnregistered = errorCode === 'NOT_FOUND' || String(JSON.stringify(errorDetails)).includes('UNREGISTERED');

    return {
      success: false,
      provider: 'firebase_fcm_v1',
      error: typeof errorDetails === 'string' ? errorDetails : (errorDetails.message || 'FCM dispatch error'),
      isUnregistered
    };
  }
}

module.exports = {
  sendDirectPushNotification,
  getAccessToken,
  isConfigured: () => Boolean(serviceAccount)
};
