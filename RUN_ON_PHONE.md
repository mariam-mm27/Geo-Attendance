# How to Run AttendanceClean on Your Phone

## Method 1: Using Expo Go (Easiest - Recommended)

### Step 1: Install Expo Go on Your Phone
- **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Start the Development Server
The server is already running! You should see a QR code in your terminal.

If not, run this command in your terminal:
```bash
cd frontend/mobile/AttendanceClean
npx expo start
```

### Step 3: Connect Your Phone
1. Make sure your phone and computer are on the **same WiFi network**
2. Open the **Expo Go** app on your phone
3. **Scan the QR code** from the terminal:
   - **Android**: Use the Expo Go app's built-in QR scanner
   - **iOS**: Use your iPhone camera app, then tap the notification

### Step 4: Wait for the App to Load
- The app will download and run on your phone
- You'll see the login screen

---

## Method 2: Build APK for Android (Permanent Installation)

### Step 1: Configure EAS Build
```bash
cd frontend/mobile/AttendanceClean
npm install -g eas-cli
eas login
eas build:configure
```

### Step 2: Build APK
```bash
eas build --platform android --profile preview
```

### Step 3: Download and Install
- Wait for the build to complete (10-20 minutes)
- Download the APK file from the link provided
- Install it on your Android phone

---

## Troubleshooting

### Issue: "Unable to connect to Metro"
**Solution**: Make sure both devices are on the same WiFi network

### Issue: "Network response timed out"
**Solution**: 
1. Check your firewall settings
2. Try using tunnel mode: `npx expo start --tunnel`

### Issue: QR code not scanning
**Solution**:
1. Type `w` in the terminal to open in web browser
2. Or manually enter the URL shown in the terminal into Expo Go

---

## Current Server Status
✅ Server is running on port 8082
📱 Scan the QR code in your terminal with Expo Go app

## Quick Commands
- Press `a` - Open on Android emulator
- Press `i` - Open on iOS simulator  
- Press `w` - Open in web browser
- Press `r` - Reload app
- Press `m` - Toggle menu
- Press `q` - Quit server
