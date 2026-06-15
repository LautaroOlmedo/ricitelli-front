export type SalesDocumentKind = "invoices" | "remittances" | "receipts";

export interface ListSalesAdministrationFilters {
  customer_id?: string;
  sale_order_id?: string;
  status?: string;
}

export interface SalesInvoiceItem {
  line_number: number;
  product_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  net_amount: string;
  tax_amount: string;
  total_amount: string;
}

export interface SalesInvoice {
  id: string;
  customer_id: string;
  sale_order_id: string;
  document_type: string;
  point_of_sale: number;
  document_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  exchange_rate: string;
  subtotal: string;
  tax_total: string;
  total_amount: string;
  status: string;
  idempotency_key: string;
  items: SalesInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export type CreateSalesInvoiceInput = Omit<SalesInvoice, "id" | "status" | "created_at" | "updated_at">;

export interface RemittanceItem {
  line_number: number;
  product_id: string;
  description: string;
  quantity: string;
  lot_number: string;
}

export interface Remittance {
  id: string;
  customer_id: string;
  sale_order_id: string;
  sales_invoice_id: string;
  point_of_sale: number;
  document_number: string;
  issue_date: string;
  delivery_date: string;
  status: string;
  idempotency_key: string;
  items: RemittanceItem[];
  created_at: string;
  updated_at: string;
}

export type CreateRemittanceInput = Omit<Remittance, "id" | "status" | "created_at" | "updated_at">;

export interface CustomerReceiptAllocation {
  sales_invoice_id: string;
  allocated_amount: string;
}

export interface CustomerReceipt {
  id: string;
  customer_id: string;
  receipt_number: string;
  receipt_date: string;
  currency: string;
  exchange_rate: string;
  amount: string;
  payment_method: string;
  payment_reference: string;
  status: string;
  idempotency_key: string;
  allocations: CustomerReceiptAllocation[];
  created_at: string;
  updated_at: string;
}

export type CreateCustomerReceiptInput = Omit<CustomerReceipt, "id" | "status" | "created_at" | "updated_at">;

export interface InvoiceOutstandingBalance {
  sales_invoice_id: string;
  outstanding_balance: string;
}

export type SalesDocument = SalesInvoice | Remittance | CustomerReceipt;
