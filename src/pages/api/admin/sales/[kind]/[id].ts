import type { APIRoute } from "astro";
import { COOKIE_NAME } from "@/lib/auth";
import { getSalesDocument } from "@/lib/grpc/salesAdministrationClient";
import type { SalesDocumentKind } from "@/lib/grpc/salesAdministrationTypes";

const kinds: SalesDocumentKind[] = ["invoices", "remittances", "receipts"];

export const GET: APIRoute = async ({ params, cookies }) => {
  const kind = params.kind as SalesDocumentKind;
  if (!kinds.includes(kind)) return new Response(JSON.stringify({ error: "Tipo de documento inválido" }), { status: 404 });
  try {
    const document = await getSalesDocument(kind, params.id!, cookies.get(COOKIE_NAME)?.value);
    return new Response(JSON.stringify(document), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
};
