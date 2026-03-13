import type { APIRoute } from "astro";
import { addUndressedStock } from "@/lib/grpc/inventoryClient";
import { COOKIE_NAME } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { product_id, quantity, reference } = body;
    if (!product_id || !quantity)
      return new Response(JSON.stringify({ error: "product_id and quantity required" }), { status: 400 });
    await addUndressedStock(product_id, Number(quantity), reference ?? "", token);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), { status: 500 });
  }
};
