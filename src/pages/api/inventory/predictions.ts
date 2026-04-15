import type { APIRoute } from "astro";
import { getSaleOrders } from "@/lib/grpc/saleOrderClient";
import { getProducts } from "@/lib/grpc/productClient";
import { getDrySupplies } from "@/lib/grpc/drySupplyClient";
import { getInventoryReport } from "@/lib/grpc/inventoryClient";
import { getCustomers } from "@/lib/grpc/customerClient";
import { COOKIE_NAME } from "@/lib/auth";

// ── Estimation: days until an order typically needs fulfillment ───────────────
const URGENCY_DAYS: Record<string, number> = {
  INVOICED:  2,
  CONFIRMED: 5,
  NEW:       12,
};

function daysToLabel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const weekdays = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const months   = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export interface OrderAtRisk {
  order_id: string;
  customer_name: string;
  quantity_contribution: number;
  status: string;
  market: string;
  destination_country: string;
  currency: string;
  urgency_days: number;
}

export interface SupplyPrediction {
  dry_supply_id: string;
  code: string;
  name: string;
  category: string;
  available_stock: number;
  committed_stock: number;
  total_needed: number;
  shortfall: number;
  coverage_pct: number;
  is_critical: boolean;
  is_warning: boolean;
  orders_at_risk: OrderAtRisk[];
  days_until_stockout: number;
  stockout_day_label: string;
  natural_message: string;
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(COOKIE_NAME)?.value;

  try {
    // ── Fetch all required data in parallel ───────────────────────────────────
    const [orders, products, drySupplies, report, customers] = await Promise.all([
      getSaleOrders(token),
      getProducts(token),
      getDrySupplies(token),
      getInventoryReport(token),
      getCustomers(token).catch(() => [] as any[]),
    ]);

    // ── Build lookup maps ─────────────────────────────────────────────────────
    const productMap  = new Map(products.map((p) => [p.id, p]));
    const customerMap = new Map(customers.map((c: any) => [c.id, c.social_reason as string]));
    const supplyMap   = new Map(drySupplies.map((s) => [s.id, s]));
    const alertMap    = new Map(report.dry_supply_alerts.map((a) => [a.dry_supply_id, a]));

    // ── Filter to active orders only ──────────────────────────────────────────
    const activeOrders = orders.filter((o) =>
      ["NEW", "CONFIRMED", "INVOICED"].includes(o.status ?? "")
    );

    // ── Accumulate demand per dry supply ──────────────────────────────────────
    // demand[supplyId] = { total: number, orders: OrderAtRisk[] }
    const demand = new Map<string, { total: number; orders: OrderAtRisk[] }>();

    for (const order of activeOrders) {
      const urgency     = URGENCY_DAYS[order.status] ?? 12;
      const customerName = customerMap.get(order.customer_id) ?? `#${order.id.slice(0, 8).toUpperCase()}`;

      for (const item of order.items ?? []) {
        const product = productMap.get(item.product_id);
        if (!product?.bom?.length) continue;

        for (const bom of product.bom) {
          const needed = bom.quantity_per_unit * (item.quantity ?? 0);
          if (needed <= 0) continue;

          if (!demand.has(bom.dry_supply_id)) {
            demand.set(bom.dry_supply_id, { total: 0, orders: [] });
          }
          const entry = demand.get(bom.dry_supply_id)!;
          entry.total += needed;

          // Accumulate contribution from the same order (multiple products may share supplies)
          const existing = entry.orders.find((o) => o.order_id === order.id);
          if (existing) {
            existing.quantity_contribution += needed;
          } else {
            entry.orders.push({
              order_id:              order.id,
              customer_name:         customerName,
              quantity_contribution: needed,
              status:                order.status ?? "",
              market:                order.market ?? "",
              destination_country:   order.destination_country ?? "",
              currency:              order.currency ?? "",
              urgency_days:          urgency,
            });
          }
        }
      }
    }

    // ── Build predictions ─────────────────────────────────────────────────────
    const predictions: SupplyPrediction[] = [];

    for (const [supplyId, { total, orders: riskOrders }] of demand.entries()) {
      const supply = supplyMap.get(supplyId);
      const alert  = alertMap.get(supplyId);

      const available  = alert?.available   ?? supply?.reorder_point ?? 0;
      const committed  = alert?.committed   ?? 0;
      const shortfall  = Math.max(0, total - available);
      const coveragePct = total > 0 ? Math.round((available / total) * 100) : 100;
      const isCritical  = shortfall > 0;
      const isWarning   = !isCritical && coveragePct < 125; // < 25% buffer

      // Only surface at-risk supplies
      if (!isCritical && !isWarning) continue;

      // Most urgent contributing order
      const sorted      = [...riskOrders].sort((a, b) => a.urgency_days - b.urgency_days);
      const mostUrgent  = sorted[0];
      const daysUntil   = mostUrgent?.urgency_days ?? 7;
      const dayLabel    = daysToLabel(daysUntil);

      const name = supply?.name ?? alert?.name ?? supplyId;
      const code = supply?.code ?? alert?.code ?? "";

      // ── Natural language message ────────────────────────────────────────────
      const totalOrders    = riskOrders.length;
      const confirmedCount = riskOrders.filter((o) => ["CONFIRMED", "INVOICED"].includes(o.status)).length;
      const exportOrders   = riskOrders.filter((o) => o.market === "EXPORT");
      const destinations   = [...new Set(exportOrders.map((o) => o.destination_country).filter(Boolean))].join(", ");

      let msg: string;
      if (isCritical) {
        const exportFragment = exportOrders.length > 0
          ? ` (${exportOrders.length} export${destinations ? " → " + destinations : ""})`
          : "";
        msg = confirmedCount > 0
          ? `Con los ${totalOrders} pedido${totalOrders !== 1 ? "s" : ""} activos${exportFragment}, te faltan ${shortfall.toLocaleString("es-AR")} unidades de "${name}". Sin reposición, no podés cumplir antes del ${dayLabel}.`
          : `Los ${totalOrders} pedidos pendientes requieren ${total.toLocaleString("es-AR")} unidades de "${name}" pero solo tenés ${available.toLocaleString("es-AR")} disponibles. Faltante: ${shortfall.toLocaleString("es-AR")} un.`;
      } else {
        const buffer = Math.round(available - total);
        msg = `Stock de "${name}" ajustado: cubrís los pedidos actuales pero con solo ${buffer.toLocaleString("es-AR")} unidades de margen (${coveragePct}%). Si entra un pedido nuevo, puede faltar.`;
      }

      predictions.push({
        dry_supply_id:      supplyId,
        code,
        name,
        category:           supply?.category ?? "",
        available_stock:    available,
        committed_stock:    committed,
        total_needed:       total,
        shortfall,
        coverage_pct:       coveragePct,
        is_critical:        isCritical,
        is_warning:         isWarning,
        orders_at_risk:     sorted,
        days_until_stockout: daysUntil,
        stockout_day_label:  dayLabel,
        natural_message:    msg,
      });
    }

    // Sort: critical first, then by shortfall descending
    predictions.sort((a, b) => {
      if (a.is_critical !== b.is_critical) return a.is_critical ? -1 : 1;
      return b.shortfall - a.shortfall;
    });

    return new Response(JSON.stringify(predictions), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.details ?? e.message ?? "Error al calcular predicciones" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
