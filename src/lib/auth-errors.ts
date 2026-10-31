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

    // Check message for embedded (auth/...) error codes
    const match = rawMessage.match(/\(auth\/([a-z0-9-]+)\)/i);
    if (match && match[1]) {
      return { code: `auth/${match[1]}`, rawMessage };
    }

    // Check customData token response error from Identity Toolkit
    let tokenMsg = "";
    if (errObj.customData && typeof errObj.customData === "object") {
      const customData = errObj.customData as Record<string, unknown>;
      if (customData._tokenResponse && typeof customData._tokenResponse === "object") {
        const tokenResp = customData._tokenResponse as Record<string, unknown>;
        if (tokenResp.error && typeof tokenResp.error === "object") {
          const tokenErr = tokenResp.error as Record<string, unknown>;
          if (typeof tokenErr.message === "string") {
            tokenMsg = tokenErr.message;
          }
        }
      }
    }

    const combinedMsg = `${rawMessage} ${tokenMsg}`.toLowerCase();
    if (combinedMsg.includes("api key not valid") || combinedMsg.includes("invalid api key") || combinedMsg.includes("api_key_invalid")) {
      return { code: "auth/invalid-api-key", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("operation_not_allowed") || combinedMsg.includes("operation not allowed")) {
      return { code: "auth/operation-not-allowed", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("invalid_login_credentials") || combinedMsg.includes("invalid credential")) {
      return { code: "auth/invalid-credential", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("email_not_found") || combinedMsg.includes("user not found")) {
      return { code: "auth/user-not-found", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("invalid_password") || combinedMsg.includes("wrong password")) {
      return { code: "auth/wrong-password", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("email_exists") || combinedMsg.includes("email already in use")) {
      return { code: "auth/email-already-in-use", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("too_many_attempts_try_later") || combinedMsg.includes("too many requests")) {
      return { code: "auth/too-many-requests", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("unauthorized_domain") || combinedMsg.includes("unauthorized domain")) {
      return { code: "auth/unauthorized-domain", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("network_request_failed") || combinedMsg.includes("network error")) {
      return { code: "auth/network-request-failed", rawMessage: tokenMsg || rawMessage };
    }
    if (combinedMsg.includes("user_disabled")) {
      return { code: "auth/user-disabled", rawMessage: tokenMsg || rawMessage };
    }

    if (code) {
      return { code, rawMessage };
    }
  }

  if (typeof error === "string") {
    const match = error.match(/\(auth\/([a-z0-9-]+)\)/i);
    if (match && match[1]) {
      return { code: `auth/${match[1]}`, rawMessage: error };
    }
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

    case "auth/invalid-credential":
      if (context === "reset") {
        userMessage =
          "If an account with that email exists, a password reset link has been sent to your inbox.";
        diagnostic = "Password reset requested for email.";
      } else {
        userMessage =
          "Invalid credentials. Please verify your email and password, or verify that this account exists in your Firebase project.";
        diagnostic = "Firebase returned auth/invalid-credential (INVALID_LOGIN_CREDENTIALS).";
      }
      break;

    case "auth/user-not-found":
      if (context === "reset") {
        userMessage =
          "If an account with that email exists, a password reset link has been sent to your inbox.";
        diagnostic = "Password reset requested for email.";
      } else {
        userMessage =
          "No account found with this email. Please check that this account exists in the correct Firebase project or register a new account.";
        diagnostic = "Firebase returned auth/user-not-found. Account does not exist in project planora-ai-f3e0b.";
      }
      break;

    case "auth/wrong-password":
      userMessage = "Incorrect password. Please verify your password or use 'Forgot password?' to reset it.";
      diagnostic = "Firebase returned auth/wrong-password.";
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

