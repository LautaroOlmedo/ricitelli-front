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
    try {
      const res = await login(ADMIN_USER, ADMIN_PASS);
      if (!res.token) throw new Error("empty token");
      _token = res.token;
      _expiresAt = new Date(res.expires_at);
    } catch (e) {
      // Clear cache so next call retries fresh
      _token = null;
      _expiresAt = null;
      throw new Error(`Auth login failed (${ADMIN_USER}@${process.env.GRPC_PRODUCT_HOST ?? "localhost:50051"}): ${e}`);
    }
  }
  return _token!;
}
