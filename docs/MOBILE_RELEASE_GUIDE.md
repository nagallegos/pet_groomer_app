# Mobile Release Guide

## App Identity

- Product name: `Barks`
- Marketing name: `Barks Bubbles & Love`
- Bundle ID / Application ID: `com.barksbubblesandlove.petgroomer`
- Current marketing version: `1.0.0`
- Current build number: `1`

## Brand Assets

- Source icon artwork: [react-app/assets/logo.svg](/c:/Users/Nick's%20Desktop/OneDrive/Documents/pet_groomer_app/pet_groomer_app/react-app/assets/logo.svg)
- Generated PWA icons: [react-app/public/icons](/c:/Users/Nick's%20Desktop/OneDrive/Documents/pet_groomer_app/pet_groomer_app/react-app/public/icons)
- Android native assets: [react-app/android](/c:/Users/Nick's%20Desktop/OneDrive/Documents/pet_groomer_app/pet_groomer_app/react-app/android)
- iOS native assets: [react-app/ios](/c:/Users/Nick's%20Desktop/OneDrive/Documents/pet_groomer_app/pet_groomer_app/react-app/ios)

To regenerate icons and splash screens after changing the logo:

```bash
npm run mobile:assets
npm run cap:sync
```

## Suggested Store Copy

- App name: `Barks`
- Subtitle: `Pet Grooming Manager`
- Short description: `Manage pet grooming appointments, client records, pets, and reminders in one polished mobile app.`
- Full description:
  `Barks helps pet groomers stay on top of their day with appointment scheduling, client management, pet records, and mobile-friendly access for busy teams.`

## Before Publishing

1. Confirm final icon and splash artwork on a real Android device and an iPhone.
2. Replace any placeholder screenshots with real app screens.
3. Review privacy disclosures for login, customer contact info, pet details, and notifications.
4. Increment `versionName` in Android and `MARKETING_VERSION` in iOS for each release.
5. Increment Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` for each submitted build.

## Build Commands

- Android sync: `npm run mobile:android`
- Android IDE: `npm run cap:open:android`
- iOS sync: `npm run mobile:ios`
- iOS IDE on macOS: `npm run cap:open:ios`
