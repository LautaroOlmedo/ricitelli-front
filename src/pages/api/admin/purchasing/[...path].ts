import type { APIRoute } from "astro";
import { COOKIE_NAME } from "@/lib/auth";
import * as purchasing from "@/lib/grpc/purchasingAdministrationClient";

const decimalKeys = new Set([
  "quantity", "unit_price", "tax_rate", "net_amount", "tax_amount", "total_amount",
  "exchange_rate", "subtotal", "tax_total", "amount", "allocated_amount",
]);
const json = (data: unknown, status = 200) => Response.json(data, { status });
const fail = (e: any) => json({ error: e.details ?? e.message ?? "Error de administración de compras" }, e.code === 5 ? 404 : 503);
function validateExactDecimals(value: any, path = "body") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (decimalKeys.has(key) && typeof child !== "string") throw new Error(`${path}.${key} debe ser un string decimal exacto`);
    if (child && typeof child === "object") validateExactDecimals(child, `${path}.${key}`);
  }
}
function routeParts(path?: string) { return (path ?? "").split("/").filter(Boolean); }

export const GET: APIRoute = async ({ params, url, cookies }) => {
  const [resource, id, action] = routeParts(params.path);
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    if (resource === "suppliers") return json(id ? await purchasing.getSupplier(id, token) : await purchasing.listSuppliers(url.searchParams.get("include_inactive") === "true", token));
    if (resource === "purchase-needs") return json(id ? await purchasing.getPurchaseNeed(id, token) : await purchasing.listPurchaseNeeds(token));
    if (resource === "quotes") return json(id ? await purchasing.getSupplierQuote(id, token) : await purchasing.listSupplierQuotes(url.searchParams.get("supplier_id") ?? "", token));
    if (resource === "invoices") return json(id ? await purchasing.getSupplierInvoice(id, token) : await purchasing.listSupplierInvoices(url.searchParams.get("supplier_id") ?? "", token));
    if (resource === "payments" && action === "outstanding") return json(await purchasing.getSupplierOutstandingBalance(id, url.searchParams.get("currency") ?? "ARS", token));
    if (resource === "payments") return json(id ? await purchasing.getSupplierPayment(id, token) : await purchasing.listSupplierPayments(url.searchParams.get("supplier_id") ?? "", token));
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) { return fail(e); }
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const [resource] = routeParts(params.path);
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();
    validateExactDecimals(body);
    if (resource === "suppliers") return json(await purchasing.createSupplier(body, token), 201);
    if (resource === "purchase-needs") return json(await purchasing.createPurchaseNeed(body, token), 201);
    if (resource === "quotes") return json(await purchasing.createSupplierQuote(body, token), 201);
    if (resource === "invoices") return json(await purchasing.createSupplierInvoice(body, token), 201);
    if (resource === "payments") return json(await purchasing.createSupplierPayment(body, token), 201);
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e: any) { return e.message?.includes("string decimal") ? json({ error: e.message }, 400) : fail(e); }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const [resource, id] = routeParts(params.path);
  if (!id) return json({ error: "id requerido" }, 400);
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();
    if (resource === "suppliers") return json(await purchasing.updateSupplier({ id, ...body }, token));
    if (resource === "purchase-needs") return json(await purchasing.updatePurchaseNeedStatus(id, body.status, token));
    if (resource === "quotes") return json(await purchasing.updateSupplierQuoteStatus(id, body.status, token));
    if (resource === "invoices" && body.action === "issue") return json(await purchasing.issueSupplierInvoice(id, token));
    if (resource === "invoices" && body.action === "void") return json(await purchasing.voidSupplierInvoice(id, token));
    if (resource === "payments" && body.action === "post") return json(await purchasing.postSupplierPayment(id, token));
    if (resource === "payments" && body.action === "void") return json(await purchasing.voidSupplierPayment(id, token));
    return json({ error: "Acción no encontrada" }, 404);
  } catch (e) { return fail(e); }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const [resource, id] = routeParts(params.path);
  if (resource !== "suppliers" || !id) return json({ error: "Ruta no encontrada" }, 404);
  try { return json(await purchasing.deactivateSupplier(id, cookies.get(COOKIE_NAME)?.value)); } catch (e) { return fail(e); }
};
