import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { Product, BillOfDrySupply } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/product.proto");
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
    });
    const proto = grpc.loadPackageDefinition(pkgDef) as any;
    _client = new proto.product.ProductService(
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

function mapProduct(r: any): Product {
  return {
    id: r.id ?? "",
    name: r.name ?? "",
    bom: (r.bom ?? []).map((b: any) => ({
      dry_supply_id: b.dry_supply_id ?? "",
      quantity_per_unit: Number(b.quantity_per_unit ?? 0),
    })),
  };
}

export async function getProducts(token?: string): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    getClient().GetProducts({}, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.products ?? []).map(mapProduct));
    });
  });
}

export async function getProductByID(id: string, token?: string): Promise<Product> {
  return new Promise((resolve, reject) => {
    getClient().GetProductByID({ id }, meta(token), (err: any, res: any) => {
      if (err) return reject(err);
      if (!res) return reject(new Error("No response from server"));
      resolve(mapProduct(res));
    });
  });
}

export async function createProduct(
  name: string,
  bom: BillOfDrySupply[],
  token?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    getClient().CreateProduct(
      {
        name,
        bom: bom.map((b) => ({
          dry_supply_id: b.dry_supply_id,
          quantity_per_unit: b.quantity_per_unit,
        })),
      },
      meta(token),
      (err: any) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

export async function updateProduct(
  id: string,
  name: string,
  bom: BillOfDrySupply[],
  token?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    getClient().UpdateProduct(
      {
        id,
        name,
        bods: bom.map((b) => ({
          dry_supply_id: b.dry_supply_id,
          quantity_per_unit: b.quantity_per_unit,
        })),
      },
      meta(token),
      (err: any) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}
