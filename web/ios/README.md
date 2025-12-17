# DeepStack iOS App

This directory contains the native iOS wrapper for the DeepStack PWA, built using [Capacitor](https://capacitorjs.com/).

## Prerequisites

- **macOS** with Xcode 15+ installed
- **Node.js 18+** and npm
- **Apple Developer Program Membership** ($99/year) for App Store submission
- **CocoaPods** (`sudo gem install cocoapods`)

## Development Workflow

### 1. Build and Sync

```bash
# From the web/ directory
npm run build:ios
```

This command:
1. Builds the Next.js app
2. Syncs the build output to the iOS project

### 2. Open in Xcode

```bash
npm run open:ios
```

### 3. Run on Simulator

```bash
npm run run:ios
```

Or select a device/simulator in Xcode and press ⌘+R.

## Project Structure

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift    # iOS app lifecycle
│   │   ├── Assets.xcassets/     # App icons and splash screens
│   │   └── Info.plist           # iOS app configuration
│   ├── App.xcodeproj/           # Xcode project file
│   └── App.xcworkspace/         # Xcode workspace (use this!)
└── Podfile                      # CocoaPods dependencies
```

## App Store Submission Checklist

### Required Assets

- [ ] 1024x1024 App Icon (no transparency, no rounded corners)
- [ ] iPhone screenshots (6.7" and 5.5")
- [ ] iPad screenshots (12.9" if supporting iPad)
- [ ] App Preview videos (optional but recommended)

### Required Pages

- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Support URL

### In-App Purchases

If offering Pro tier subscriptions:
- [ ] Configure In-App Purchases in App Store Connect
- [ ] Implement StoreKit 2 for purchases
- [ ] Add restore purchases functionality

## Configuration

### Bundle ID
`com.deepstack.trading`

### Capabilities
- Background Modes (for background fetch)
- Push Notifications (if implementing)
- Sign in with Apple (if using social login)

## Building for Release

1. Select **Generic iOS Device** (not a simulator)
2. Product → Archive
3. Distribute App → App Store Connect
4. Upload to TestFlight for beta testing

## Common Issues

### "Sync could not run—missing out directory"
Run `npm run build` before syncing.

### CocoaPods not found
```bash
sudo gem install cocoapods
cd ios/App && pod install
```

### Xcode signing issues
1. Open Xcode
2. Select the App target
3. Signing & Capabilities tab
4. Select your team and let Xcode manage signing

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
