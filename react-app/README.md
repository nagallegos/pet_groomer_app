# Barks Bubbles & Love

Dog Grooming CRM built with React, TypeScript, Vite, React Bootstrap, and React Big Calendar.

## Local Development

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

## Production Build

Create a production build with:

```bash
npm run build
```

## Mobile App Packaging

This project now supports Capacitor, so the same React codebase can power:

- the hosted web app
- the installable PWA
- packaged Android and iPhone apps

Useful commands:

```bash
npm run mobile:assets
npm run cap:doctor
npm run mobile:android
npm run mobile:ios
npm run cap:open:android
npm run cap:open:ios
```

What they do:

- `mobile:assets` regenerates Android, iOS, and PWA icons/splash assets from `assets/logo.svg`
- `mobile:android` builds the web app and syncs it into the Android project
- `mobile:ios` builds the web app and syncs it into the iOS project
- `cap:open:android` opens the Android project in Android Studio
- `cap:open:ios` opens the iOS project in Xcode

Notes:

- Android packaging can be driven from Windows with Android Studio installed.
- iPhone packaging still requires macOS and Xcode for the final build/signing step.
- The Capacitor config lives in `capacitor.config.ts`.

## Netlify Deployment

This repo already includes:

- [netlify.toml](../netlify.toml)
- [public/_redirects](./public/_redirects)

Those files handle the build configuration and React Router SPA redirects.

### Netlify Site Settings

Use these values in Netlify:

- Base directory: `react-app`
- Build command: `npm run build`
- Publish directory: `dist`

### Why `_redirects` Is Needed

This app uses client-side routing. Without the redirect rule, refreshing a deep link such as `/pets/pet-3` or `/appointments/history` would return a `404` on Netlify.

### Environment Variables

If you connect a real backend later, add this in Netlify:

- `VITE_API_BASE_URL`

Without `VITE_API_BASE_URL`, the app stays in mock/local mode.

## Notes

- The current app is designed to work without a backend using mock data.
- Some local Windows environments may hit an `esbuild spawn EPERM` issue during `vite build`; that is an environment/process-launch issue and not part of the Netlify configuration itself.
