import type { APIRoute } from "astro";
import { listReports } from "@/lib/grpc/reportingClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const type = url.searchParams.get("type") ?? "";
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("page_size") ?? 50);
    const result = await listReports(type, page, pageSize, token);
    // Decorate download_url with token for browser-initiated downloads.
    const withToken = {
      ...result,
      reports: result.reports.map((r) => ({
        ...r,
        download_url: r.download_url.includes("?")
          ? `${r.download_url}&token=${encodeURIComponent(token ?? "")}`
          : `${r.download_url}?token=${encodeURIComponent(token ?? "")}`,
      })),
    };
    return new Response(JSON.stringify(withToken), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.details ?? e.message }), { status: 500 });
  }
};
