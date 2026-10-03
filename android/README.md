# AssetVault — Android Native APK Project

This folder contains the complete, production-ready **Android Native Application project** for **AssetVault**. It wraps the AssetVault client in a high-performance native Android WebView with full hardware acceleration, camera integration, secure file uploading, swipe-to-refresh, and offline error recovery.

---

## 📱 Features of the Native Android App

- **Full Native WebView**: Hardware accelerated, optimized for smooth 60fps luxury theme animations and Chart.js portfolio graphs.
- **Hardware Camera & Document Upload**: Seamlessly connects HTML file input (`<input type="file">`) to Android's native Camera and Storage File Provider so users can snap photos of gold/diamond invoices or select PDFs.
- **Client-Side AES-256-GCM Support**: Full W3C Web Cryptography API & DOM Storage (`localStorage` / `sessionStorage`) enabled in WebView.
- **Pull-to-Refresh**: Native `SwipeRefreshLayout` with gold progress accents.
- **Offline / Server Reconnect Screen**: Automatically catches network dropouts with a gold "Retry Connection" action.
- **Smart Back Navigation**: Pressing the Android back button navigates through in-app tabs/modals before exiting.

---

## 🛠️ How to Build the APK in Android Studio

### Prerequisites
1. [Android Studio Hedgehog / Iguana / Jellyfish (or newer)](https://developer.android.com/studio)
2. Android SDK with API 34 installed (Android Studio installs this automatically)
3. JDK 17 (bundled inside Android Studio)

### Step 1: Open the Project
1. Launch **Android Studio**.
2. Click **Open** (or **File > Open**).
3. Browse to and select the **`android`** folder inside your `assetvault` directory:
   ```
   c:\Users\khada\assetvault\android
   ```
4. Click **OK**. Android Studio will automatically perform a Gradle Sync.

### Step 2: Configure Your Backend Server URL
Open [`app/src/main/res/values/strings.xml`](file:///c:/Users/khada/assetvault/android/app/src/main/res/values/strings.xml):

```xml
<resources>
    <string name="app_name">AssetVault</string>
    <!-- Default for Android Emulator testing: http://10.0.2.2:5000 -->
    <!-- For testing on physical phone via Wi-Fi: http://192.168.1.X:5000 -->
    <!-- For production deployment: https://your-domain.com -->
    <string name="default_server_url">http://10.0.2.2:5000</string>
</resources>
```
* **Testing on Android Emulator**: Keep `http://10.0.2.2:5000` (this special IP connects from the emulator to your PC localhost).
* **Testing on Physical Android Phone via Wi-Fi**: Find your PC's IP address (run `ipconfig` in terminal, e.g. `192.168.1.15`) and set `http://192.168.1.15:5000`. Ensure both phone and PC are on the same Wi-Fi.
* **Production Deployed App**: Enter your HTTPS URL (e.g., `https://assetvault.onrender.com`).

### Step 3: Build the APK
1. In Android Studio top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Android Studio will compile the Kotlin code and resource assets.
3. Once completed, a notification popup will appear at the bottom right:
   > **APK(s) generated successfully for 1 module.**  
   > Click **locate** to reveal the compiled `.apk` file!
4. The output `.apk` file is located at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Step 4: Install APK on Your Android Device
- **Via USB / File Manager**: Copy `app-debug.apk` to your phone's storage or send it via WhatsApp/Telegram/Drive, tap the file, and select **Install**.
- **Via ADB Command Line**:
  ```bash
  adb install android/app/build/outputs/apk/debug/app-debug.apk
  ```

---

## ⚡ Alternative: Instant PWA WebAPK (No Android Studio Required)

If you don't want to compile an APK with Android Studio, AssetVault is already fully configured as an installable **Progressive Web App (PWA)**:

1. Start your AssetVault server on your PC:
   ```powershell
   python run.py
   ```
2. Open Chrome or Samsung Internet on your Android phone and navigate to your PC's network IP (e.g. `http://192.168.1.X:5000`).
3. Tap the **Install AssetVault** prompt that appears at the bottom, or tap browser menu **⋮ > Add to Home screen / Install app**.
4. Android will automatically package it as an authentic **WebAPK** with the luxury AssetVault gold icon on your home screen and app drawer, running full screen with no browser address bar!
