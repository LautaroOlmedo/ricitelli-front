import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { Customer, CreateCustomerInput, PlaceOrderInput, SaleOrder } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/customer.proto");
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
    _client = new proto.customer.CustomerService(
      HOST,
      grpc.credentials.createInsecure()
    );
  }
  return _client;
}

function mapCustomer(r: any): Customer {
  return {
    id: r.id ?? "",
    social_reason: r.social_reason ?? "",
    market_type: r.market_type ?? "",
    group: r.group ?? "",
    active: r.active ?? false,
    created_at: r.created_at ?? "",
  };
}

export async function getCustomers(): Promise<Customer[]> {
  return new Promise((resolve, reject) => {
    getClient().GetCustomers({}, (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.customers ?? []).map(mapCustomer));
    });
  });
}

export async function getCustomerByID(id: string): Promise<Customer> {
  return new Promise((resolve, reject) => {
    getClient().GetCustomerByID({ id }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapCustomer(res));
    });
  });
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return new Promise((resolve, reject) => {
    getClient().CreateCustomer(input, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapCustomer(res));
    });
  });
}

export async function deactivateCustomer(id: string): Promise<Customer> {
  return new Promise((resolve, reject) => {
    getClient().DeactivateCustomer({ id }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(mapCustomer(res));
    });
  });
}

export async function placeOrder(input: PlaceOrderInput): Promise<SaleOrder> {
  return new Promise((resolve, reject) => {
    getClient().PlaceOrder(input, (err: any, res: any) => {
      if (err) return reject(err);
      resolve({
        id: res.id ?? "",
        customer_id: res.customer_id ?? "",
        status: res.status ?? "NEW",
        items: res.items ?? [],
        created_at: res.created_at ?? "",
        currency: res.currency ?? "ARS",
        market: res.market ?? "DOMESTIC",
        destination_country: res.destination_country ?? "",
        sale_type: res.sale_type ?? "SALE",
      });
    });
  });
}

export async function searchCustomersBySocialReason(query: string): Promise<Customer[]> {
  return new Promise((resolve, reject) => {
    getClient().SearchCustomersBySocialReason({ query }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve((res?.customers ?? []).map(mapCustomer));
    });
  });
}

export async function getOrdersByCustomer(customerId: string): Promise<SaleOrder[]> {
  return new Promise((resolve, reject) => {
    getClient().GetOrdersByCustomer({ customer_id: customerId }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(
        (res?.orders ?? []).map((r: any) => ({
          id: r.id ?? "",
          customer_id: r.customer_id ?? "",
          status: r.status ?? "NEW",
          items: r.items ?? [],
          created_at: r.created_at ?? "",
          currency: r.currency ?? "ARS",
          market: r.market ?? "DOMESTIC",
          destination_country: r.destination_country ?? "",
          sale_type: r.sale_type ?? "SALE",
        }))
      );
    });
  });
}
