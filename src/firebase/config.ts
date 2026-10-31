/**
 * Reusable Firebase configuration and initialization for Planora AI.
 * Project ID: planora-ai-f3e0b
 */
import {
  firebaseConfig,
  isFirebaseConfigured,
  isRealFirebaseApiKey,
  getFirebaseConfigDiagnostics,
  getClientFirebaseApp,
  getClientAuth,
  getClientFirestore,
  app,
  auth,
  db,
} from "@/lib/firebase";

export {
  firebaseConfig,
  isFirebaseConfigured,
  isRealFirebaseApiKey,
  getFirebaseConfigDiagnostics,
  getClientFirebaseApp,
  getClientAuth,
  getClientFirestore,
  app,
  auth,
  db,
};

export default function getFirebase() {
  return { app, auth, db };
}
