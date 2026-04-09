import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import type { Plot, LatLng } from "./types";

const PROTO_PATH = path.join(process.cwd(), "src/proto/vineyard.proto");
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
  client = new proto.vineyard.VineyardService(
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

function mapPlot(r: any): Plot {
  return {
    id:      r.id,
    name:    r.name,
    variety: r.variety,
    ha:      Number(r.ha),
    age:     Number(r.age),
    status:  r.status,
    polygon: (r.polygon ?? []).map((ll: any) => ({ lat: Number(ll.lat), lng: Number(ll.lng) })),
  };
}

export async function getPlots(token?: string): Promise<Plot[]> {
  const r = await call<{ plots: any[] }>("GetPlots", {}, token);
  return (r.plots ?? []).map(mapPlot);
}

export async function getPlotByID(id: string, token?: string): Promise<Plot> {
  const r = await call<any>("GetPlotByID", { id }, token);
  return mapPlot(r);
}

export async function createPlot(
  input: Omit<Plot, "id">,
  token?: string
): Promise<Plot> {
  const r = await call<any>("CreatePlot", toProtoInput(input), token);
  return mapPlot(r);
}

export async function updatePlot(
  id: string,
  input: Omit<Plot, "id">,
  token?: string
): Promise<Plot> {
  const r = await call<any>("UpdatePlot", { id, ...toProtoInput(input) }, token);
  return mapPlot(r);
}

export async function deletePlot(id: string, token?: string): Promise<void> {
  await call<any>("DeletePlot", { id }, token);
}

function toProtoInput(p: Omit<Plot, "id">) {
  return {
    name:    p.name,
    variety: p.variety,
    ha:      p.ha,
    age:     p.age,
    status:  p.status,
    polygon: p.polygon.map((ll: LatLng) => ({ lat: ll.lat, lng: ll.lng })),
  };
}
