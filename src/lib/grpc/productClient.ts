import * as grpc from "@grpc/grpc-js";
import { ProductServiceClient } from "@/gen/product";
import type { Product, BillOfDrySupply } from "./types";

const GRPC_HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";

let _client: InstanceType<typeof ProductServiceClient> | null = null;

function getClient(): InstanceType<typeof ProductServiceClient> {
  if (!_client) {
    _client = new ProductServiceClient(
      GRPC_HOST,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
}

export async function getProducts(): Promise<Product[]> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.getProducts({}, (err, res) => {
      if (err) return reject(err);
      const products = (res?.products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        bom: p.bom.map((b) => ({
          dry_supply_id: b.drySupplyId,
          quantity_per_unit: Number(b.quantityPerUnit),
        })),
      }));
      resolve(products);
    });
  });
}

export async function getProductByID(id: string): Promise<Product> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.getProductById({ id }, (err, res) => {
      if (err) return reject(err);
      if (!res) return reject(new Error("No response from server"));
      resolve({
        id: res.id,
        name: res.name,
        bom: res.bom.map((b) => ({
          dry_supply_id: b.drySupplyId,
          quantity_per_unit: Number(b.quantityPerUnit),
        })),
      });
    });
  });
}

export async function createProduct(
  name: string,
  bom: BillOfDrySupply[],
): Promise<void> {
  const client = getClient();
  return new Promise((resolve, reject) => {
    client.createProduct(
      {
        name,
        bom: bom.map((b) => ({
          drySupplyId: b.dry_supply_id,
          quantityPerUnit: b.quantity_per_unit,
        })),
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      },
    );
  });
}
