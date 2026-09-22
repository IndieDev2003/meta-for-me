# 🚀 EAS (Expo Application Services) Setup Guide

> **Complete guide to set up EAS Build, Submit, and Update workflows for Campus Bus Tracker**

---

## 📋 Overview

This guide will help you configure **Expo Application Services (EAS)** for:
- **EAS Build**: Create development and production builds
- **EAS Submit**: Submit builds to app stores
- **EAS Update**: Over-the-air updates
- **GitHub Actions**: Automated CI/CD workflows

---

## 🎯 Prerequisites

1. ✅ **Expo account** - [Sign up here](https://expo.dev/signup)
2. ✅ **Node.js** (v18 or higher)
3. ✅ **EAS CLI** installed globally
4. ✅ **Project already set up** with Supabase (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md))

---

## 🏗️ Step 1: Install EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

---

## 🔐 Step 2: Login to Expo

```bash
# Login with your Expo account
eas login

# Or login with token (for CI/CD)
eas login --token YOUR_EXPO_TOKEN
```

**Get your Expo token:**
1. Go to [https://expo.dev](https://expo.dev)
2. Click your profile → **Account Settings**
3. Scroll to **Access Tokens**
4. Create a new token (name it `github-actions`)
5. Copy the token (you won't see it again!)

---

## 📦 Step 3: Configure EAS Project

### 3.1 Initialize EAS in Your Project

```bash
cd meta-for-me
eas init
```

**When prompted:**
- **Project name**: `meta-for-me` (or your preferred name)
- **Choose a template**: `bare` (for full native control)
- **Select platforms**: `android, ios`

### 3.2 Project Configuration

Your `eas.json` is already configured with three profiles:

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Testing with Expo Go alternative | Internal |
| `preview` | Pull request testing | Internal |
| `production` | App store releases | Store |

---

## 🔧 Step 4: Set Up GitHub Secrets

### 4.1 Get Required Secrets

| Secret | Where to Get | Description |
|--------|--------------|-------------|
| `EXPO_TOKEN` | [expo.dev → Access Tokens](https://expo.dev/account/access-tokens) | Expo authentication |
| `EAS_PROJECT_ID` | `eas config --list` or [expo.dev → Project](https://expo.dev/projects) | Your EAS project ID |

### 4.2 Add Secrets to GitHub

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these secrets:

| Name | Value | Required |
|------|-------|----------|
| `EXPO_TOKEN` | Your Expo access token | ✅ Yes |
| `EAS_PROJECT_ID` | Your EAS project ID | ✅ Yes |

**For iOS builds (optional):**
| Name | Value | Required |
|------|-------|----------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 file | ❌ iOS only |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password | ❌ iOS only |
| `APPLE_TEAM_ID` | Apple Developer Team ID | ❌ iOS only |
| `APPLE_APPLICATION_IDENTIFIER` | App bundle ID | ❌ iOS only |

---

## 🏗️ Step 5: Configure app.config.js

Your `app.config.js` is already set up with:

```javascript
import 'dotenv/config';

export default {
  expo: {
    // ... your existing config
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
    // ... rest of config
  },
};
```

---

## 🚀 Step 6: Build Your First Development Client

### 6.1 Build for Android

```bash
# Build development APK
eas build --profile development --platform android
```

**What happens:**
- EAS creates a development build
- Uploads to Expo servers
- Provides a download link
- Takes 10-20 minutes

### 6.2 Build for iOS (macOS required)

```bash
# Build development iOS client
eas build --profile development --platform ios
```

**For iOS, you need:**
- macOS computer
- Xcode installed
- Apple Developer account ($99/year)
- Properly configured certificates

---

## ⚡ Step 7: Install Development Build

### Android

1. **Download the APK** from the EAS build page
2. **Transfer to your phone** (email, Google Drive, etc.)
3. **Install the APK**
4. **Open the app**

### iOS

1. **Wait for build to complete**
2. **Install via TestFlight** (for production builds)
3. **Or install directly** from EAS CLI:
   ```bash
   eas build:install --platform ios
   ```

---

## 📱 Step 8: Test Background Location

**Important:** Background location **only works in development builds**, not in Expo Go.

1. **Start the development build** on your phone
2. **Sign in** with your college email
3. **Start broadcasting**
4. **Close the app** (don't force stop)
5. **Walk around** - your location should continue updating!
6. **Check on another device** - you should see the bus moving

---

## 🔄 Step 9: GitHub Actions Workflows

Your repository already has three workflows:

### 9.1 `eas-build.yml` - Automatic Builds

**Triggers:**
- Push to `main` or `master` branch
- Pull requests to `main` or `master`

**What it does:**
- Builds development clients for Android and iOS
- Uses the `development` profile

### 9.2 `eas-preview.yml` - Preview Builds for PRs

**Triggers:**
- Pull requests to `main` or `master`

**What it does:**
- Builds preview clients for testing PR changes
- Uses the `preview` profile

### 9.3 `eas-submit.yml` - Manual App Store Submission

**Trigger:** Manual via GitHub Actions

**What it does:**
- Submits production builds to Google Play and/or App Store
- Requires additional iOS certificates for App Store

---

## 📤 Step 10: Submit to App Stores

### 10.1 Build Production Version

```bash
# Build for production
eas build --profile production --platform android
eas build --profile production --platform ios
```

### 10.2 Submit to Google Play

```bash
# Submit Android to Google Play
eas submit --profile production --platform android
```

**Prerequisites:**
- Google Play Developer account ($25 one-time)
- App created in Google Play Console
- Signed APK or App Bundle

### 10.3 Submit to App Store (iOS)

```bash
# Submit iOS to App Store
eas submit --profile production --platform ios
```

**Prerequisites:**
- Apple Developer account ($99/year)
- App created in App Store Connect
- Proper certificates configured

---

## 📊 Step 11: EAS Update (OTA Updates)

### 11.1 Enable Updates

Your `app.config.js` already has updates configured:

```javascript
updates: {
  fallbackToCacheTimeout: 0,
},
```

### 11.2 Publish an Update

```bash
# Publish an update
eas update --channel production --message "Fixed bug, improved performance"
```

**Channels:**
- `production` - For production builds
- `development` - For development builds
- `preview` - For preview builds

### 11.3 Configure Update Policies

Edit `app.config.js`:

```javascript
runtimeVersion: {
  policy: 'appVersion',  // or 'sdkVersion'
},
```

---

## 🛠️ Configuration Reference

### eas.json Configuration

```json
{
  "cli": {
    "version": ">= 3.1.0"
  },
  "build": {
    "development": {
      "developmentClient": true,      // Enables development mode
      "distribution": "internal",     // Only for internal testing
      "android": {
        "buildType": "apk"            // APK for easy testing
      },
      "ios": {
        "simulator": true             // Enable iOS simulator
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store",        // For app stores
      "android": {
        "buildType": "app-bundle"     // App Bundle for Google Play
      },
      "ios": {}
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build Types

| Build Type | Description | Use Case |
|------------|-------------|----------|
| `apk` | Android APK file | Development, internal testing |
| `app-bundle` | Android App Bundle | Google Play Store |
| `simulator` | iOS Simulator build | Development, testing |
| `device` | iOS Device build | TestFlight, App Store |

---

## 📁 File Structure

```
meta-for-me/
├── eas.json                      # EAS configuration
├── app.config.js                 # App configuration (replaces app.json)
├── .easignore                    # Files to ignore in EAS builds
├── .github/
│   └── workflows/
│       ├── eas-build.yml         # Auto-build on push/PR
│       ├── eas-preview.yml       # Preview builds for PRs
│       └── eas-submit.yml        # Manual store submission
└── ...
```

---

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `eas init` | Initialize EAS in project |
| `eas login` | Login to Expo account |
| `eas logout` | Logout from Expo account |
| `eas config` | View current EAS config |
| `eas build` | Build for all platforms |
| `eas build --platform android` | Build for Android only |
| `eas build --platform ios` | Build for iOS only |
| `eas build --profile development` | Use development profile |
| `eas build --profile production` | Use production profile |
| `eas submit` | Submit to app stores |
| `eas update` | Publish OTA update |
| `eas secret:create` | Create a new secret |
| `eas secret:list` | List all secrets |
| `eas project:init` | Create new EAS project |
| `eas project:list` | List all EAS projects |

---

## 🚨 Troubleshooting

### ❌ "EAS project not found"
**Solution:** Run `eas init` to create a new EAS project

### ❌ "No EAS project ID"
**Solution:** Add `EAS_PROJECT_ID` to your `.env` or `app.config.js`

### ❌ "Android build failed"
**Solution:** Check the build logs in [expo.dev](https://expo.dev)
- Ensure you have proper Android permissions
- Check `android/gradle.properties` for SDK versions

### ❌ "iOS build failed"
**Solution:**
- Ensure you're on macOS
- Ensure Xcode is installed
- Check Apple Developer account
- Verify certificates are configured

### ❌ "Background location not working"
**Solution:**
- Ensure you're using a **development build** (not Expo Go)
- Check `app.config.js` has proper background modes
- Verify location permissions are granted
- Test on a real device (not simulator)

### ❌ "GitHub Actions failed"
**Solution:**
- Check Actions tab in GitHub
- Verify secrets are correctly set
- Ensure EAS_PROJECT_ID matches your project

---

## 📊 Monitoring

### View Builds
1. Go to [https://expo.dev](https://expo.dev)
2. Click **"Projects"**
3. Select your project
4. View all builds and their status

### View Build Logs
```bash
# View logs for a specific build
eas build:view --id BUILD_ID
```

### View Secrets
```bash
# List all secrets
eas secret:list

# View a specific secret
eas secret:view --name SECRET_NAME
```

---

## 🎯 Best Practices

### 1. Development Workflow
- ✅ Use `development` profile for local testing
- ✅ Use `preview` profile for PR testing
- ✅ Use `production` profile for app store releases
- ✅ Test on real devices before production

### 2. Background Location
- ✅ Always test on real devices
- ✅ Use development builds (not Expo Go)
- ✅ Set appropriate intervals (15-30 seconds)
- ✅ Use `distanceInterval` to save battery

### 3. CI/CD
- ✅ Store secrets securely in GitHub
- ✅ Test workflows with pull requests
- ✅ Monitor build status
- ✅ Clean up old builds regularly

### 4. App Store Submission
- ✅ Test thoroughly before submission
- ✅ Follow app store guidelines
- ✅ Prepare screenshots and descriptions
- ✅ Set up proper privacy policy

---

## 📚 Additional Resources

- [EAS Documentation](https://docs.expo.dev/eas/)
- [EAS CLI Reference](https://docs.expo.dev/eas/eas-cli/)
- [EAS Build](https://docs.expo.dev/eas/build/)
- [EAS Submit](https://docs.expo.dev/eas/submit/)
- [EAS Update](https://docs.expo.dev/eas/update/)
- [GitHub Actions for EAS](https://docs.expo.dev/eas/github-actions/)

---

## 💡 Tips for Campus Bus Tracker

### Optimizing Background Location

In `app.config.js`, the background location is configured:

```javascript
ios: {
  infoPlist: {
    UIBackgroundModes: ['location'],
    NSLocationWhenInUseUsageDescription: '...',
    NSLocationAlwaysAndWhenInUseUsageDescription: '...',
    NSLocationAlwaysUsageDescription: '...',
  },
},
android: {
  permissions: [
    'ACCESS_FINE_LOCATION',
    'ACCESS_BACKGROUND_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'FOREGROUND_SERVICE',
  ],
},
```

### Testing Background Location

1. Build with EAS: `eas build --profile development --platform android`
2. Install the APK
3. Open the app and start broadcasting
4. Close the app (swipe away, don't force stop)
5. Walk around - your location should continue updating
6. Check on another device - you should see real-time updates

### Battery Optimization

The app is configured with:
- `LOCATION_UPDATE_INTERVAL: 15000` (15 seconds)
- `LOCATION_DISTANCE_INTERVAL: 30` (30 meters)

This balances accuracy with battery life. Adjust in `src/utils/constants.ts` if needed.

---

## ✅ You're Ready!

Your EAS workflows are now configured with:
- ✅ Development builds for testing
- ✅ Preview builds for pull requests
- ✅ Production builds for app stores
- ✅ GitHub Actions for CI/CD
- ✅ Background location support
- ✅ OTA updates capability

**Next Steps:**
1. [ ] Install EAS CLI: `npm install -g eas-cli`
2. [ ] Login to Expo: `eas login`
3. [ ] Initialize EAS: `eas init`
4. [ ] Set up GitHub secrets
5. [ ] Build your first development client: `eas build --profile development --platform android`
6. [ ] Test background location
7. [ ] Submit to app stores when ready

---

**Happy Building! 🚀**
