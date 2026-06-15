import type { APIRoute } from "astro";
import { COOKIE_NAME } from "@/lib/auth";
import { getMonthlyVATPosition } from "@/lib/grpc/purchasingAdministrationClient";

export const GET: APIRoute = async ({ url, cookies }) => {
  const month = url.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "month debe tener formato YYYY-MM" }, { status: 400 });
  try {
    return Response.json(await getMonthlyVATPosition(month, cookies.get(COOKIE_NAME)?.value));
  } catch (e: any) {
    return Response.json({ error: e.details ?? e.message }, { status: e.code === 5 ? 404 : 503 });
  }
};
