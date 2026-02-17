import api from "./axios";

export interface Customer {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  address?: string;
  telephone?: string;
  description?: string;
  added_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerPayload {
  first_name: string;
  last_name: string;
  middle_name?: string;
  address?: string;
  telephone?: string;
  description?: string;
  added_by: number;
}

// Get user ID from localStorage
export const getUserId = (): number => {
  const userData = localStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.id || 1;
    } catch {
      return 1;
    }
  }
  return 1;
};

// Create a new customer
export const createCustomer = (data: Omit<CreateCustomerPayload, "added_by">) => {
  const payload: CreateCustomerPayload = {
    ...data,
    added_by: getUserId(),
  };
  return api.post("/pos/customer", payload);
};

// Get customers list
export const getCustomers = (page = 1, limit = 10, search = "") => {
  return api.get("/pos/customers", { params: { page, limit, search } });
};
