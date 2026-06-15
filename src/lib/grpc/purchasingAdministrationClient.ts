import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type {
  CreatePurchaseNeedInput, CreateSupplierInput, CreateSupplierInvoiceInput, CreateSupplierPaymentInput,
  CreateSupplierQuoteInput, MonthlyVATPosition, PurchaseNeed, Supplier, SupplierInvoice, SupplierOutstandingBalance,
  SupplierPayment, SupplierQuote, UpdateSupplierInput,
} from "./purchasingAdministrationTypes";

const PROTO_PATH = path.join(process.cwd(), "src/proto/purchasing_administration.proto");
const INCLUDE_DIR = path.join(process.cwd(), "src/proto");
const HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";
let _client: any = null;

function client() {
  if (!_client) {
    const pkgDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [INCLUDE_DIR] });
    const proto = grpc.loadPackageDefinition(pkgDef) as any;
    _client = new proto.purchasing_administration.PurchasingAdministrationService(HOST, grpc.credentials.createInsecure());
  }
  return _client;
}
function meta(token?: string) { const m = new grpc.Metadata(); if (token) m.add("authorization", `Bearer ${token}`); return m; }
function call<T>(method: string, request: unknown, token?: string): Promise<T> {
  return new Promise((resolve, reject) => client()[method](request, meta(token), (err: any, res: T) => err ? reject(err) : resolve(res)));
}
const strings = (r: any, keys: string[]) => { const out = { ...r }; for (const k of keys) out[k] = r?.[k] ?? ""; return out; };
const mapSupplier = (r: any): Supplier => ({ ...strings(r, ["id","tax_id","social_reason","trade_name","email","phone","address","idempotency_key","created_at","updated_at"]), active: r?.active ?? false });
const mapNeed = (r: any): PurchaseNeed => ({ ...strings(r, ["id","need_number","requested_date","required_by_date","status","notes","idempotency_key","created_at","updated_at"]), items: r?.items ?? [] });
const mapQuote = (r: any): SupplierQuote => ({ ...strings(r, ["id","supplier_id","purchase_need_id","quote_number","quote_date","valid_until","currency","exchange_rate","subtotal","tax_total","total_amount","status","idempotency_key","created_at","updated_at"]), items: r?.items ?? [] });
const mapInvoice = (r: any): SupplierInvoice => ({ ...strings(r, ["id","supplier_id","supplier_quote_id","document_type","document_number","issue_date","due_date","currency","exchange_rate","subtotal","tax_total","total_amount","status","idempotency_key","created_at","updated_at"]), point_of_sale: r?.point_of_sale ?? 0, items: r?.items ?? [] });
const mapPayment = (r: any): SupplierPayment => ({ ...strings(r, ["id","supplier_id","payment_number","payment_date","currency","exchange_rate","amount","payment_method","payment_reference","status","idempotency_key","created_at","updated_at"]), allocations: r?.allocations ?? [] });

export const listSuppliers = async (includeInactive = false, token?: string) => ((await call<any>("ListSuppliers", { include_inactive: includeInactive }, token))?.suppliers ?? []).map(mapSupplier);
export const getSupplier = async (id: string, token?: string) => mapSupplier(await call("GetSupplier", { id }, token));
export const createSupplier = async (input: CreateSupplierInput, token?: string) => mapSupplier(await call("CreateSupplier", input, token));
export const updateSupplier = async (input: UpdateSupplierInput, token?: string) => mapSupplier(await call("UpdateSupplier", input, token));
export const deactivateSupplier = async (id: string, token?: string) => mapSupplier(await call("DeactivateSupplier", { id }, token));

export const listPurchaseNeeds = async (token?: string) => ((await call<any>("ListPurchaseNeeds", {}, token))?.purchase_needs ?? []).map(mapNeed);
export const getPurchaseNeed = async (id: string, token?: string) => mapNeed(await call("GetPurchaseNeed", { id }, token));
export const createPurchaseNeed = async (input: CreatePurchaseNeedInput, token?: string) => mapNeed(await call("CreatePurchaseNeed", input, token));
export const updatePurchaseNeedStatus = async (id: string, status: string, token?: string) => mapNeed(await call("UpdatePurchaseNeedStatus", { id, status }, token));

export const listSupplierQuotes = async (supplierId = "", token?: string) => ((await call<any>("ListSupplierQuotes", { supplier_id: supplierId }, token))?.supplier_quotes ?? []).map(mapQuote);
export const getSupplierQuote = async (id: string, token?: string) => mapQuote(await call("GetSupplierQuote", { id }, token));
export const createSupplierQuote = async (input: CreateSupplierQuoteInput, token?: string) => mapQuote(await call("CreateSupplierQuote", input, token));
export const updateSupplierQuoteStatus = async (id: string, status: string, token?: string) => mapQuote(await call("UpdateSupplierQuoteStatus", { id, status }, token));

export const listSupplierInvoices = async (supplierId = "", token?: string) => ((await call<any>("ListSupplierInvoices", { supplier_id: supplierId }, token))?.supplier_invoices ?? []).map(mapInvoice);
export const getSupplierInvoice = async (id: string, token?: string) => mapInvoice(await call("GetSupplierInvoice", { id }, token));
export const createSupplierInvoice = async (input: CreateSupplierInvoiceInput, token?: string) => mapInvoice(await call("CreateSupplierInvoice", input, token));
export const issueSupplierInvoice = async (id: string, token?: string) => mapInvoice(await call("IssueSupplierInvoice", { id }, token));
export const voidSupplierInvoice = async (id: string, token?: string) => mapInvoice(await call("VoidSupplierInvoice", { id }, token));

export const listSupplierPayments = async (supplierId = "", token?: string) => ((await call<any>("ListSupplierPayments", { supplier_id: supplierId }, token))?.supplier_payments ?? []).map(mapPayment);
export const getSupplierPayment = async (id: string, token?: string) => mapPayment(await call("GetSupplierPayment", { id }, token));
export const createSupplierPayment = async (input: CreateSupplierPaymentInput, token?: string) => mapPayment(await call("CreateSupplierPayment", input, token));
export const postSupplierPayment = async (id: string, token?: string) => mapPayment(await call("PostSupplierPayment", { id }, token));
export const voidSupplierPayment = async (id: string, token?: string) => mapPayment(await call("VoidSupplierPayment", { id }, token));
export const getSupplierOutstandingBalance = (supplierId: string, currency: string, token?: string) => call<SupplierOutstandingBalance>("GetSupplierOutstandingBalance", { supplier_id: supplierId, currency }, token);
export const getMonthlyVATPosition = (month: string, token?: string) => call<MonthlyVATPosition>("GetMonthlyVATPosition", { month }, token);
