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

function mapOrder(r: any): SaleOrder {
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
  };
}

export async function getSaleOrders(): Promise<SaleOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetSaleOrders({}, (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.sale_orders ?? []).map(mapOrder));
    });
  });
}

export async function getSaleOrderByID(id: string): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().GetSaleOrderByID({ id }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

export async function createSaleOrder(input: CreateSaleOrderInput): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().CreateSaleOrder(input, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

export async function updateSaleOrderStatus(id: string, status: string): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().UpdateSaleOrderStatus({ id, status }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}
