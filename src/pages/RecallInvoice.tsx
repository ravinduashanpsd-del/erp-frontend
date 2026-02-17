import { useEffect, useState } from "react";
import { getInvoices, getInvoiceById } from "../api/invoice";
import { getCustomers } from "../api/customers";
import Pagination from "../components/Pagination";

interface RecallInvoiceProps {
  onClose: () => void;
  onSelect?: (invoice: Invoice) => void;
}

interface Invoice {
  id: number;
  previous_invoice_id: number | null;
  customer_id: number;
  created_at: string;
  updated_at: string;
  created_user_id: number;
  status: string;
  paid_amount: number;
  total_amount: number;
  discount_type: string;
  discount_amount: number;
  next_box_number: number;
  invoice_no?: string;
  created_user?: {
    username: string;
    first_name: string;
    last_name: string;
  };
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    address?: string;
    telephone?: string;
  };
  invoice_items?: any[];
}


// Normalize and read invoice fields safely because backend responses can vary by version.
const normalizeStatus = (status?: string) => {
  const s = (status || "").toUpperCase();
  // Some backends return SENT for invoices that are still recallable
  if (s === "SENT") return "PENDING";
  return s || "UNKNOWN";
};

const getCustomerIdFromInvoice = (inv: any): number | null => {
  const raw =
    inv?.customer_id ??
    inv?.customerId ??
    inv?.customerID ??
    inv?.customer?.id ??
    (typeof inv?.customer === "number" ? inv.customer : null);

  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};


const getCustomerName = (inv: any, customersById: Record<number, any>) => {
  // 1) If invoice already contains customer name (varies by backend)
  const direct = inv?.customer;

  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (typeof inv?.customer_name === "string" && inv.customer_name.trim()) return inv.customer_name.trim();
  if (typeof inv?.customerName === "string" && inv.customerName.trim()) return inv.customerName.trim();

  const directName = direct?.name || direct?.full_name;
  if (typeof directName === "string" && directName.trim()) return directName.trim();

  const first =
    direct?.first_name ??
    direct?.firstName ??
    inv?.customer_first_name ??
    inv?.customerFirstName ??
    "";
  const last =
    direct?.last_name ??
    direct?.lastName ??
    inv?.customer_last_name ??
    inv?.customerLastName ??
    "";

  const directFull = `${first || ""} ${last || ""}`.trim();
  if (directFull) return directFull;

  // 2) Lookup from customers map
  const cid = getCustomerIdFromInvoice(inv);
  if (cid && customersById[cid]) {
    const c = customersById[cid];
    const fullFromMap = (c?.name || c?.full_name || "").toString().trim();
    if (fullFromMap) return fullFromMap;

    const fn = (c?.first_name ?? c?.firstName ?? "").toString();
    const ln = (c?.last_name ?? c?.lastName ?? "").toString();
    const full = `${fn} ${ln}`.trim();
    return full || `Customer ${cid}`;
  }

  // 3) Fallback
  return cid ? `Customer ${cid}` : "Customer";
};



const ITEMS_PER_PAGE = 10;

const RecallInvoice = ({ onClose, onSelect }: RecallInvoiceProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [customersById, setCustomersById] = useState<Record<number, any>>({});

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);

const fetchAllCustomers = async () => {
  const LIMIT = 200;
  const all: any[] = [];

  for (let page = 1; page <= 50; page++) {
    const res = await getCustomers(page, LIMIT, "");
    const d = res.data;

    let arr: any[] = [];
    if (Array.isArray(d)) arr = d;
    else if (Array.isArray(d?.data)) arr = d.data;
    else if (Array.isArray(d?.customers)) arr = d.customers;
    else if (Array.isArray(d?.data?.customers)) arr = d.data.customers;
    else if (Array.isArray(d?.data?.data)) arr = d.data.data;

    if (!arr || arr.length === 0) break;

    all.push(...arr);
    if (arr.length < LIMIT) break;
  }

  return all;
};

const [invRes, customersArr] = await Promise.all([
  getInvoices(),
  fetchAllCustomers(),
]);

