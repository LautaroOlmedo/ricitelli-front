// Manages a cached JWT for server-side gRPC calls.
// Logs in with admin credentials and refreshes the token when it expires.

import { login } from "./authClient";

const ADMIN_USER = process.env.AUTH_ADMIN_USER ?? "admin";
const ADMIN_PASS = process.env.AUTH_ADMIN_PASSWORD ?? "admin123";

let _token: string | null = null;
let _expiresAt: Date | null = null;

export async function getToken(): Promise<string> {
  // Refresh if missing or expiring within the next 60 seconds
  const now = new Date();
  if (!_token || !_expiresAt || _expiresAt.getTime() - now.getTime() < 60_000) {
    const res = await login(ADMIN_USER, ADMIN_PASS);
    _token = res.token;
    _expiresAt = new Date(res.expires_at);
  }
  return _token;
}
