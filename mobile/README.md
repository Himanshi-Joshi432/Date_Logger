# Date Logger - Mobile App

A React Native mobile application for **Date Logger**, recreating the vintage scrapbook aesthetic and connecting to the backend at `https://date-logger.singlehq.me`.

---

## 🚀 Running Live on Your Phone (Expo Go)

1. Install **Expo Go** from Google Play Store on your Android phone.
2. Ensure your computer and phone are connected to the same Wi-Fi (or use `--tunnel`).
3. Start the development server:
   ```bash
   cd mobile
   npx expo start
   ```
4. Open the **Expo Go** app and scan the QR code displayed in your terminal.
5. Any code changes you make will instantly reload on your phone screen!

---

## 📦 Building a Standalone Android APK

We have pre-configured `eas.json` with a `preview` profile that generates a standalone `.apk` directly (no local Java or Android SDK required):

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Log into Expo
```bash
eas login
```
*(If you don't have an Expo account, create a free one at [expo.dev](https://expo.dev))*

### Step 3: Trigger APK Build
```bash
cd mobile
eas build -p android --profile preview
```

EAS will build the APK in the cloud and provide a direct download link (and QR code) to install the `.apk` on any Android device!

