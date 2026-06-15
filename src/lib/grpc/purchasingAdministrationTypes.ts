export interface Supplier {
  id: string; tax_id: string; social_reason: string; trade_name: string; email: string;
  phone: string; address: string; active: boolean; idempotency_key: string; created_at: string; updated_at: string;
}
export type CreateSupplierInput = Pick<Supplier, "tax_id" | "social_reason" | "trade_name" | "email" | "phone" | "address" | "idempotency_key">;
export type UpdateSupplierInput = Pick<Supplier, "id" | "tax_id" | "social_reason" | "trade_name" | "email" | "phone" | "address">;

export interface PurchaseNeedItem {
  id?: string; purchase_need_id?: string; line_number: number; dry_supply_id: string; description: string; quantity: string; unit: string;
}
export interface PurchaseNeed {
  id: string; need_number: string; requested_date: string; required_by_date: string; status: string; notes: string;
  idempotency_key: string; created_at: string; updated_at: string; items: PurchaseNeedItem[];
}
export interface CreatePurchaseNeedInput {
  need_number: string; requested_date: string; required_by_date: string; notes: string; idempotency_key: string; items: PurchaseNeedItem[];
}

export interface SupplierQuoteItem extends PurchaseNeedItem {
  supplier_quote_id?: string; purchase_need_item_id: string; unit_price: string; tax_rate: string;
  net_amount: string; tax_amount: string; total_amount: string;
}
export interface SupplierQuote {
  id: string; supplier_id: string; purchase_need_id: string; quote_number: string; quote_date: string; valid_until: string;
  currency: string; exchange_rate: string; subtotal: string; tax_total: string; total_amount: string; status: string;
  idempotency_key: string; created_at: string; updated_at: string; items: SupplierQuoteItem[];
}
export type CreateSupplierQuoteInput = Omit<SupplierQuote, "id" | "status" | "created_at" | "updated_at">;

export interface SupplierInvoiceItem extends Omit<SupplierQuoteItem, "supplier_quote_id" | "purchase_need_item_id"> {
  supplier_invoice_id?: string; supplier_quote_item_id: string;
}
export interface SupplierInvoice {
  id: string; supplier_id: string; supplier_quote_id: string; document_type: string; point_of_sale: number; document_number: string;
  issue_date: string; due_date: string; currency: string; exchange_rate: string; subtotal: string; tax_total: string;
  total_amount: string; status: string; idempotency_key: string; created_at: string; updated_at: string; items: SupplierInvoiceItem[];
}
export type CreateSupplierInvoiceInput = Omit<SupplierInvoice, "id" | "status" | "created_at" | "updated_at">;

export interface SupplierPaymentAllocation {
  id?: string; supplier_payment_id?: string; supplier_invoice_id: string; allocated_amount: string;
}
export interface SupplierPayment {
  id: string; supplier_id: string; payment_number: string; payment_date: string; currency: string; exchange_rate: string;
  amount: string; payment_method: string; payment_reference: string; status: string; idempotency_key: string;
  created_at: string; updated_at: string; allocations: SupplierPaymentAllocation[];
}
export type CreateSupplierPaymentInput = Omit<SupplierPayment, "id" | "status" | "created_at" | "updated_at">;

export interface SupplierInvoiceBalance {
  supplier_invoice_id: string; supplier_id: string; document_type: string; point_of_sale: number; document_number: string;
  issue_date: string; currency: string; total_amount: string; allocated_amount: string; outstanding_amount: string;
}
export interface SupplierOutstandingBalance {
  supplier_id: string; currency: string; total_outstanding: string; invoices: SupplierInvoiceBalance[];
}
export interface VATPositionLine { tax_rate: string; sales_debit: string; purchase_credit: string; net_vat: string; }
export interface MonthlyVATPosition {
  month: string; sales_debit_total: string; purchase_credit_total: string; net_vat: string; lines: VATPositionLine[];
}
