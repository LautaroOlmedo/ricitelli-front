import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { ProductionOrder } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/production_order.proto");
const INCLUDE_DIR = path.join(process.cwd(), "src/proto");
const GRPC_HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";

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
    _client = new proto.production_order.ProductionOrderService(
      GRPC_HOST,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
}

function meta(token?: string): grpc.Metadata {
  const m = new grpc.Metadata();
  if (token) m.add("authorization", `Bearer ${token}`);
  return m;
}

export async function getProductionOrders(token?: string): Promise<ProductionOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetProductionOrders({}, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res?.production_orders ?? []);
    });
  });
}

export async function getProductionOrderByID(id: string, token?: string): Promise<ProductionOrder> {
  return new Promise((resolve, reject) => {
    getClient().GetProductionOrderByID({ id }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      if (!res) return reject(new Error("No response"));
      resolve(res);
    });
  });
}

export async function getProductionOrdersBySaleOrder(saleOrderId: string, token?: string): Promise<ProductionOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetProductionOrdersBySaleOrder({ sale_order_id: saleOrderId }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res?.production_orders ?? []);
    });
  });
}
