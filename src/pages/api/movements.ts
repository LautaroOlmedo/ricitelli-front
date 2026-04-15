import type { APIRoute } from "astro";
import { getMovements } from "@/lib/grpc/inventoryClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const filter = {
      from_date: url.searchParams.get("from_date") ?? "",
      to_date: url.searchParams.get("to_date") ?? "",
      user_id: url.searchParams.get("user_id") ?? "",
      movement_type: url.searchParams.get("movement_type") ?? "",
      product_id: url.searchParams.get("product_id") ?? "",
      dry_supply_id: url.searchParams.get("dry_supply_id") ?? "",
      category: url.searchParams.get("category") ?? "",
      page: Number(url.searchParams.get("page") ?? 1),
      page_size: Number(url.searchParams.get("page_size") ?? 50),
    };
    const result = await getMovements(filter, token);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 500,
    });
  }
};
