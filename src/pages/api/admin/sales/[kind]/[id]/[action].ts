import type { APIRoute } from "astro";
import { COOKIE_NAME } from "@/lib/auth";
import {
  confirmRemittance,
  issueSalesInvoice,
  postCustomerReceipt,
} from "@/lib/grpc/salesAdministrationClient";
import type { SalesDocumentKind } from "@/lib/grpc/salesAdministrationTypes";

const allowed: Record<SalesDocumentKind, string> = {
  invoices: "issue",
  remittances: "confirm",
  receipts: "post",
};

export const POST: APIRoute = async ({ params, cookies }) => {
  const kind = params.kind as SalesDocumentKind;
  if (!allowed[kind] || params.action !== allowed[kind]) {
    return new Response(JSON.stringify({ error: "Acción inválida" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const document = kind === "invoices"
      ? await issueSalesInvoice(params.id!, token)
      : kind === "remittances"
        ? await confirmRemittance(params.id!, token)
        : await postCustomerReceipt(params.id!, token);
    return new Response(JSON.stringify(document), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
};
