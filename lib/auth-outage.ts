/** Shown on the customer account forms when Supabase's login service can't be reached. */
export const ACCOUNTS_UNAVAILABLE = "Accounts are temporarily unavailable. You can still order as a guest, and track orders with your email or phone.";

/**
 * True when a Supabase Auth error means the service itself is down or blocked (quota restriction 402,
 * server errors, network failures) rather than a wrong password or bad input.
 */
export function isAuthOutage(error: { name?: string; status?: number } | null | undefined): boolean {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError") return true;
  return error.status === 402 || (typeof error.status === "number" && error.status >= 500);
}

/** Thrown by helpers that call Supabase Auth when the service is unavailable. */
export class AuthOutageError extends Error {
  constructor() {
    super("Supabase Auth is unavailable");
    this.name = "AuthOutageError";
  }
}
