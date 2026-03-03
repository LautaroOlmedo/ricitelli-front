import type { APIRoute } from "astro";
import {
  getProducts,
  createProduct,
} from "@/lib/grpc/productClient";
import type { BillOfDrySupply } from "@/lib/grpc/types";

export const GET: APIRoute = async () => {
  try {
    const products = await getProducts();
    return Response.json(products);
  } catch (err: any) {
    return Response.json(
      { error: err.details ?? err.message ?? "gRPC server error" },
      { status: 503 }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const name: string = (body.name ?? "").trim();
    const bom: BillOfDrySupply[] = Array.isArray(body.bom) ? body.bom : [];

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    await createProduct(name, bom);
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
