import type { APIRoute } from "astro";
import { getDrySupplies, createDrySupply } from "@/lib/grpc/drySupplyClient";

export const GET: APIRoute = async () => {
  try {
    const supplies = await getDrySupplies();
    return new Response(JSON.stringify(supplies), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, name, category, unit } = body;
    if (!code || !name)
      return new Response(JSON.stringify({ error: "code and name required" }), { status: 400 });
    const ds = await createDrySupply(code, name, category ?? "OTHER", unit ?? "UNIT");
    return new Response(JSON.stringify(ds), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
