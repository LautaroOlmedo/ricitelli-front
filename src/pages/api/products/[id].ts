import type { APIRoute } from "astro";
import { getProductByID } from "@/lib/grpc/productClient";

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const product = await getProductByID(id);
    return Response.json(product);
  } catch (err: any) {
    // gRPC NOT_FOUND = status code 5
    const status = err.code === 5 ? 404 : 503;
    return Response.json(
      { error: err.details ?? err.message ?? "gRPC server error" },
      { status }
    );
  }
};
