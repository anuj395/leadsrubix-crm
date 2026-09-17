# Leads Rubix CRM — Mobile App Store & Google Play Deployment Runbook

This guide provides an end-to-end, production-verified runbook for building and submitting the **Leads Rubix CRM** mobile application (`com.leadsrubix.crm`) to the **Apple App Store** (iOS) and **Google Play Store** (Android) using **Expo Application Services (EAS)**.

---

## 1. Prerequisites & Developer Accounts

### A. Apple Developer Program
- **Account Type**: Organization / Company (recommended for enterprise CRM) or Individual.
- **Cost**: \$99 USD / year.
- **Required Roles**: Admin or Account Holder.
- **App Store Connect Setup**:
  1. Log in to [App Store Connect](https://appstoreconnect.apple.com).
  2. Navigate to **Apps** ➔ Click **(+) New App**.
  3. Enter the following details:
     - **Platforms**: iOS
     - **Name**: `Leads Rubix CRM`
     - **Primary Language**: English (US)
     - **Bundle ID**: `com.leadsrubix.crm`
     - **SKU**: `LEADSRUBIX-IOS-01`
     - **User Access**: Full Access
  4. Note the generated **Apple ID / App ID** (`ascAppId`): `6805854225` (pre-configured in `eas.json`).
  5. Note your **Team ID** (`appleTeamId`): `8Q85MSNAX9` (found in Apple Developer ➔ Membership).

### B. Google Play Console
- **Account Type**: Organization or Individual.
- **Cost**: \$25 USD one-time registration fee.
- **Required Tasks**:
  1. Complete Google Identity Verification & D-U-N-S check.
  2. Log in to [Google Play Console](https://play.google.com/console).
  3. Click **Create App**:
     - **App Name**: `Leads Rubix CRM`
     - **Default Language**: English (United States)
     - **App or Game**: App
     - **Free or Paid**: Free (B2B SaaS model)
  4. Accept Developer Program Policies and US Export Laws.

### C. Expo & EAS CLI Setup
Ensure EAS CLI is installed and authenticated:
```bash
npm install -g eas-cli
eas login
```
Verify authentication:
```bash
eas whoami
```

---

## 2. Configuration & Profiles Breakdown

The project's build and submit profiles are defined in `artifacts/app/eas.json`:

```json
{
  "cli": {
    "version": ">= 14.0.0",
    "appVersionSource": "remote",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "pnpm": "9.15.9",
      "node": "20.19.5",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "pnpm": "9.15.9",
      "node": "20.19.5",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api1.leadsrubix.com/api"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      },
      "ios": {
        "appleId": "info@leadsrubix.com",
        "ascAppId": "6805854225",
        "appleTeamId": "8Q85MSNAX9"
      }
    }
  }
}
```

---

## 3. Signing Credentials & Certificates

EAS handles certificates and provisioning automatically via Expo's secure cloud keystore.

### iOS Signing (Distribution Certificate & Provisioning Profile)
Run from `artifacts/app`:
```bash
eas credentials -p ios
```
1. Select **Production** profile.
2. Choose **"Log in to your Apple account"** or let EAS generate:
   - **Distribution Certificate**: EAS creates and securely signs with Apple.
   - **Provisioning Profile**: EAS binds `com.leadsrubix.crm` with App Store Distribution entitlement.
   - **Push Notification Key (`.p8`)**: Configured if APNs push notifications are enabled.

### Android Signing (Google Play App Signing Keystore)
Run from `artifacts/app`:
```bash
eas credentials -p android
```
1. Select **Production** profile.
2. Select **"Generate a new Android Keystore"** (or import your existing `.jks`/keystore).
3. EAS securely stores the SHA-256 fingerprint and upload key.

---

## 4. Building Production Binaries

### Option A: Cloud EAS Build (Recommended for Guaranteed Reproducibility)

#### 1. Build Android Production App Bundle (`.aab` for Google Play)
```bash
cd artifacts/app
eas build --platform android --profile production
```
*Output*: A signed Android App Bundle (`.aab`) optimized with Google Play dynamic delivery and ProGuard shrinking.

#### 2. Build iOS Production IPA (`.ipa` for App Store Connect)
```bash
cd artifacts/app
eas build --platform ios --profile production
```
*Output*: A signed App Store Archive (`.ipa`) ready for TestFlight and App Store submission.

#### 3. Build Both Simultaneously
```bash
cd artifacts/app
eas build --platform all --profile production
```

---

### Option B: Local EAS Build (On Local macOS Machine)
If you prefer building locally without consuming EAS cloud concurrency credits:
```bash
# For Android APK (Testing):
eas build -p android -e preview --local

# For Android Production AAB:
eas build -p android -e production --local

# For iOS Production IPA (Requires macOS & Xcode):
eas build -p ios -e production --local
```

---

## 5. Submitting to Stores

### A. Submitting to Apple App Store (TestFlight & App Store)

#### Step 1: Push Build to App Store Connect
```bash
cd artifacts/app
eas submit -p ios --profile production
```
Or build and submit automatically in a single command:
```bash
eas build -p ios --profile production --auto-submit
```

#### Step 2: TestFlight Internal Testing
1. Once uploaded, open [App Store Connect](https://appstoreconnect.apple.com) ➔ **Apps** ➔ **Leads Rubix CRM** ➔ **TestFlight**.
2. Wait 5-10 minutes for Apple to finish processing the build.
3. If prompted for **Missing Compliance (Encryption)**:
   - Select **No** (Non-exempt encryption is false, pre-configured in `app.json` via `ITSAppUsesNonExemptEncryption: false`).
4. Add internal testers (email addresses) to verify the build on physical iPhones.

#### Step 3: App Store Review Preparation
In App Store Connect ➔ **App Store** tab:
1. **Screenshots Required**:
   - 6.9" Display (iPhone 16 Pro Max / 15 Pro Max): 1320 x 2868 px or 1290 x 2796 px (minimum 3 screenshots).
   - 6.5" Display (iPhone 14 Plus / 11 Pro Max): 1242 x 2688 px or 1284 x 2778 px.
   - 13" iPad Pro (Optional if iPad supported): 2064 x 2752 px.
2. **Promotional Text & Description**:
   - *Name*: Leads Rubix CRM
   - *Subtitle*: Enterprise Sales CRM & Leads Engine
   - *Description*: World-class multi-vertical CRM for managing client relationships, dynamic lead pipelines, site visits, call logging, and automated deal tracking.
   - *Keywords*: crm, sales, leads, real estate crm, enterprise crm, business management
3. **App Privacy (Nutrition Labels)**:
   - *Contact Info*: Email, Name, Phone Number (for account setup).
   - *Location*: Approximate & Precise Location (for field site visit check-ins).
   - *User Content*: Photos, Audio, Documents (for contract and KYC attachments).
   - *Linked to User*: Yes.
   - *Used for Tracking*: **NO**.
4. **App Review Information (CRITICAL FOR APPROVAL)**:
   - **Sign-in required**: Yes.
   - **Demo/Reviewer Credentials**:
     - *Username*: `reviewer@leadsrubix.com` (or authorized review workspace user)
     - *Password*: `[ReviewerPassword]`
     - *Notes*: "Leads Rubix is an enterprise CRM. Reviewers can log in with the provided test account to inspect the dashboard, lead management, tasks, and settings. No in-app purchases required."
5. **Copyright**: `2026 Leads Rubix Inc.`
6. Click **Submit for Review**.

---

### B. Submitting to Google Play Store

#### Step 1: Push Build to Google Play Console
Generate and configure Google Service Account JSON key:
1. In Google Play Console ➔ **API access** ➔ Link or create a Google Cloud Project.
2. Create a Service Account with **Release Manager** permissions.
3. Generate a `.json` private key and save it as `google-service-account.json`.
4. Run:
```bash
cd artifacts/app
eas submit -p android --profile production --key google-service-account.json
```

#### Step 2: Google Play Store Listing & Data Safety
In Google Play Console:
1. **Store Listing**:
   - Short description: Enterprise Sales CRM & Pipeline Tracker.
   - Full description: Comprehensive CRM platform for modern business teams.
   - Hi-res icon: 512 x 512 px PNG.
   - Feature graphic: 1024 x 500 px JPG/PNG.
   - Phone screenshots: At least 4 screenshots (1080 x 2400 px or higher).
2. **Data Safety Form**:
   - Does app collect data? **Yes**.
   - Encrypted in transit? **Yes (HTTPS / 256-bit SSL)**.
   - Can users request data deletion? **Yes** (in-app Delete Account supported).
   - Collected Data types: Location, Personal info (Name, Email, Phone), Photos/Videos, Audio recordings, Contacts.
3. **App Access (Reviewer Login)**:
   - Select **All or some functionality is restricted**.
   - Provide test account credentials (`reviewer@leadsrubix.com` / `Password`) and instructions.
4. **Target Audience**: 18 and over (Enterprise Business).
5. **Releases ➔ Production**:
   - Create new release from internal track.
   - Review release and click **Start Rollout to Production**.

---

## 6. Zero-Rejection Pre-Flight Checklist

Before hitting "Submit for Review" on either store, verify each of the following:

- [x] **Zero Demo Buttons / Credentials**: No "Demo Login" pills or hardcoded emails on the login screen.
- [x] **Consistent Brand Wording**: Uses professional layman phrasing: `ENTERPRISE SALES CRM`.
- [x] **Prominent Legal & Privacy Modal**: Displays transparent permission disclosures (Location, Contacts, Camera, Audio, Notifications) before prompting.
- [x] **Functional Account Deletion**: Users can delete their account directly inside the app (`Profile ➔ Delete Account & Personal Data`) fulfilling Apple 5.1.1(v).
- [x] **Working Legal URLs**: Privacy Policy and Terms of Service URLs load live on the web:
  - `https://leadsrubix.com/privacy-policy`
  - `https://leadsrubix.com/terms-of-service`
- [x] **Valid Reviewer Credentials**: A valid, active test account is configured in the backend and documented in the review notes so reviewers can log in without errors.
- [x] **No Broken UI**: Flexbox heights, scroll containers, and safe areas tested on both iPhone 16 Pro Max and Pixel 9.
