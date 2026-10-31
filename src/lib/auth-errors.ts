/**
 * Safe, privacy-preserving Firebase Authentication error parser and formatter.
 * Translates Firebase error codes and HTTP 400 Identity Toolkit errors into
 * actionable, user-friendly messages while preventing account enumeration
 * and safeguarding sensitive credentials from logs.
 */

export interface SanitizedAuthError {
  code: string;
  userMessage: string;
  diagnostic: string;
}

export type AuthActionContext = "login" | "register" | "reset";

/**
 * Extracts the Firebase error code and safe diagnostic details from unknown error objects.
 * Handles both FirebaseError instances and raw HTTP 400 error payloads from Identity Toolkit.
 */
export function extractFirebaseAuthErrorCode(error: unknown): { code: string; rawMessage: string } {
  if (!error) {
    return { code: "auth/unknown", rawMessage: "Unknown error occurred" };
  }

  // Handle standard FirebaseError object: { code: 'auth/...', message: '...' }
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    const code = typeof errObj.code === "string" ? errObj.code : "";
    const rawMessage = typeof errObj.message === "string" ? errObj.message : "";

    if (code.startsWith("auth/")) {
      return { code, rawMessage };
    }

    // Inspect message text for embedded Firebase or Identity Toolkit error codes
    const msg = rawMessage.toLowerCase();
    if (msg.includes("api key not valid") || msg.includes("invalid api key") || msg.includes("api_key_invalid")) {
      return { code: "auth/invalid-api-key", rawMessage };
    }
    if (msg.includes("operation_not_allowed") || msg.includes("operation not allowed")) {
      return { code: "auth/operation-not-allowed", rawMessage };
    }
    if (msg.includes("invalid_login_credentials") || msg.includes("invalid credential")) {
      return { code: "auth/invalid-credential", rawMessage };
    }
    if (msg.includes("email_not_found") || msg.includes("user not found")) {
      return { code: "auth/user-not-found", rawMessage };
    }
    if (msg.includes("invalid_password") || msg.includes("wrong password")) {
      return { code: "auth/wrong-password", rawMessage };
    }
    if (msg.includes("email_exists") || msg.includes("email already in use")) {
      return { code: "auth/email-already-in-use", rawMessage };
    }
    if (msg.includes("too_many_attempts_try_later") || msg.includes("too many requests")) {
      return { code: "auth/too-many-requests", rawMessage };
    }
    if (msg.includes("unauthorized_domain") || msg.includes("unauthorized domain")) {
      return { code: "auth/unauthorized-domain", rawMessage };
    }
    if (msg.includes("network_request_failed") || msg.includes("network error")) {
      return { code: "auth/network-request-failed", rawMessage };
    }
    if (msg.includes("user_disabled")) {
      return { code: "auth/user-disabled", rawMessage };
    }

    if (code) {
      return { code, rawMessage };
    }
  }

  if (typeof error === "string") {
    const lower = error.toLowerCase();
    if (lower.includes("api key not valid") || lower.includes("invalid api key")) {
      return { code: "auth/invalid-api-key", rawMessage: error };
    }
    if (lower.includes("operation not allowed") || lower.includes("operation_not_allowed")) {
      return { code: "auth/operation-not-allowed", rawMessage: error };
    }
    return { code: "auth/unknown", rawMessage: error };
  }

  return { code: "auth/unknown", rawMessage: String(error) };
}

/**
 * Formats a Firebase Authentication error into a secure, user-friendly message
 * and safe diagnostic record.
 */
export function formatFirebaseAuthError(
  error: unknown,
  context: AuthActionContext = "login"
): SanitizedAuthError {
  const { code, rawMessage } = extractFirebaseAuthErrorCode(error);

  let userMessage: string;
  let diagnostic: string;

  switch (code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      userMessage =
        "Firebase Authentication configuration error: Invalid Firebase API Key. Please verify NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local or Vercel project settings.";
      diagnostic =
        "Firebase rejected the web API key (Identity Toolkit HTTP 400: API key not valid). Check NEXT_PUBLIC_FIREBASE_API_KEY in environment variables.";
      break;

    case "auth/operation-not-allowed":
      userMessage =
        "Email/Password sign-in is not enabled in Firebase. Please enable 'Email/Password' under Firebase Console > Authentication > Sign-in method.";
      diagnostic =
        "Firebase returned OPERATION_NOT_ALLOWED. The Email/Password provider must be toggled 'Enabled' in Firebase Console.";
      break;

    case "auth/unauthorized-domain":
      userMessage =
        "This domain is not authorized for Firebase Authentication. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.";
      diagnostic = `Domain authorization rejected. Ensure the current host is registered in Firebase authorized domains.`;
      break;

    // Account enumeration-sensitive errors:
    // Do NOT distinguish whether the email exists during sign-in attempts
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      if (context === "reset") {
        userMessage =
          "If an account with that email exists, a password reset link has been sent to your inbox.";
        diagnostic = "Password reset requested for email (generic response returned for privacy).";
      } else {
        userMessage = "Invalid email or password. Please verify your credentials or reset your password.";
        diagnostic = `Authentication rejected [${code}]. Generic credential error returned to user.`;
      }
      break;

    case "auth/email-already-in-use":
      userMessage =
        "An account with this email address already exists. Please sign in or reset your password.";
      diagnostic = "Registration rejected: email address already exists in project.";
      break;

    case "auth/invalid-email":
      userMessage = "Please enter a valid email address.";
      diagnostic = "Malformed email address rejected by client/Firebase.";
      break;

    case "auth/weak-password":
      userMessage =
        "Password is too weak. Please use at least 6 characters with a combination of letters and numbers.";
      diagnostic = "Password rejected by Firebase security policy (minimum 6 characters).";
      break;

    case "auth/too-many-requests":
      userMessage =
        "Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
      diagnostic = "Rate limit / brute-force lockout triggered on Firebase project.";
      break;

    case "auth/user-disabled":
      userMessage = "This user account has been disabled. Please contact support.";
      diagnostic = "User account has been flagged as disabled in Firebase Console.";
      break;

    case "auth/network-request-failed":
      userMessage =
        "Network connection error. Please verify your internet connection and try again.";
      diagnostic = "Failed to communicate with Firebase Authentication backend.";
      break;

    case "auth/missing-password":
      userMessage = "Password is required.";
      diagnostic = "Password parameter was empty.";
      break;

    case "auth/missing-email":
      userMessage = "Email address is required.";
      diagnostic = "Email parameter was empty.";
      break;

    case "auth/internal-error":
      userMessage =
        "An internal authentication service error occurred. Please try again or use Public Demo Mode.";
      diagnostic = "Firebase internal server error.";
      break;

    default:
      if (context === "reset") {
        userMessage =
          "Unable to send password reset email. Please verify the email address and try again.";
      } else if (context === "register") {
        userMessage = "Failed to create account. Please try again or explore in Public Demo Mode.";
      } else {
        userMessage = "Failed to sign in. Please check your credentials or try Public Demo Mode.";
      }
      diagnostic = `Unhandled auth error: ${rawMessage.substring(0, 150)}`;
      break;
  }

  return {
    code,
    userMessage,
    diagnostic,
  };
}

