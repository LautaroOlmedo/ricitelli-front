import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { SaleOrderItem } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/application_service.proto");
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
    _client = new proto.application.ApplicationService(
      HOST,
      grpc.credentials.createInsecure()
    );
  }
  return _client;
}

export interface CreateOrderInput {
  customer_id: string;
  items: SaleOrderItem[];
  currency?: string;           // ARS | USD | CAD | EUR
  market?: string;             // DOMESTIC | EXPORT
  destination_country?: string;
  sale_type?: string;          // SALE | SAMPLE_CUSTOMS | GIFT | INTERNAL | COMMERCIAL_SAMPLE
}

function meta(token?: string): grpc.Metadata {
  const m = new grpc.Metadata();
  if (token) m.add("authorization", `Bearer ${token}`);
  return m;
}

export async function createOrder(input: CreateOrderInput, token?: string): Promise<{ message: string }> {
  return new Promise((resolve, reject) => {
    getClient().CreateOrder(input, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}
