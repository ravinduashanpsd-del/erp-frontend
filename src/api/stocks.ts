// stocks.ts
import api from "./axios";

export const getStocksByOutlet = (outletId: number) => {
  return api.get(`/store/stocks/${outletId}`);
};