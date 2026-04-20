# Build Android (Arch Linux)

This project is an Expo (React Native) app. To produce an Android APK/AAB locally you need a JDK + Android SDK.

## 1) Install prerequisites (pacman)

Install Java 17 and Android tooling via `pacman` (package names can vary a bit by repo/mirror):

```bash
sudo pacman -S --needed jdk17-openjdk android-sdk android-sdk-platform-tools android-sdk-build-tools
```

If you don’t have `android-sdk-*` packages available, install Android Studio instead and use its SDK Manager to install:
- Android SDK Platform (a recent API level)
- Android SDK Build-Tools
- Android SDK Platform-Tools

## 2) Set environment variables

Add these to your shell profile (adjust paths if your install differs):

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

Quick sanity check:

```bash
java -version
adb version
```

## 3) Generate native Android project (one-time)

`android/` is already generated in this workspace, but if you ever delete it:

```bash
cd EverythingszDash/NativeApp
npx expo prebuild -p android --no-install
```

## 4) Build a debug APK

```bash
cd EverythingszDash/NativeApp/android
./gradlew assembleDebug
```

APK output:
- `EverythingszDash/NativeApp/android/app/build/outputs/apk/debug/app-debug.apk`

## 5) Release build (unsigned by default)

```bash
cd EverythingszDash/NativeApp/android
./gradlew bundleRelease
```

AAB output:
- `EverythingszDash/NativeApp/android/app/build/outputs/bundle/release/app-release.aab`

To ship to Play Store you’ll want a proper `android.package` in `app.json` and a release keystore (Expo/EAS can manage this for you).

## Keeping the host clean (less “bloat”)

Two practical options:

1) Use EAS Build (cloud) so you don’t install the Android SDK locally:

```bash
cd EverythingszDash/NativeApp
npx eas-cli build --platform android
```

2) Keep caches contained by overriding cache locations when building:

```bash
cd EverythingszDash/NativeApp/android
GRADLE_USER_HOME="$PWD/.gradle-home" ./gradlew assembleDebug
```

