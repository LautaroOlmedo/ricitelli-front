import type { APIRoute } from "astro";
import { login } from "@/lib/grpc/authClient";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const body = await request.json();
    const { username, password } = body ?? {};

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Usuario y contraseña requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { token } = await login(username, password);

    cookies.set(COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const isUnauth = e.code === 16 || e.code === 7;
    return new Response(
      JSON.stringify({ error: isUnauth ? "Credenciales inválidas" : (e.details ?? e.message) }),
      { status: isUnauth ? 401 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
