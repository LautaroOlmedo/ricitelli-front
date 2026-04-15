import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.join(process.cwd(), "src/proto/reporting.proto");
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
    includeDirs: ["/usr/include"],
  });
  const proto = grpc.loadPackageDefinition(pkg) as any;
  client = new proto.reporting.ReportingService(
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

export interface ReportFilter {
  from_date?: string;
  to_date?: string;
  customer_id?: string;
  market?: string;
  currency?: string;
  product_id?: string;
}

export interface ReportResponse {
  id: string;
  type: string;
  filename: string;
  download_url: string;
  generated_at: string;
  file_size: number;
  from_date: string;
  to_date: string;
}

export interface ListReportsResponse {
  reports: ReportResponse[];
  total_count: number;
}

function mapResponse(r: any): ReportResponse {
  return {
    id: r.id ?? "",
    type: r.type ?? "",
    filename: r.filename ?? "",
    download_url: r.download_url ?? "",
    generated_at: r.generated_at ?? "",
    file_size: Number(r.file_size ?? 0),
    from_date: r.from_date ?? "",
    to_date: r.to_date ?? "",
  };
}

export async function generateSalesReport(filter: ReportFilter, token?: string): Promise<ReportResponse> {
  return mapResponse(await call<any>("GenerateSalesReport", filter, token));
}

export async function generateProductionReport(filter: ReportFilter, token?: string): Promise<ReportResponse> {
  return mapResponse(await call<any>("GenerateProductionReport", filter, token));
}

export async function generateGeneralReport(filter: ReportFilter, token?: string): Promise<ReportResponse> {
  return mapResponse(await call<any>("GenerateGeneralReport", filter, token));
}

export async function generateLowStockReport(token?: string): Promise<ReportResponse> {
  return mapResponse(await call<any>("GenerateLowStockReport", {}, token));
}

export async function generateLotTraceabilityReport(lotNumber: string, token?: string): Promise<ReportResponse> {
  return mapResponse(await call<any>("GenerateLotTraceabilityReport", { lot_number: lotNumber }, token));
}

export async function generateCustomerReport(
  customerID: string,
  fromDate: string,
  toDate: string,
  token?: string,
): Promise<ReportResponse> {
  return mapResponse(
    await call<any>("GenerateCustomerReport", { customer_id: customerID, from_date: fromDate, to_date: toDate }, token),
  );
}

export async function listReports(type: string, page: number, pageSize: number, token?: string): Promise<ListReportsResponse> {
  const r = await call<any>("ListReports", { type, page, page_size: pageSize }, token);
  return {
    reports: (r.reports ?? []).map(mapResponse),
    total_count: Number(r.total_count ?? 0),
  };
}
