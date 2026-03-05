// ── Products ──────────────────────────────────────────────────────────────

export interface BillOfDrySupply {
  dry_supply_id: string;
  quantity_per_unit: number;
}

export interface Product {
  id: string;
  name: string;
  bom: BillOfDrySupply[];
}

export interface CreateProductInput {
  name: string;
  bom: BillOfDrySupply[];
}

// ── Sale Orders ───────────────────────────────────────────────────────────

export interface SaleOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleOrder {
  id: string;
  customer_id: string;
  status: string;        // NEW | CONFIRMED | INVOICED | DISPATCHED | CANCELLED
  items: SaleOrderItem[];
  created_at: string;
  currency: string;           // ARS | USD | CAD | EUR
  market: string;             // DOMESTIC | EXPORT
  destination_country: string;
  sale_type: string;          // SALE | SAMPLE_CUSTOMS | GIFT | INTERNAL | COMMERCIAL_SAMPLE
}

export interface CreateSaleOrderInput {
  customer_id: string;
  items: SaleOrderItem[];
  currency?: string;
  market?: string;
  destination_country?: string;
  sale_type?: string;
}

// ── Production Orders ─────────────────────────────────────────────────────

export interface MaterialRequirement {
  dry_supply_id: string;
  quantity: number;
}

export interface ProductionItem {
  product_id: string;
  quantity: number;
  requirements: MaterialRequirement[];
}

export interface ProductionOrder {
  id: string;
  sale_order_id: string;
  items: ProductionItem[];
  status: string;
  created_at: string;
}

// ── Dry Supplies ──────────────────────────────────────────────────────────

export interface DrySupply {
  id: string;
  code: string;     // SKU, e.g. "HEYM-CTR-JP"
  name: string;
  category: string; // LABEL | CONTRAETIQUETA | BOX | CORK | CAPSULE | BOTTLE | OTHER
  unit: string;     // UNIT | BOX | KG
}

export interface StockTricapa {
  dry_supply_id: string;
  code: string;
  name: string;
  physical_stock: number;   // total IN - CONSUMED
  committed_stock: number;  // reserved for production orders
  available_stock: number;  // physical - committed
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  social_reason: string;
  market_type: string; // INTERNAL | EXTERNAL
  group: string;       // DISTRIBUTOR | WINE_SHOP | RESTAURANT | HOTEL | RETAIL | PRIVATE | EXPORT_AGENT
  active: boolean;
  created_at: string;
}

export interface CreateCustomerInput {
  social_reason: string;
  market_type: string;
  group: string;
}

export interface PlaceOrderInput {
  customer_id: string;
  items: SaleOrderItem[];
  currency?: string;
  destination_country?: string;
  sale_type?: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────

export interface ProductTricapa {
  product_id: string;
  product_name: string;
  sku: string;
  undressed_stock: number;    // SV — Sin Vestir (physical)
  dressed_physical: number;   // PT — Producto Terminado (physical)
  dressed_committed: number;  // PT committed for sale orders
  dressed_available: number;  // PT available = physical - committed
}

export interface DrySupplyAlert {
  dry_supply_id: string;
  code: string;
  name: string;
  physical: number;
  committed: number;
  available: number;
  is_low: boolean;
}

export interface InventoryReport {
  products: ProductTricapa[];
  dry_supply_alerts: DrySupplyAlert[];
}
