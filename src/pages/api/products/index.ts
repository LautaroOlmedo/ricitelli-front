import type { APIRoute } from "astro";
import {
  getProducts,
  createProduct,
} from "@/lib/grpc/productClient";
import type { BillOfDrySupply } from "@/lib/grpc/types";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const products = await getProducts(token);
    return Response.json(products);
  } catch (err: any) {
    return Response.json(
      { error: err.details ?? err.message ?? "gRPC server error" },
      { status: 503 }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;
  try {
    const body = await request.json();

    const name: string = (body.name ?? "").trim();
    const sku: string = (body.sku ?? "").trim();
    const bom: BillOfDrySupply[] = Array.isArray(body.bom) ? body.bom : [];

    if (!name) return Response.json({ error: "name is required" }, { status: 400 });
    if (!sku)  return Response.json({ error: "sku is required" }, { status: 400 });

    await createProduct(name, bom, token, sku);
    return new Response(null, { status: 201 });
  } catch (err: any) {
    // gRPC INVALID_ARGUMENT = status code 3
    const status = err.code === 3 ? 400 : 503;
    return Response.json(
      { error: err.details ?? err.message ?? "gRPC server error" },
      { status }
    );
  }
};
