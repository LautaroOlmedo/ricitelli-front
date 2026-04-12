import type { APIRoute } from "astro";
import { convertSVtoPT } from "@/lib/grpc/inventoryClient";
import { COOKIE_NAME } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { product_id, quantity, lot_number } = body;
    if (!product_id || !quantity)
      return new Response(JSON.stringify({ error: "product_id and quantity required" }), { status: 400 });
    await convertSVtoPT(product_id, Number(quantity), lot_number ?? "", token);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
