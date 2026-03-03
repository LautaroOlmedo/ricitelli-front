import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { SaleOrderItem } from "./types";

const PROTO_PATH = path.join(
  process.cwd(),
  "src/proto/application_service.proto",
);
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
    _client = new proto.application.ApplicationService(
      GRPC_HOST,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
}

export async function createOrder(
  customer_id: string,
  items: SaleOrderItem[],
): Promise<{ message: string }> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.CreateOrder({ customer_id, items }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}
