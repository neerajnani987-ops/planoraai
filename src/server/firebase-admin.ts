import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export class AuthenticationError extends Error {
  public statusCode: number;
  constructor(message = "Authentication required. Please sign in.", statusCode = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = statusCode;
  }
}

export class AuthorizationError extends Error {
  public statusCode: number;
  constructor(message = "Forbidden. You do not have permission to access this resource.", statusCode = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Initializes and returns the Firebase Admin App instance.
 * Credentials can be supplied via FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL,
 * GOOGLE_APPLICATION_CREDENTIALS path, or default project fallback for emulator.
 */
export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existingApp = existingApps[0];
    if (existingApp) return existingApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "planora-ai-f3e0b";

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    return initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      },
      "planora-admin-app"
    );
  }

  // Fallback to project ID (works in Cloud Run / Firebase hosting or local emulator)
  return initializeApp({ projectId });
}

export function getAdminAuth(): Auth {
  const app = getFirebaseAdminApp();
  return getAuth(app);
}

export function getAdminFirestore(): Firestore {
  const app = getFirebaseAdminApp();
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already configured
  }
  return db;
}

/**
 * Verifies a Firebase ID token from the Authorization header or token string.
 * Never trusts a user-provided client UID.
 */
export async function verifyAuthToken(
  requestOrHeader: Request | Headers | string | null | undefined
): Promise<AuthenticatedUser> {
  let authHeader: string | null = null;

  if (typeof requestOrHeader === "string") {
    authHeader = requestOrHeader;
  } else if (requestOrHeader && "headers" in requestOrHeader) {
    authHeader = requestOrHeader.headers.get("authorization");
  } else if (requestOrHeader && "get" in requestOrHeader) {
    authHeader = (requestOrHeader as Headers).get("authorization");
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or malformed Authorization header. Expected 'Bearer <token>'");
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    throw new AuthenticationError("Bearer token is empty.");
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken, true);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Token verification failed";
    console.error("Firebase token verification failed:", message);
    if (message.includes("expired")) {
      throw new AuthenticationError("Your session has expired. Please sign in again.");
    }
    throw new AuthenticationError("Invalid authentication token. Please sign in again.");
  }
}
