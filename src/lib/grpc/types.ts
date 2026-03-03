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

export interface SaleOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleOrder {
  id: string;
  customer_id: string;
  status: string;
  items: SaleOrderItem[];
  created_at: string;
}

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
