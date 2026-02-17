// src/api/items.ts
export interface InvoiceItem {
  id: number;
  stockId?: number;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  qty: number;
}
import api from "./axios";

export const getItems = (name?: string) => {
  return api.get("/store/items", { params: { name } });
};
