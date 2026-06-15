import type { APIRoute } from "astro";
import { COOKIE_NAME } from "@/lib/auth";
import {
  createCustomerReceipt,
  createRemittance,
  createSalesInvoice,
  listSalesDocuments,
} from "@/lib/grpc/salesAdministrationClient";
import type { ListSalesAdministrationFilters, SalesDocumentKind } from "@/lib/grpc/salesAdministrationTypes";

const kinds: SalesDocumentKind[] = ["invoices", "remittances", "receipts"];
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

export const GET: APIRoute = async ({ params, url, cookies }) => {
  const kind = params.kind as SalesDocumentKind;
  if (!kinds.includes(kind)) return json({ error: "Tipo de documento invÃ¡lido" }, 404);

  const filters: ListSalesAdministrationFilters = {
    customer_id: url.searchParams.get("customer_id")?.trim() ?? "",
    sale_order_id: url.searchParams.get("sale_order_id")?.trim() ?? "",
    status: url.searchParams.get("status")?.trim() ?? "",
  };
  try {
    const documents = await listSalesDocuments(kind, filters, cookies.get(COOKIE_NAME)?.value);
    return json(documents, 200);
  } catch (e: any) {
    return json({ error: e.message }, 503);
  }
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const kind = params.kind as SalesDocumentKind;
  if (!kinds.includes(kind)) return json({ error: "Tipo de documento inválido" }, 404);

  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    if (!body.customer_id || !body.idempotency_key) {
      return json({ error: "customer_id e idempotency_key son requeridos" }, 400);
    }

    const document = kind === "invoices"
      ? await createSalesInvoice(body, token)
      : kind === "remittances"
        ? await createRemittance(body, token)
        : await createCustomerReceipt(body, token);

    return json(document, 201);
  } catch (e: any) {
    return json({ error: e.message }, 503);
  }
};
