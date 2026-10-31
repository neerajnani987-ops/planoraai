# Planora AI — Your Intelligent Event Planning Assistant

Planora AI is an intelligent event planning assistant that helps users organize weddings, milestone birthdays, and community events with AI-powered blueprints, deterministic budget calculation engines, automated timelines, vendor checklists, and persistent cloud storage.

---

## Key Features

- **Google Gemini AI Integration**: Generates customized 12-point master plans (vision, theme, decoration, itemized expenses, timeline, vendors, food, contingencies) using `@google/genai`.
- **Deterministic Budget Engine**: Calculates all totals, remaining reserves, cost-per-guest metrics, and category allocations with pure TypeScript application logic.
- **Firebase Authentication**: Email and password registration, secure login, persistent session state restoration, and logout.
- **Cloud Firestore Persistence**: Saves and syncs user profiles, events, budgets, tasks, timelines, vendors, and user preferences.
- **Public Demo Mode**: Allows visitors to explore full planning capabilities with local sample events without requiring an account.
- **Server-Side Token Verification**: Uses Firebase Admin SDK to verify Firebase ID tokens on every private API route and enforce user ownership.
- **Fine-Grained Firestore Security Rules**: Restricts document access so users can only read, create, update, or delete their own data.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **AI Model**: Google Gemini API (`@google/genai`)
- **Authentication**: Firebase Authentication
- **Database**: Google Cloud Firestore (`firebase`, `firebase-admin`)
- **Validation**: Zod
- **Styling**: Tailwind CSS 3 (PostCSS & Autoprefixer)
- **Testing**: Vitest, React Testing Library

---

## Environment Configuration

Create a `.env.local` file in the root directory modeled after `.env.example`:

```bash
# 1. Google Gemini AI API (Server-side only)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# 2. Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. Firebase Client SDK (Web app credentials)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 4. Firebase Admin SDK (Server-side only credentials)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"

# 5. Local Emulator (optional)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

---

## Firebase Setup Instructions

1. **Create a Firebase Project**:
   - Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.

2. **Enable Authentication**:
   - In Build > Authentication, click **Get Started** and enable **Email/Password**.

3. **Enable Cloud Firestore**:
   - In Build > Firestore Database, click **Create Database** (start in production or test mode).

4. **Deploy Firestore Security Rules**:
   - The security rules are provided in `firestore.rules`.
   - Deploy using the Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules
     ```

5. **Generate Service Account Key for Firebase Admin**:
   - Go to Project Settings > **Service accounts**.
   - Click **Generate new private key** and copy `client_email` and `private_key` into `.env.local`.

---

## Development & Verification Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run unit and integration tests
npm test

# Run TypeScript strict type-check
npm run typecheck

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

---

## API Endpoints

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/ai/plan` | `POST` | No (Rate-limited) | Generates a 12-point event master plan via Gemini AI. |
| `/api/ai/revise` | `POST` | No (Rate-limited) | Revises an event plan via natural language instructions. |
| `/api/ai/budget-optimize` | `POST` | No (Rate-limited) | Optimizes budgets by percentage with protected categories. |
| `/api/ai/reschedule` | `POST` | No (Rate-limited) | Recalibrates timelines and vendor booking windows for new dates. |
| `/api/events` | `GET` | Yes (Bearer token) | Lists all events owned by the authenticated user. |
| `/api/events` | `POST` | Yes (Bearer token) | Creates and saves an event plan to Cloud Firestore. |
| `/api/events/[id]` | `GET` | Yes (Bearer token) | Retrieves an event by ID (ownership verified). |
| `/api/events/[id]` | `PUT` | Yes (Bearer token) | Updates an event with re-verified deterministic budget math. |
| `/api/events/[id]` | `DELETE` | Yes (Bearer token) | Deletes an event from Cloud Firestore. |
| `/api/auth/profile` | `GET` | Yes (Bearer token) | Retrieves the authenticated user profile and preferences. |
| `/api/auth/profile` | `PUT` | Yes (Bearer token) | Updates user profile details and preferences in Firestore. |

---

## Single-URL Vercel Deployment

Planora AI is engineered as a unified Next.js App Router application where frontend and backend API routes deploy simultaneously under **one single public URL**.

### 1. Zero-Config Deployment
1. Import the repository into [Vercel](https://vercel.com).
2. Framework Preset: **Next.js** (detected automatically).
3. Build Command: `npm run build` (`next build --webpack`).
4. Output Directory: `.next` (default).

### 2. Required Production Environment Variables
Set these in your Vercel Project Settings > **Environment Variables**:
- `GEMINI_API_KEY`: Your server-side Google Gemini API key.
- `GEMINI_MODEL`: `gemini-3.8-flash` (or fallback).
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Client Firebase API key.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: e.g. `planora-ai-f3e0b.firebaseapp.com`.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: e.g. `planora-ai-f3e0b`.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: e.g. `planora-ai-f3e0b.firebasestorage.app`.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Client messaging sender ID.
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Client app ID.
- `FIREBASE_PROJECT_ID`: Server Firebase project ID.
- `FIREBASE_CLIENT_EMAIL`: Service account client email.
- `FIREBASE_PRIVATE_KEY`: Service account private key string.

### 3. Production Security & Same-Origin Architecture
- All client-side fetch requests utilize relative same-origin paths (`/api/...`), eliminating cross-origin CORS latency and preventing third-party interception.
- Strict HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are applied globally via `next.config.ts`.
- Server-side secrets (`GEMINI_API_KEY`, `FIREBASE_PRIVATE_KEY`) are stripped from client bundles and never logged.
