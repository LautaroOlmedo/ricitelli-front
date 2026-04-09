import type { APIRoute } from "astro";
import { getPlots, createPlot } from "@/lib/grpc/vineyardClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const plots = await getPlots(token);
    return new Response(JSON.stringify(plots), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();
    const plot = await createPlot(body, token);
    return new Response(JSON.stringify(plot), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
