import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { InventoryReport, ProductTricapa } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/inventory.proto");
const HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";

let client: any = null;

function getClient() {
  if (client) return client;
  const pkg = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(pkg) as any;
  client = new proto.inventory.InventoryService(
    HOST,
    grpc.credentials.createInsecure()
  );
  return client;
}

function meta(token?: string): grpc.Metadata {
  const m = new grpc.Metadata();
  if (token) m.add("authorization", `Bearer ${token}`);
  return m;
}

function call<T>(method: string, req: object = {}, token?: string): Promise<T> {
  return new Promise((res, rej) =>
    getClient()[method](req, meta(token), (err: any, resp: T) =>
      err ? rej(err) : res(resp)
    )
  );
}

export async function getInventoryReport(token?: string): Promise<InventoryReport> {
  const r = await call<any>("GetInventoryReport", {}, token);
  return mapReport(r);
}

export async function getLowStockAlerts(token?: string): Promise<InventoryReport> {
  const r = await call<any>("GetLowStockAlerts", {}, token);
  return mapReport(r);
}

export async function convertSVtoPT(
  product_id: string,
  quantity: number,
  lot_number: string = "",
  token?: string
): Promise<void> {
  await call("ConvertSVtoPT", { product_id, quantity, lot_number }, token);
}

export async function getProductTricapa(product_id: string, token?: string): Promise<ProductTricapa> {
  const r = await call<any>("GetProductTricapa", { product_id }, token);
  return mapProductTricapa(r);
}

function mapReport(r: any): InventoryReport {
  return {
    products: (r.products ?? []).map(mapProductTricapa),
    dry_supply_alerts: (r.dry_supply_alerts ?? []).map((a: any) => ({
      dry_supply_id: a.dry_supply_id ?? "",
      code: a.code ?? "",
      name: a.name ?? "",
      physical: Number(a.physical ?? 0),
      committed: Number(a.committed ?? 0),
      available: Number(a.available ?? 0),
      is_low: Boolean(a.is_low),
    })),
  };
}

function mapProductTricapa(p: any): ProductTricapa {
  return {
    product_id: p.product_id ?? "",
    product_name: p.product_name ?? "",
    sku: p.sku ?? "",
    undressed_stock: Number(p.undressed_stock ?? 0),
    dressed_physical: Number(p.dressed_physical ?? 0),
    dressed_committed: Number(p.dressed_committed ?? 0),
    dressed_available: Number(p.dressed_available ?? 0),
  };
}
