let SNSClient, CreatePlatformEndpointCommand, PublishCommand, SetEndpointAttributesCommand;
let snsClient = null;

try {
  const snsSdk = require('@aws-sdk/client-sns');
  SNSClient = snsSdk.SNSClient;
  CreatePlatformEndpointCommand = snsSdk.CreatePlatformEndpointCommand;
  PublishCommand = snsSdk.PublishCommand;
  SetEndpointAttributesCommand = snsSdk.SetEndpointAttributesCommand;

  const region = process.env.AWS_REGION || 'ap-south-1';
  snsClient = new SNSClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'MOCK_KEY',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'MOCK_SECRET'
    }
  });
} catch (e) {
  // Graceful fallback if @aws-sdk/client-sns is not installed
  snsClient = null;
}

const PLATFORM_APPLICATION_ARN_ANDROID = process.env.AWS_SNS_ARN_ANDROID || '';
const PLATFORM_APPLICATION_ARN_IOS = process.env.AWS_SNS_ARN_IOS || '';

/**
 * Registers a mobile push token with AWS SNS Platform Application and returns EndpointArn
 */
async function registerDevicePushToken({ token, platform = 'android', userId }) {
  if (!token || String(token).trim() === '') {
    return { success: false, error: 'Push token is required' };
  }

  const platformArn = platform === 'ios' 
    ? (PLATFORM_APPLICATION_ARN_IOS || PLATFORM_APPLICATION_ARN_ANDROID)
    : PLATFORM_APPLICATION_ARN_ANDROID;

  if (!platformArn) {
    console.warn(`[awsSnsService] AWS_SNS_ARN_${platform.toUpperCase()} not configured. Storing raw token for Expo/FCM push fallback.`);
    return { success: true, endpointArn: null, token };
  }

  try {
    const command = new CreatePlatformEndpointCommand({
      PlatformApplicationArn: platformArn,
      Token: token,
      CustomUserData: userId ? String(userId) : 'crm_sales_user'
    });
    const res = await snsClient.send(command);
    console.log(`[awsSnsService] Created AWS SNS EndpointArn: ${res.EndpointArn}`);
    return { success: true, endpointArn: res.EndpointArn, token };
  } catch (err) {
    console.error(`[awsSnsService] Error creating AWS SNS platform endpoint:`, err.message);
    return { success: false, error: err.message, token };
  }
}

/**
 * Sends a Push Notification via AWS SNS to an EndpointArn or Expo push fallback
 */
async function sendPushNotification({ endpointArn, token, title, message, data = {} }) {
  const payloadData = {
    title: title || '🎯 New CRM Alert',
    message: message || '',
    ...data
  };

  if (endpointArn) {
    try {
      const snsPayload = {
        default: message,
        GCM: JSON.stringify({
          notification: {
            title: title || '🎯 New CRM Alert',
            body: message || '',
            sound: 'default'
          },
          data: payloadData
        }),
        APNS: JSON.stringify({
          aps: {
            alert: {
              title: title || '🎯 New CRM Alert',
              body: message || ''
            },
            sound: 'default',
            'content-available': 1
          },
          data: payloadData
        })
      };

      const command = new PublishCommand({
        TargetArn: endpointArn,
        Message: JSON.stringify(snsPayload),
        MessageStructure: 'json'
      });

      const res = await snsClient.send(command);
      console.log(`[awsSnsService] AWS SNS Push notification published successfully (MessageId: ${res.MessageId})`);
      return { success: true, messageId: res.MessageId };
    } catch (err) {
      console.error(`[awsSnsService] AWS SNS Publish error for endpoint "${endpointArn}":`, err.message);
    }
  }

  // Fallback to Expo Push HTTP API if endpointArn is absent but raw token is available
  if (token) {
    try {
      const axios = require('axios');
      const expoRes = await axios.post('https://exp.host/--/api/v2/push/send', {
        to: token,
        sound: 'default',
        priority: 'high',
        title: title || '🎯 New CRM Alert',
        body: message || '',
        data: payloadData
      });
      console.log(`[awsSnsService] Expo push fallback dispatched successfully to token.`);
      return { success: true, expo: expoRes.data };
    } catch (eErr) {
      console.error(`[awsSnsService] Expo push fallback dispatch failed:`, eErr.message);
    }
  }

  return { success: false, error: 'No valid AWS SNS endpoint or push token' };
}

module.exports = {
  registerDevicePushToken,
  sendPushNotification
};
