import type { APIRoute } from "astro";
import { getPlotByID, updatePlot, deletePlot } from "@/lib/grpc/vineyardClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  try {
    const plot = await getPlotByID(id, token);
    return new Response(JSON.stringify(plot), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  try {
    const body = await request.json();
    const plot = await updatePlot(id, body, token);
    return new Response(JSON.stringify(plot), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  try {
    await deletePlot(id, token);
    return new Response(null, { status: 204 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
};
