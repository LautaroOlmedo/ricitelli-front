import type { APIRoute } from "astro";
import { getInventoryReport } from "@/lib/grpc/inventoryClient";

export const GET: APIRoute = async () => {
  try {
    const report = await getInventoryReport();
    return new Response(JSON.stringify(report), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
