# 🍃 TeaVision Field App

> Offline-first React Native mobile application for tea plantation field workers. Features real-time AI leaf quality grading, harvest weight logging, local SQLite storage, and automatic cloud synchronization.

Built with **Expo SDK 51**, **Expo Router v3**, **Expo Camera**, **Expo SQLite**, and **Zustand**.

---

## 📱 Features

- 📸 **AI Leaf Quality Camera** — Live camera preview with viewfinder reticle, flash toggle, and flip controls.
- ⚡ **Real-Time CNN Inference** — Captures tea leaf photos, resizes/compresses to 512×512 JPEG, and scores leaf quality (High / Medium / Low) with confidence metrics in <2 seconds.
- 🛡️ **Offline-First SQLite Engine** — All harvest lots, session tags, worker IDs, and weights are written immediately to local SQLite (`harvest_lots_offline`), allowing 100% operation in remote tea plantations without cellular connection.
- 🔄 **Autonomous Background Sync** — Queue drainer checks network reachability every 30 seconds and uploads pending lots with exponential back-off and idempotency keys (`lot.id`).
- 🔐 **Secure JWT Authentication** — Access and refresh tokens stored securely in hardware-backed `Expo SecureStore` with automatic 401 refresh interceptors.
- 📊 **Field Dashboard** — Real-time daily summaries: total lots, harvested weight (kg), quality distribution charts, and sync status pills.

---

## 🏗️ Project Architecture

```
apps/field/
├── app/
│   ├── _layout.tsx                    # Root layout: SQLite init, auth guard, providers
│   ├── (auth)/
│   │   ├── _layout.tsx                # Auth group layout
│   │   └── login.tsx                  # Sign In screen with demo fill helpers
│   └── (tabs)/
│       ├── _layout.tsx                # Tab navigator (Dashboard, Capture, Harvest, Sync)
│       ├── index.tsx                  # Dashboard tab: summary cards & recent lots
│       ├── capture.tsx                # Camera viewfinder & AI grading modal
│       ├── harvest.tsx                # Harvest log tab with filters & search
│       └── sync.tsx                   # Sync status tab, network monitor & queue history
├── components/
│   ├── GradeBadge.tsx                 # High (emerald) / Medium (amber) / Low (red) badge
│   ├── SyncIndicator.tsx              # Animated sync indicator & pending count
│   ├── HarvestCard.tsx                # Lot summary card with thumbnail & status
│   ├── ConfidenceBar.tsx              # Percentage bar with 3-class score breakdown
│   ├── LoadingOverlay.tsx             # Full-screen spinner modal
│   └── ErrorBanner.tsx                # Dismissable warning/error banner
├── services/
│   ├── api.ts                         # Axios instance with auth interceptor & idempotency
│   ├── mlApi.ts                       # POST /predict client with 512px image compression
│   ├── db.ts                          # SQLite schema, indices, queries, and sync history
│   ├── offlineSync.ts                 # Queue drainer & background sync loop
│   └── storage.ts                     # Expo SecureStore token & profile helper
├── store/
│   ├── authStore.ts                   # Zustand: user session, JWTs, login & logout
│   ├── harvestStore.ts                # Zustand: lots, active session, today stats
│   └── syncStore.ts                   # Zustand: pending queue, sync triggers & history
├── hooks/
│   ├── useAuth.ts                     # Authentication hook
│   ├── useCamera.ts                   # Expo Camera permissions & shutter hook
│   ├── useSync.ts                     # Synchronization and queue status hook
│   ├── useOfflineLots.ts              # SQLite offline lots query hook
│   └── useNetwork.ts                  # Expo Network connectivity listener hook
├── types/
│   └── index.ts                       # Shared TypeScript interfaces
├── constants/
│   └── colors.ts                      # Design system color palette
├── app.json                           # Expo app configuration
├── tsconfig.json                      # Strict TypeScript compiler options
└── package.json                       # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or v22+
- **Expo CLI**: `npm install -g expo-cli`
- **Mobile Device or Emulator**:
  - iOS Simulator (macOS Xcode) or Android Emulator (Android Studio)
  - Physical iPhone or Android device with the **Expo Go** app installed

### 1. Installation

From the project root:

```bash
cd apps/field
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the backend API and ML service addresses:

```env
# Point to your local development machine's IP (not localhost when running on physical device)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
EXPO_PUBLIC_ML_URL=http://192.168.1.100:8000
```

> **Note**: When running in Expo Go on a physical phone, replace `localhost` with your machine's local Wi-Fi IP (e.g. `192.168.x.x`), as `localhost` inside the phone refers to the phone itself.

---

## 🏃 Running the App

### Start Development Server

```bash
npx expo start
```

Press:
- `a` to open on **Android Emulator**
- `i` to open on **iOS Simulator**
- Scan the printed QR code with **Expo Go** (Android) or the **Camera app** (iOS)

---

## 📡 Offline Architecture & Data Synchronization

1. **Local SQLite Persistence**:
   - Every captured leaf photo and measured harvest lot is written immediately to `harvest_lots_offline` with `synced = 0`.
   - The app functions completely without internet access.

2. **Sync Queue Drainer**:
   - Every 30 seconds (or when "Sync Now" is pressed), `offlineSync.ts` queries SQLite for all `synced = 0` lots.
   - It checks network status via `expo-network`.
   - Each lot is uploaded to `POST /api/v1/lots` with an idempotency key header (`X-Idempotency-Key: <lot.id>`).
   - If an image file exists, it is uploaded as `multipart/form-data`.
   - On HTTP 200/201, `markLotSynced(lot.id)` sets `synced = 1`.
   - On error, `sync_attempts` is incremented. Lots exceeding 5 failed attempts are preserved for review.

3. **ML Service Fallback**:
   - When taking a photo in remote zones where the FastAPI ML service is unreachable, the app automatically switches to manual grade selection (`High`, `Medium`, `Low`), ensuring work in the plantation is never blocked.

---

## 📦 Building Standalone Binaries (EAS Build)

### 1. Install EAS CLI & Login

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS

```bash
eas build:configure
```

### 3. Build APK (Android Preview)

```bash
eas build --platform android --profile preview
```

### 4. Build Production App Bundle (AAB / IPA)

```bash
# Android Google Play Store
eas build --platform android --profile production

# iOS App Store
eas build --platform ios --profile production
```

---

## 🧪 Type Checking

Verify strict TypeScript compatibility:

```bash
npm run typecheck
```
