import { useEffect, useState } from "react";
import RecallInvoiceConfirm from "./RecallInvoiceConfirm";
import { getInvoiceById, getInvoices } from "../api/invoice";
import { getCustomers } from "../api/customers";
import Pagination from "../components/Pagination";

interface ViewPreviousInvoiceProps {
  goBack: () => void;
  onRecallToCreateInvoice?: () => void;
}

interface Invoice {
  id: number;
  invoice_no: string;
  created_at: string;
  created_user_id: number;
  status: string;
  paid_amount: string | null;
  total_amount: string | null;
  created_user?: {
    first_name: string;
    last_name: string;
  };
  customer_id?: number;
  customer?: any;
  customer_name?: string;
  customerName?: string;
  updated_at?: string;
}


// Normalize status values so the UI logic stays consistent across backend versions.
const normalizeStatus = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "SENT") return "PENDING";
  return s || "UNKNOWN";
};

const isRecallableStatus = (status?: string) => {
  const st = normalizeStatus(status);
  return st === "PENDING" || st === "ACTIVE";
};

const getCustomerIdFromInvoice = (inv: any): number | null => {
  const raw = inv?.customer_id ?? inv?.customerId ?? inv?.customer?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const getInvoiceSortTime = (inv: any) => {
  const t = new Date(inv?.updated_at || inv?.created_at || inv?.invoice_date || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getInvoiceCustomerName = (inv: any, customersById: Record<number, any>) => {
  const normalize = (v: any) => (typeof v === "string" ? v.trim() : "");
  const candidates = [
    inv?.bill_for,
    inv?.billFor,
    inv?.customer_name,
    inv?.customerName,
    inv?.customer_full_name,
    inv?.customerFullName,
    inv?.customer?.full_name,
    inv?.customer?.fullName,
    inv?.customer?.customer_name,
    inv?.customer?.customerName,
    inv?.customer?.display_name,
    inv?.customer?.displayName,
    inv?.customer?.name,
    `${inv?.customer?.first_name || inv?.customer?.firstName || ""} ${inv?.customer?.last_name || inv?.customer?.lastName || ""}`.trim(),
  ].map(normalize).filter(Boolean);

  const nonGeneric = candidates.find((v) => !/^customer\s*\d*$/i.test(v));
  if (nonGeneric) return nonGeneric;

  const cid = getCustomerIdFromInvoice(inv);
  if (cid && customersById[cid]) {
    const c = customersById[cid];
    const mappedCandidates = [
      c?.full_name, c?.fullName, c?.customer_name, c?.customerName, c?.display_name, c?.displayName, c?.name,
      `${c?.first_name || c?.firstName || ""} ${c?.last_name || c?.lastName || ""}`.trim(),
    ].map(normalize).filter(Boolean);
    const best = mappedCandidates.find((v) => !/^customer\s*\d*$/i.test(v));
    if (best) return best;
  }

  return candidates[0] || (cid ? `Customer ${cid}` : "-");
};

const ITEMS_PER_PAGE = 20;
const RECALL_INVOICE_STORAGE_KEY = "pos_recalled_invoice_payload";
const RECALL_OPEN_CREATE_KEY = "pos_open_create_invoice_from_recall";

const ViewPreviousInvoice = ({ goBack, onRecallToCreateInvoice }: ViewPreviousInvoiceProps) => {
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [customersById, setCustomersById] = useState<Record<number, any>>({});

  // 🔹 Load invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);

        const fetchAllCustomers = async () => {
          const LIMIT = 200;
          const all: any[] = [];
          for (let page = 1; page <= 30; page++) {
            const cres = await getCustomers(page, LIMIT, "");
            const d = cres.data;
            const arr =
              Array.isArray(d) ? d :
              Array.isArray(d?.data) ? d.data :
              Array.isArray(d?.customers) ? d.customers :
              Array.isArray(d?.data?.customers) ? d.data.customers :
              Array.isArray(d?.data?.data) ? d.data.data :
              [];
            if (!Array.isArray(arr) || arr.length === 0) break;
            all.push(...arr);
            if (arr.length < LIMIT) break;
          }
          return all;
        };

        const [res, allCustomers] = await Promise.all([getInvoices(), fetchAllCustomers()]);

        const cmap: Record<number, any> = {};
        allCustomers.forEach((c: any) => {
          const id = Number(c?.id ?? c?.customer_id ?? c?.customerId);
          if (!Number.isFinite(id) || id <= 0) return;
          cmap[id] = c;
        });
        setCustomersById(cmap);

        // Backend responses can differ, so parse defensively.
        const data = res.data;
        const list =
          Array.isArray(data) ? data :
          Array.isArray(data?.data) ? data.data :
          Array.isArray(data?.data?.data) ? data.data.data :
          [];

        const sorted = [...list].sort((a: any, b: any) => getInvoiceSortTime(b) - getInvoiceSortTime(a));
        setInvoices(sorted as Invoice[]);
      } catch (err) {
        console.error("Failed to load invoices", err);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // 🔹 Local Filter
  const filteredInvoices = [...invoices].filter((inv) => {
    const s = search.toLowerCase();
    const invoiceNo = (inv.invoice_no || "").toLowerCase();
    const status = (inv.status || "").toLowerCase();
    const creator = inv.created_user
      ? (`${inv.created_user.first_name || ""} ${inv.created_user.last_name || ""}`).toLowerCase()
      : "";
    const customer = getInvoiceCustomerName(inv, customersById).toLowerCase();

    return (
      invoiceNo.includes(s) ||
      status.includes(s) ||
      creator.includes(s) ||
      customer.includes(s)
    );
  }).sort((a, b) => getInvoiceSortTime(b) - getInvoiceSortTime(a));

  // 🔹 Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleRecall = async () => {
    if (!selectedInvoice) {
      setShowRecallConfirm(false);
      return;
    }

    try {
      // Fetch full invoice details (items + customer) before sending to Create Invoice screen
      const res = await getInvoiceById(selectedInvoice.id);
      const fullInvoice: any = (res.data?.data?.invoice ?? res.data?.data ?? res.data?.invoice ?? res.data) || selectedInvoice;
      if (!fullInvoice.id && selectedInvoice?.id) fullInvoice.id = selectedInvoice.id;
      const cid = getCustomerIdFromInvoice(fullInvoice) ?? getCustomerIdFromInvoice(selectedInvoice);
      if (!fullInvoice.customer && cid && customersById[cid]) {
        fullInvoice.customer = customersById[cid];
      }

      localStorage.setItem(RECALL_INVOICE_STORAGE_KEY, JSON.stringify(fullInvoice));
      localStorage.setItem(RECALL_OPEN_CREATE_KEY, "1");

      setShowRecallConfirm(false);
      setSelectedInvoice(null);

      if (onRecallToCreateInvoice) {
        onRecallToCreateInvoice();
      } else {
        goBack();
      }
    } catch (err) {
      console.error("Failed to recall invoice", err);
      alert("Failed to recall invoice. Please try again.");
      setShowRecallConfirm(false);
    }
  };

  // 🔹 Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center p-10 mx-auto overflow-hidden">

      {/* TOP BAR */}
      <div className="w-full shrink-0 bg-[#D9D9D9] rounded-full flex items-center justify-between px-6 py-8 mb-10">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-[29px] text-black"
        >
          <img src="/Polygon.png" alt="Back" className="w-12 h-12" />
          POS
        </button>

        <span className="font-bold text-[48px] text-black">
          View Previous Invoice
        </span>

        <button className="flex items-center gap-2 text-[29px] text-black opacity-50">
          POS
          <img src="/Polygon 2.png" alt="Next" className="w-12 h-12" />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="w-full max-w-[1100px] bg-white rounded-full flex items-center px-8 py-5 mb-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20 shrink-0">
        <img src="/search.png" alt="Search" className="w-12 h-12 mr-6 opacity-60" />
        <input
          type="text"
          placeholder="Search Invoices..."
          className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div className="w-full flex-1 flex flex-col items-center overflow-hidden mb-8">
        <div className="w-full max-w-[1100px] h-full overflow-x-auto border border-white/20 rounded-[30px] bg-[#2F2F2F] shadow-2xl flex flex-col">

          {/* HEADER */}
          <div className="min-w-[1200px] grid grid-cols-8 text-[28px] text-white bg-[#3A3A3A] px-4 py-6 font-bold sticky top-0">
            <div className="truncate text-center">Invoice No</div>
            <div className="truncate text-center">Created</div>
            <div className="truncate text-center">Created By</div>
            <div className="truncate text-center">Created For</div>
            <div className="truncate text-center">Value</div>
            <div className="truncate text-center">Paid Amount</div>
            <div className="truncate text-center">Status</div>
            <div className="truncate text-center">Action</div>
          </div>

          {/* BODY */}
          <div className="min-w-[1200px] flex-1 overflow-y-auto">

            {loading && (
              <div className="text-center py-10 text-[35px] text-white">Loading...</div>
            )}

            {!loading && paginatedInvoices.length === 0 && (
              <div className="text-center py-10 text-[35px] text-white/50">No invoices found</div>
            )}

            {paginatedInvoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-8 px-4 py-4 border-b border-white/10 hover:bg-white/5 transition-colors text-[24px] text-white items-center"
              >
                <div className="font-medium text-center truncate">{inv.invoice_no || `INV-${inv.id}`}</div>

                <div className="text-center leading-tight">
                  {new Date(inv.created_at).toLocaleDateString()}
                  <br />
                  <span className="text-[20px] opacity-70">{new Date(inv.created_at).toLocaleTimeString()}</span>
                </div>

                <div className="text-center truncate">
                  {inv.created_user
                    ? `${inv.created_user.first_name} ${inv.created_user.last_name}`
                    : inv.created_user_id}
                </div>

                <div className="font-semibold text-center truncate">
                  {getInvoiceCustomerName(inv, customersById)}
                </div>

                <div className="font-semibold text-center truncate">
                  {parseFloat(inv.total_amount || "0").toFixed(2)}
                </div>

                <div className="font-semibold text-center truncate">
                  {parseFloat(inv.paid_amount || "0").toFixed(2)}
                </div>

                <div className="text-center truncate">{normalizeStatus(inv.status)}</div>

                <div className="flex justify-center">
                  {isRecallableStatus(inv.status) ? (
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setShowRecallConfirm(true);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full text-[20px] font-bold hover:from-blue-600 hover:to-blue-800 transition-all shadow-md"
                    >
                      Recall
                    </button>
                  ) : (
                    <span className="text-white/40 text-[20px]">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="shrink-0 mb-8 scale-[1.5] text-white">
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* MODAL */}
      {showRecallConfirm && (
        <RecallInvoiceConfirm
          onConfirm={handleRecall}
          onClose={() => {
            setShowRecallConfirm(false);
            setSelectedInvoice(null);
          }}
        />
      )}

    </div>
  );
};

export default ViewPreviousInvoice;
