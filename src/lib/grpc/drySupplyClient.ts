import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { DrySupply, StockTricapa } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/dry_supply.proto");
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
  client = new proto.dry_supply.DrySupplyService(
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

export async function getDrySupplies(token?: string): Promise<DrySupply[]> {
  const r = await call<{ dry_supplies: any[] }>("GetDrySupplies", {}, token);
  return (r.dry_supplies ?? []).map(mapDrySupply);
}

export async function getDrySupplyByID(id: string, token?: string): Promise<DrySupply> {
  const r = await call<any>("GetDrySupplyByID", { id }, token);
  return mapDrySupply(r);
}

export async function createDrySupply(
  code: string,
  name: string,
  category: string,
  unit: string,
  reorder_point: number = 0,
  token?: string
): Promise<DrySupply> {
  const r = await call<any>("CreateDrySupply", { code, name, category, unit, reorder_point }, token);
  return mapDrySupply(r);
}

export async function updateDrySupply(
  id: string,
  name: string,
  reorder_point: number,
  token?: string
): Promise<void> {
  await call("UpdateDrySupply", { id, name, reorder_point }, token);
}

export async function addStock(
  dry_supply_id: string,
  quantity: number,
  reference: string,
  token?: string
): Promise<void> {
  await call("AddStock", { dry_supply_id, quantity, reference }, token);
}

export async function getStockTricapa(dry_supply_id: string, token?: string): Promise<StockTricapa> {
  const r = await call<any>("GetStockTricapa", { dry_supply_id }, token);
  return {
    dry_supply_id: r.dry_supply_id ?? "",
    code: r.code ?? "",
    name: r.name ?? "",
    physical_stock: Number(r.physical_stock ?? 0),
    committed_stock: Number(r.committed_stock ?? 0),
    available_stock: Number(r.available_stock ?? 0),
  };
}

export async function commitStock(
  dry_supply_id: string,
  quantity: number,
  production_order_id: string,
  token?: string
): Promise<void> {
  await call("CommitStock", { dry_supply_id, quantity, production_order_id }, token);
}

export async function releaseStock(
  dry_supply_id: string,
  quantity: number,
  reference: string,
  token?: string
): Promise<void> {
  await call("ReleaseStock", { dry_supply_id, quantity, reference }, token);
}

export async function consumeStock(
  dry_supply_id: string,
  quantity: number,
  reference: string,
  token?: string
): Promise<void> {
  await call("ConsumeStock", { dry_supply_id, quantity, reference }, token);
}

function mapDrySupply(r: any): DrySupply {
  return {
    id: r.id ?? "",
    code: r.code ?? "",
    name: r.name ?? "",
    category: r.category ?? "",
    unit: r.unit ?? "UNIT",
    reorder_point: Number(r.reorder_point ?? 0),
  };
}
