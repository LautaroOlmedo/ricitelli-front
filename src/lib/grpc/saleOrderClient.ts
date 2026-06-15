import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { SaleOrder, CreateSaleOrderInput } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/sale_order.proto");
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
    _client = new proto.sale_order.SaleOrderService(
      HOST,
      grpc.credentials.createInsecure()
    );
  }
  return _client;
}

function meta(token?: string): grpc.Metadata {
  const m = new grpc.Metadata();
  if (token) m.add("authorization", `Bearer ${token}`);
  return m;
}

function mapOrder(r: any): SaleOrder {
  const summary = r.administrative_summary ?? {};
  return {
    id: r.id ?? "",
    customer_id: r.customer_id ?? "",
    status: r.status ?? "NEW",
    items: r.items ?? [],
    created_at: r.created_at ?? "",
    currency: r.currency ?? "ARS",
    market: r.market ?? "DOMESTIC",
    destination_country: r.destination_country ?? "",
    sale_type: r.sale_type ?? "SALE",
    administrative_summary: {
      total_ordered_quantity: summary.total_ordered_quantity ?? "0",
      invoiced_quantity: summary.invoiced_quantity ?? "0",
      remitted_quantity: summary.remitted_quantity ?? "0",
      pending_invoice_quantity: summary.pending_invoice_quantity ?? "0",
      pending_remittance_quantity: summary.pending_remittance_quantity ?? "0",
      linked_invoices: summary.linked_invoices ?? [],
      linked_remittances: summary.linked_remittances ?? [],
    },
  };
}

export async function getSaleOrders(token?: string): Promise<SaleOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetSaleOrders({}, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.sale_orders ?? []).map(mapOrder));
    });
  });
}

export async function getSaleOrderByID(id: string, token?: string): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().GetSaleOrderByID({ id }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

export async function createSaleOrder(input: CreateSaleOrderInput, token?: string): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().CreateSaleOrder(input, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

export async function getSaleOrdersByDateRange(fromDate: string, toDate: string, token?: string): Promise<SaleOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetSaleOrdersByDateRange({ from_date: fromDate, to_date: toDate }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.sale_orders ?? []).map(mapOrder));
    });
  });
}

export async function updateSaleOrderStatus(id: string, status: string, token?: string): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().UpdateSaleOrderStatus({ id, status }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}