// ---- Customers ----
const map: Record<number, any> = {};
customersArr.forEach((c: any) => {
  const id = Number(c?.id ?? c?.customer_id ?? c?.customerId);
  if (!Number.isFinite(id) || id <= 0) return;

  map[id] = {
    ...c,
    id,
    first_name: c?.first_name ?? c?.firstName ?? c?.name ?? "",
    last_name: c?.last_name ?? c?.lastName ?? "",
    full_name: c?.full_name ?? c?.fullName ?? c?.name ?? "",
  };
});
setCustomersById(map);


      // ---- Invoices ----
      let invoicesData: Invoice[] = [];

      if (Array.isArray(invRes.data)) {
        invoicesData = invRes.data;
      } else if (Array.isArray(invRes.data?.data)) {
        invoicesData = invRes.data.data;
      } else if (invRes.data?.data && typeof invRes.data.data === "object") {
        invoicesData = (invRes.data.data as any).invoices || [];
      } else if (invRes.data && typeof invRes.data === "object") {
        const values = Object.values(invRes.data);
        if (values.length > 0 && Array.isArray(values[0])) {
          invoicesData = values[0] as Invoice[];
        }
      }

      // Attach customer object if backend didn't include it
      invoicesData = invoicesData.map((inv) => ({
        ...inv,
        customer: inv.customer || (getCustomerIdFromInvoice(inv) ? map[getCustomerIdFromInvoice(inv) as number] : undefined),
      }));

      // ✅ Only show recallable (pending) invoices
      const recallableOnly = invoicesData.filter((inv) => {
        const st = normalizeStatus(inv.status);
        return st === "PENDING" || st === "ACTIVE";
      });

      setInvoices(recallableOnly);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.id.toString().includes(search) ||
    (invoice.invoice_no && invoice.invoice_no.toLowerCase().includes(search.toLowerCase())) ||
    invoice.created_at.toLowerCase().includes(search.toLowerCase()) ||
    (getCustomerName(invoice, customersById).toLowerCase().includes(search.toLowerCase())) ||
    (invoice.created_user &&
      `${invoice.created_user.first_name || ''} ${invoice.created_user.last_name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleRecallInvoice = async () => {
  if (!selectedInvoice) {
    alert("Please select an invoice first");
    return;
  }

  try {
    // ✅ fetch full invoice details (items + customer) before sending to CreateInvoice page
    const res = await getInvoiceById(selectedInvoice.id);

    const fullInvoice: any = (res.data?.data ?? res.data) || selectedInvoice;

    // attach customer if missing
    fullInvoice.customer = fullInvoice.customer || customersById[fullInvoice.customer_id] || selectedInvoice.customer;

    if (onSelect) {
      onSelect(fullInvoice);
    } else {
      alert(
        `Invoice ${fullInvoice.invoice_no || `INV-${fullInvoice.id}`} recalled successfully!`
      );
    }

    onClose();
  } catch (err) {
    console.error("Error recalling invoice:", err);
    alert("Failed to recall invoice. Please try again.");
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-[1200px] max-h-[1920px] bg-[#D9D9D9] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        <div className="w-full bg-white rounded-full flex items-center px-10 py-5 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20 flex-shrink-0">
          <img src="/search.png" alt="Search" className="w-12 h-12 mr-6 opacity-60" />
          <input
            type="text"
            placeholder="Search Invoice..."
            className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="flex-1 bg-[#BFBABA] rounded-3xl overflow-hidden flex flex-col mb-4 sm:mb-6 min-h-0">
          <div className="grid grid-cols-5 bg-[#9FA8DA] text-[20px] sm:text-[30px] font-semibold text-black px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="text-center">#</div>
            <div className="text-center">Created At</div>
            <div className="text-center">Invoice No</div>
            <div className="text-center">Created By</div>
            <div className="text-center">Customer</div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <div className="text-center py-12 sm:py-20 text-[28px] sm:text-[36px] text-gray-600">
                Loading...
              </div>
            )}

            {!loading && paginatedInvoices.length === 0 && (
              <div className="text-center py-12 sm:py-20 text-[28px] sm:text-[36px] text-gray-600">
                {filteredInvoices.length === 0 ? "No invoices found" : "No results for your search"}
              </div>
            )}

            {!loading &&
              paginatedInvoices.map((inv, i) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`grid grid-cols-5 text-[18px] sm:text-[26px] px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-black/20 hover:bg-white/30 transition-colors cursor-pointer ${selectedInvoice?.id === inv.id ? "bg-green-300" : ""}`}
                >
                  <div className="font-medium text-center">
                    {startIndex + i + 1}
                  </div>
                  <div className="text-center">
                    {new Date(inv.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="font-semibold text-blue-700 text-center">
                    {inv.invoice_no || `INV-${inv.id}`}
                  </div>
                  <div className="text-center truncate">
                    {inv.created_user
                      ? `${inv.created_user.first_name} ${inv.created_user.last_name}`
                      : `User ${inv.created_user_id}`
                    }
                  </div>
                  <div className="text-center truncate">
                    {getCustomerName(inv, customersById)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
          {/* Pagination */}
          <div className="flex justify-center text-black">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 sm:gap-6">
            <button
              onClick={onClose}
              className="px-8 sm:px-12 h-14 sm:h-16 bg-gray-300 rounded-full text-[20px] sm:text-[28px] hover:bg-gray-400 transition-colors min-w-[140px] sm:min-w-[160px]"
            >
              Cancel
            </button>

            <button
              onClick={handleRecallInvoice}
              disabled={!selectedInvoice}
              className="px-8 sm:px-12 h-14 sm:h-16 bg-gradient-to-b from-[#0E7A2A] to-[#064C18] text-white rounded-full text-[20px] sm:text-[28px] disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#0E8A2A] hover:to-[#065C18] transition-all min-w-[160px] sm:min-w-[220px]"
            >
              Recall Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecallInvoice;