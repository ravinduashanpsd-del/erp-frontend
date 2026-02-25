import api from "./axios";

export const getInvoices = () => api.get("/pos/invoices");

export const createInvoice = (data: {
  customer_id: number;
  status?: string;
  previous_invoice_id?: number | null;
  paid_amount?: number;
  total_amount: number;
  discount_type?: string;
  discount_amount?: number;
  next_box_number?: number;
  created_user_id?: number;
}) => api.post("/pos/invoice", data);



export const addInvoiceItem = (
  invoiceId: number,
  data: {
    stock_id: number;
    quantity: number;
    selling_price?: number;
    discount_type?: string;
    discount_amount?: number;
  }
) => api.post(`/pos/invoice/${invoiceId}/item`, data);


export const updateInvoiceItem = (
  invoiceId: number,
  invoiceItemId: number,
  data: {
    stock_id?: number;
    quantity?: number;
    selling_price?: number;
    discount_type?: string;
    discount_amount?: number;
  }
) => api.patch(`/pos/invoice/${invoiceId}/item/${invoiceItemId}`, data);

export const deleteInvoiceItem = (invoiceId: number, invoiceItemId: number) =>
  api.delete(`/pos/invoice/${invoiceId}/item/${invoiceItemId}`);

export const sendInvoice = (invoiceId: number) =>
  api.patch(`/pos/invoice/${invoiceId}`, {
    status: "PENDING"
  });

export const getInvoiceById = (id: number) => {
  return api.get(`/pos/invoice/${id}`);
};



// Update invoice fields (status, paid_amount, etc.)
export const updateInvoice = (invoiceId: number, data: Record<string, any>) =>
  api.patch(`/pos/invoice/${invoiceId}`, data);

// Mark an invoice as CANCELLED.
// Note: backend may expect "CANCELLED" or "CANCELED". We try "CANCELLED" first in the UI layer.
export const cancelInvoice = (invoiceId: number) =>
  updateInvoice(invoiceId, { status: "CANCELLED" });


