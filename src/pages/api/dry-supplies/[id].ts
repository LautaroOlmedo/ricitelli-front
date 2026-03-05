import type { APIRoute } from "astro";
import { getDrySupplyByID, getStockTricapa, addStock } from "@/lib/grpc/drySupplyClient";

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const { id } = params;
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

    // ?tricapa=true returns stock metrics instead of the item itself
    if (url.searchParams.get("tricapa") === "true") {
      const t = await getStockTricapa(id);
      return new Response(JSON.stringify(t), { headers: { "Content-Type": "application/json" } });
    }

    const ds = await getDrySupplyByID(id);
    return new Response(JSON.stringify(ds), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const body = await request.json();
    const { quantity, reference } = body;
    if (!quantity) return new Response(JSON.stringify({ error: "quantity required" }), { status: 400 });
    await addStock(id, Number(quantity), reference ?? "manual");
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
