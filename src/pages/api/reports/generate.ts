import type { APIRoute } from "astro";
import {
  generateSalesReport,
  generateProductionReport,
  generateGeneralReport,
  generateLowStockReport,
  generateLotTraceabilityReport,
  generateCustomerReport,
} from "@/lib/grpc/reportingClient";
import { COOKIE_NAME } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const {
      type,
      from_date,
      to_date,
      customer_id,
      market,
      currency,
      product_id,
      lot_number,
    } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: "type requerido" }), { status: 400 });
    }

    const filter = {
      from_date: from_date ?? "",
      to_date: to_date ?? "",
      customer_id: customer_id ?? "",
      market: market ?? "",
      currency: currency ?? "",
      product_id: product_id ?? "",
    };

    let result;
    switch (type) {
      case "SALES":
        result = await generateSalesReport(filter, token);
        break;
      case "PRODUCTION":
        result = await generateProductionReport(filter, token);
        break;
      case "GENERAL":
        result = await generateGeneralReport(filter, token);
        break;
      case "LOW_STOCK":
        result = await generateLowStockReport(token);
        break;
      case "LOT":
        if (!lot_number) return new Response(JSON.stringify({ error: "lot_number requerido" }), { status: 400 });
        result = await generateLotTraceabilityReport(lot_number, token);
        break;
      case "CUSTOMER":
        if (!customer_id) return new Response(JSON.stringify({ error: "customer_id requerido" }), { status: 400 });
        result = await generateCustomerReport(customer_id, from_date ?? "", to_date ?? "", token);
        break;
      default:
        return new Response(JSON.stringify({ error: `tipo desconocido: ${type}` }), { status: 400 });
    }

    // Attach token query param to download_url so the browser can fetch without a header.
    const url = result.download_url.includes("?")
      ? `${result.download_url}&token=${encodeURIComponent(token ?? "")}`
      : `${result.download_url}?token=${encodeURIComponent(token ?? "")}`;

    return new Response(JSON.stringify({ ...result, download_url: url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), { status: 500 });
  }
};
