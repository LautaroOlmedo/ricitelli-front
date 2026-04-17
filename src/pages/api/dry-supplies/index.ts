import type { APIRoute } from "astro";
import { getDrySupplies, createDrySupply } from "@/lib/grpc/drySupplyClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const supplies = await getDrySupplies(token);
    return new Response(JSON.stringify(supplies), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();
    const { code, name, category, unit, reorder_point } = body;
    if (!code || !name)
      return new Response(JSON.stringify({ error: "code and name required" }), { status: 400 });
    const ds = await createDrySupply(code, name, category ?? "OTHER", unit ?? "UNIT", Number(reorder_point ?? 0), token);
    return new Response(JSON.stringify(ds), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
