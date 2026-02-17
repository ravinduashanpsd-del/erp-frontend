export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export interface InvoiceItem {
  id: number;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  qty: number;
}
