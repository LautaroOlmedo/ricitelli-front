import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { SaleOrder, SaleOrderItem } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/sale_order.proto");
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
    _client = new proto.sale_order.SaleOrderService(
      GRPC_HOST,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
}

export async function getSaleOrders(): Promise<SaleOrder[]> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.GetSaleOrders({}, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res?.sale_orders ?? []);
    });
  });
}

export async function getSaleOrderByID(id: string): Promise<SaleOrder> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.GetSaleOrderByID({ id }, (err: any, res: any) => {
      if (err) return reject(err);
      if (!res) return reject(new Error("No response"));
      resolve(res);
    });
  });
}

export async function createSaleOrder(
  customer_id: string,
  items: SaleOrderItem[],
): Promise<SaleOrder> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.CreateSaleOrder({ customer_id, items }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}
