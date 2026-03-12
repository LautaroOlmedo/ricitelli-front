import type { APIRoute } from "astro";
import { getDrySupplyByID, getStockTricapa, addStock, updateDrySupply } from "@/lib/grpc/drySupplyClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ params, url, cookies }) => {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const token = cookies.get(COOKIE_NAME)?.value;

    if (url.searchParams.get("tricapa") === "true") {
      const t = await getStockTricapa(id, token);
      return Response.json(t);
    }

    const ds = await getDrySupplyByID(id, token);
    return Response.json(ds);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { name, reorder_point } = body;
    if (!name) return Response.json({ error: "name requerido" }, { status: 400 });
    await updateDrySupply(id, name, Number(reorder_point ?? 0), token);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.details ?? e.message }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { quantity, reference } = body;
    if (!quantity) return Response.json({ error: "quantity required" }, { status: 400 });
    await addStock(id, Number(quantity), reference ?? "manual", token);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};
