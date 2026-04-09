import type { APIRoute } from "astro";
import { setProductImage } from "@/lib/grpc/productClient";
import { COOKIE_NAME } from "@/lib/auth";

// POST /api/products/image  { id, image_url }
// Accepts either a base64 data URL or a plain URL string.
export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();
    const { id, image_url } = body as { id: string; image_url: string };
    if (!id || !image_url) {
      return new Response(JSON.stringify({ error: "id and image_url are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await setProductImage(id, image_url, token);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
