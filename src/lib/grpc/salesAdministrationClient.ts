import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type {
  CreateCustomerReceiptInput,
  CreateRemittanceInput,
  CreateSalesInvoiceInput,
  CustomerReceipt,
  InvoiceOutstandingBalance,
  ListSalesAdministrationFilters,
  Remittance,
  SalesDocument,
  SalesDocumentKind,
  SalesInvoice,
} from "./salesAdministrationTypes";

const PROTO_PATH = path.join(process.cwd(), "src/proto/sales_administration.proto");
const INCLUDE_DIR = path.join(process.cwd(), "src/proto");
const HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";

let _client: any = null;

function getClient() {
  if (!_client) {
    const pkgDef = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [INCLUDE_DIR],
    });
    const proto = grpc.loadPackageDefinition(pkgDef) as any;
    _client = new proto.sales_administration.SalesAdministrationService(
      HOST,
      grpc.credentials.createInsecure()
    );
  }
  return _client;
}

function meta(token?: string): grpc.Metadata {
  const metadata = new grpc.Metadata();
  if (token) metadata.add("authorization", `Bearer ${token}`);
  return metadata;
}

function call<T>(method: string, request: unknown, token?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    getClient()[method](request, meta(token), (err: any, response: T) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function mapInvoice(r: any): SalesInvoice {
  return {
    id: r.id ?? "", customer_id: r.customer_id ?? "", sale_order_id: r.sale_order_id ?? "",
    document_type: r.document_type ?? "", point_of_sale: r.point_of_sale ?? 0,
    document_number: String(r.document_number ?? ""), issue_date: r.issue_date ?? "", due_date: r.due_date ?? "",
    currency: r.currency ?? "", exchange_rate: r.exchange_rate ?? "", subtotal: r.subtotal ?? "",
    tax_total: r.tax_total ?? "", total_amount: r.total_amount ?? "", status: r.status ?? "",
    idempotency_key: r.idempotency_key ?? "", items: r.items ?? [], created_at: r.created_at ?? "", updated_at: r.updated_at ?? "",
  };
}

function mapRemittance(r: any): Remittance {
  return {
    id: r.id ?? "", customer_id: r.customer_id ?? "", sale_order_id: r.sale_order_id ?? "",
    sales_invoice_id: r.sales_invoice_id ?? "", point_of_sale: r.point_of_sale ?? 0,
    document_number: String(r.document_number ?? ""), issue_date: r.issue_date ?? "", delivery_date: r.delivery_date ?? "",
    status: r.status ?? "", idempotency_key: r.idempotency_key ?? "", items: r.items ?? [],
    created_at: r.created_at ?? "", updated_at: r.updated_at ?? "",
  };
}

function mapReceipt(r: any): CustomerReceipt {
  return {
    id: r.id ?? "", customer_id: r.customer_id ?? "", receipt_number: String(r.receipt_number ?? ""),
    receipt_date: r.receipt_date ?? "", currency: r.currency ?? "", exchange_rate: r.exchange_rate ?? "",
    amount: r.amount ?? "", payment_method: r.payment_method ?? "", payment_reference: r.payment_reference ?? "",
    status: r.status ?? "", idempotency_key: r.idempotency_key ?? "", allocations: r.allocations ?? [],
    created_at: r.created_at ?? "", updated_at: r.updated_at ?? "",
  };
}

export async function createSalesInvoice(input: CreateSalesInvoiceInput, token?: string) {
  return mapInvoice(await call("CreateSalesInvoice", input, token));
}
export async function getSalesInvoiceByID(id: string, token?: string) {
  return mapInvoice(await call("GetSalesInvoiceByID", { id }, token));
}
export async function listSalesInvoices(filters: ListSalesAdministrationFilters = {}, token?: string) {
  const r: any = await call("ListSalesInvoices", filters, token);
  return (r?.invoices ?? []).map(mapInvoice);
}
export async function issueSalesInvoice(id: string, token?: string) {
  return mapInvoice(await call("IssueSalesInvoice", { id }, token));
}
export async function getSalesInvoiceOutstandingBalance(id: string, token?: string): Promise<InvoiceOutstandingBalance> {
  const r: any = await call("GetSalesInvoiceOutstandingBalance", { id }, token);
  return { sales_invoice_id: r.sales_invoice_id ?? id, outstanding_balance: r.outstanding_balance ?? "" };
}
export async function createRemittance(input: CreateRemittanceInput, token?: string) {
  return mapRemittance(await call("CreateRemittance", input, token));
}
export async function getRemittanceByID(id: string, token?: string) {
  return mapRemittance(await call("GetRemittanceByID", { id }, token));
}
export async function listRemittances(filters: ListSalesAdministrationFilters = {}, token?: string) {
  const r: any = await call("ListRemittances", filters, token);
  return (r?.remittances ?? []).map(mapRemittance);
}
export async function confirmRemittance(id: string, token?: string) {
  return mapRemittance(await call("ConfirmRemittance", { id }, token));
}
export async function createCustomerReceipt(input: CreateCustomerReceiptInput, token?: string) {
  return mapReceipt(await call("CreateCustomerReceipt", input, token));
}
export async function getCustomerReceiptByID(id: string, token?: string) {
  return mapReceipt(await call("GetCustomerReceiptByID", { id }, token));
}
export async function listCustomerReceipts(filters: ListSalesAdministrationFilters = {}, token?: string) {
  const r: any = await call("ListCustomerReceipts", filters, token);
  return (r?.receipts ?? []).map(mapReceipt);
}
export async function postCustomerReceipt(id: string, token?: string) {
  return mapReceipt(await call("PostCustomerReceipt", { id }, token));
}

export function getSalesDocument(kind: SalesDocumentKind, id: string, token?: string): Promise<SalesDocument> {
  if (kind === "invoices") return getSalesInvoiceByID(id, token);
  if (kind === "remittances") return getRemittanceByID(id, token);
  return getCustomerReceiptByID(id, token);
}

export function listSalesDocuments(kind: SalesDocumentKind, filters: ListSalesAdministrationFilters = {}, token?: string): Promise<SalesDocument[]> {
  if (kind === "invoices") return listSalesInvoices(filters, token);
  if (kind === "remittances") return listRemittances(filters, token);
  return listCustomerReceipts(filters, token);
}
