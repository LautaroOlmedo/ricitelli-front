import type { APIRoute } from "astro";
import { getSaleOrders } from "@/lib/grpc/saleOrderClient";
import { getProducts } from "@/lib/grpc/productClient";

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get("token")?.value;

  try {
    const [orders, products] = await Promise.all([
      getSaleOrders(token),
      getProducts(token),
    ]);

    // ── Pipeline by status ──────────────────────────────────────────────────
    const statusCounts: Record<string, number> = {
      NEW: 0, CONFIRMED: 0, INVOICED: 0, DISPATCHED: 0, CANCELLED: 0,
    };
    for (const o of orders) {
      if (o.status in statusCounts) statusCounts[o.status]++;
    }

    // ── Revenue by currency (active orders only, not CANCELLED) ─────────────
    const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
    const revenueUSD = activeOrders
      .filter((o) => o.currency === "USD")
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.unit_price * i.quantity, 0), 0);
    const revenueARS = activeOrders
      .filter((o) => o.currency === "ARS")
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.unit_price * i.quantity, 0), 0);

    // ── Total bottles committed (active orders) ──────────────────────────────
    const totalBottles = activeOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    // ── Bottles by country (export only) ────────────────────────────────────
    const bottlesByCountry: Record<string, number> = {};
    for (const o of activeOrders) {
      if (o.market === "EXPORT" && o.destination_country) {
        const country = o.destination_country.toUpperCase();
        const qty = o.items.reduce((s, i) => s + i.quantity, 0);
        bottlesByCountry[country] = (bottlesByCountry[country] ?? 0) + qty;
      }
    }

    // ── Top products by quantity sold ────────────────────────────────────────
    const productQty: Record<string, number> = {};
    for (const o of activeOrders) {
      for (const item of o.items) {
        productQty[item.product_id] = (productQty[item.product_id] ?? 0) + item.quantity;
      }
    }
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
    const topProducts = Object.entries(productQty)
      .map(([id, qty]) => ({ id, name: productMap[id] ?? id, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // ── Export market share ──────────────────────────────────────────────────
    const exportOrders = activeOrders.filter((o) => o.market === "EXPORT").length;
    const domesticOrders = activeOrders.filter((o) => o.market === "DOMESTIC").length;

    // ── Orders by market + currency breakdown ────────────────────────────────
    const marketBreakdown = {
      export: {
        count: exportOrders,
        bottles: activeOrders
          .filter((o) => o.market === "EXPORT")
          .reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0),
      },
      domestic: {
        count: domesticOrders,
        bottles: activeOrders
          .filter((o) => o.market === "DOMESTIC")
          .reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0),
      },
    };

    // ── Recent orders (last 5) ───────────────────────────────────────────────
    const recentOrders = [...orders]
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        customer_id: o.customer_id,
        status: o.status,
        market: o.market,
        currency: o.currency,
        destination_country: o.destination_country,
        bottles: o.items.reduce((s, i) => s + i.quantity, 0),
        value: o.items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
        created_at: o.created_at,
      }));

    return new Response(
      JSON.stringify({
        kpis: {
          total_active_orders: activeOrders.length,
          total_bottles: totalBottles,
          revenue_usd: revenueUSD,
          revenue_ars: revenueARS,
          export_markets: Object.keys(bottlesByCountry).length,
        },
        pipeline: statusCounts,
        bottles_by_country: bottlesByCountry,
        top_products: topProducts,
        market_breakdown: marketBreakdown,
        recent_orders: recentOrders,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
