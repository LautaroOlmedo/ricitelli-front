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

function call<T>(method: string, req: object = {}): Promise<T> {
  return new Promise((res, rej) =>
    getClient()[method](req, (err: any, resp: T) =>
      err ? rej(err) : res(resp)
    )
  );
}

export async function getInventoryReport(): Promise<InventoryReport> {
  const r = await call<any>("GetInventoryReport", {});
  return mapReport(r);
}

export async function getLowStockAlerts(): Promise<InventoryReport> {
  const r = await call<any>("GetLowStockAlerts", {});
  return mapReport(r);
}

export async function convertSVtoPT(
  product_id: string,
  quantity: number,
  lot_number: string = ""
): Promise<void> {
  await call("ConvertSVtoPT", { product_id, quantity, lot_number });
}

export async function getProductTricapa(product_id: string): Promise<ProductTricapa> {
  const r = await call<any>("GetProductTricapa", { product_id });
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
