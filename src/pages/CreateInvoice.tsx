import { useState, useEffect, useRef } from "react";
import RecallInvoice from "./RecallInvoice";
import CancelInvoiceConfirm from "./CancelInvoiceConfirm";
import AddCustomer from "./AddCustomer";
import CreateCustomer from "./CreateCustomer";
import SelectProducts from "./SelectProducts";
import SendInvoiceConfirm from "./SendInvoiceConfirm";
import RemoveItemConfirm from "./RemoveItemConfirm";
import { getCustomers, type Customer } from "../api/customers";
import type { InvoiceItem } from "../api/items";
import { createInvoice, addInvoiceItem, sendInvoice, getInvoiceById, cancelInvoice, updateInvoice, updateInvoiceItem, deleteInvoiceItem } from "../api/invoice";

/* ================= TOKEN HELPERS ================= */
const getUserFromToken = () => {
  try {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
};

const getUserIdFromToken = (): number | null => {
  const payload = getUserFromToken();
  return payload?.sub ?? payload?.user_id ?? payload?.id ?? null;
};

const getUserNameFromToken = (): string => {
  const payload = getUserFromToken();

  const value =
    payload?.username ??
    payload?.name ??
    payload?.email ??
    "User";

  // If it's an email, return only the part before @
  if (value.includes("@")) {
    return value.split("@")[0];
  }

  return value;
};

/* ================= COMPONENT ================= */
interface CreateInvoiceProps {
  goBack: () => void;
}

const RECALL_INVOICE_STORAGE_KEY = "pos_recalled_invoice_payload";
const RECALL_OPEN_CREATE_KEY = "pos_open_create_invoice_from_recall";

const isGenericCustomerLabel = (value?: string | null) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return true;
  return v === "customer" || /^customer\s*\d*$/i.test(v);
};

const pickBestCustomerName = (...values: any[]): string => {
  const cleaned = values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  const nonGeneric = cleaned.find((v) => !isGenericCustomerLabel(v));
  return nonGeneric || cleaned[0] || "";
};

const CreateInvoice = ({ goBack }: CreateInvoiceProps) => {
  /* ================= MODALS ================= */
  const [showRecall, setShowRecall] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  /* ================= DATA ================= */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [qty, setQty] = useState<string>("0"); // Changed to string with default "0"
  const [invoiceNumber, setInvoiceNumber] = useState<string>("AUTO");
  const [discountType] = useState<"percentage" | "fixed">("percentage");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [previousInvoiceId, setPreviousInvoiceId] = useState<number | null>(null);
  const [lastCreatedInvoiceNo, setLastCreatedInvoiceNo] = useState<string | null>(null);

  /* ================= TOTALS ================= */
  const subtotal = invoiceItems.reduce(
    (acc, item) => acc + (item.unitPrice * item.qty),
    0
  );
  const discountValue =
    discountType === "percentage"
      ? (subtotal * discountAmount) / 100
      : discountAmount;
  const totalAmount = subtotal - discountValue;
  const itemCount = invoiceItems.length;


  // Track whether the current screen has finalized the invoice (sent or cancelled).
  // This prevents auto-saving when the invoice is already completed.
  const hasFinalizedRef = useRef(false);

  // Keep the last saved draft invoice id so we can cancel it if needed.
  const lastDraftInvoiceIdRef = useRef<number | null>(null);

  // Keep the original recalled invoice item line ids so we can update the SAME invoice without creating a new one.
  const recalledOriginalItemIdsRef = useRef<number[]>([]);

  // Remember original recalled invoice number for stable display after re-send.
  const recalledOriginalInvoiceNoRef = useRef<string | null>(null);

  // Keep the latest invoice draft state for unmount auto-save.
  const draftSnapshotRef = useRef({
    selectedCustomer: null as Customer | null,
    invoiceItems: [] as InvoiceItem[],
    qty: "0",
    discountType: "fixed" as "fixed" | "percentage",
    discountAmount: 0,
    paidAmount: 0,
    previousInvoiceId: null as number | null,
    totalAmount: 0,
  });

  // Update snapshot every render when values change.
  useEffect(() => {
    draftSnapshotRef.current = {
      selectedCustomer,
      invoiceItems,
      qty,
      discountType,
      discountAmount,
      paidAmount,
      previousInvoiceId,
      totalAmount,
    };
  }, [selectedCustomer, invoiceItems, qty, discountType, discountAmount, paidAmount, previousInvoiceId, totalAmount]);

  // Save the current in-progress invoice to the backend as an ACTIVE invoice.
  // This runs when the user leaves the screen without sending it to the cashier.
  const persistActiveInvoice = async (reason: "back" | "unmount") => {
    const snap = reason === "unmount" ? draftSnapshotRef.current : {
      selectedCustomer,
      invoiceItems,
      qty,
      discountType,
      discountAmount,
      paidAmount,
      previousInvoiceId,
      totalAmount,
    };
    try {
      if (hasFinalizedRef.current) return;
      if (snap.invoiceItems.length === 0) return;

      const userId = getUserIdFromToken();
      if (!userId) return;

      // If customer is not selected, store draft locally to avoid losing items.
      if (!snap.selectedCustomer?.id) {
        const localDraft = {
          reason,
          saved_at: new Date().toISOString(),
          customer: null,
          items: snap.invoiceItems,
          qty: snap.qty,
          discountType: snap.discountType,
          discountAmount: snap.discountAmount,
          paidAmount: snap.paidAmount,
        };
        localStorage.setItem("pos_local_draft_invoice", JSON.stringify(localDraft));
        return;
      }

      const boxQty = parseInt(snap.qty) || 0;

      const basePayload: any = {
        customer_id: snap.selectedCustomer.id,
        created_user_id: userId,
        status: "ACTIVE",
        paid_amount: snap.paidAmount,
        total_amount: snap.totalAmount,
        discount_type: snap.discountType,
        discount_amount: snap.discountAmount,
        next_box_number: boxQty,
      };

      // If user is editing a recalled invoice, do NOT create a new invoice draft.
      // Update the same invoice header only (keeps invoice count and number stable).
      if (snap.previousInvoiceId) {
        try {
          await updateInvoice(snap.previousInvoiceId, basePayload);
        } catch (e: any) {
          await updateInvoice(snap.previousInvoiceId, { ...basePayload, status: "PENDING" });
        }

        lastDraftInvoiceIdRef.current = null;

        hasFinalizedRef.current = true;
        localStorage.removeItem("pos_local_draft_invoice");
        localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
        localStorage.removeItem(RECALL_OPEN_CREATE_KEY);
        return;
      }

      let invoiceResponse;
      try {
        invoiceResponse = await createInvoice(basePayload);
      } catch (e: any) {
        // Fallback: if backend doesn't support ACTIVE, use SENT as a safe draft status
        invoiceResponse = await createInvoice({ ...basePayload, status: "SENT" });
      }

      const responseData = invoiceResponse.data?.data || invoiceResponse.data;
      const newInvoiceId = responseData?.id;

      if (!newInvoiceId) return;

      lastDraftInvoiceIdRef.current = newInvoiceId;

      // Persist invoice items to the backend invoice record
      const itemPromises = invoiceItems.map(async (item: InvoiceItem) => {
        return addInvoiceItem(newInvoiceId, {
          stock_id: item.stockId || item.id,
          quantity: item.qty,
          selling_price: item.unitPrice,
          discount_type: snap.discountType,
          discount_amount: 0,
        });
      });

      await Promise.all(itemPromises);

      // Mark as finalized for this screen so we don't save again
      hasFinalizedRef.current = true;

      // Clear local draft if any
      localStorage.removeItem("pos_local_draft_invoice");
      localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
      localStorage.removeItem(RECALL_OPEN_CREATE_KEY);
    } catch (e) {
      // Do not block navigation if draft save fails
      console.warn("Failed to persist active invoice draft:", e);
    }
  };


  /* ================= HANDLERS ================= */
  const handleAddProduct = (product: InvoiceItem) => {
    const index = invoiceItems.findIndex(i => i.id === product.id);
    if (index >= 0) {
      const updated = [...invoiceItems];
      updated[index].qty += product.qty;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems(prev => [...prev, product]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const requestRemoveItem = (index: number) => {
    setRemoveIndex(index);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveItem = () => {
    if (removeIndex !== null) {
      handleRemoveItem(removeIndex);
    }
    setShowRemoveConfirm(false);
    setRemoveIndex(null);
  };

  const handleItemQtyChange = (index: number, value: string) => {
    const parsed = parseInt(value || "0", 10);
    const nextQty = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    setInvoiceItems(prev =>
      prev.map((it, i) => (i === index ? { ...it, qty: nextQty } : it))
    );
  };

  // ✅ When starting a brand-new invoice, clear the previous 'last sent' display
  const clearLastCreatedIfStartingNew = () => {
    if (lastCreatedInvoiceNo && !previousInvoiceId) {
      setLastCreatedInvoiceNo(null);
      setInvoiceNumber("AUTO");
      setQty("0");
    }
  };


  const mapRecalledInvoiceItems = (invoice: any): InvoiceItem[] => {
    const sourceItems =
      invoice?.invoice_items ??
      invoice?.items ??
      invoice?.invoiceItems ??
      invoice?.data?.invoice_items ??
      invoice?.data?.items ??
      [];

    if (!Array.isArray(sourceItems)) return [];

    const pickString = (...values: any[]) => {
      for (const v of values) {
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return "";
    };

    const pickNumber = (...values: any[]) => {
      for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return 0;
    };

    return sourceItems.map((item: any, idx: number) => {
      const stockObj =
        item?.stock ??
        item?.stock_item ??
        item?.stockItem ??
        item?.inventory_stock ??
        item?.inventoryStock ??
        null;

      const nestedItem =
        item?.item ??
        item?.product ??
        item?.product_item ??
        item?.productItem ??
        item?.store_item ??
        item?.storeItem ??
        stockObj?.item ??
        stockObj?.product ??
        null;

      const stockId =
        pickNumber(
          item?.stock_id,
          item?.stockId,
          stockObj?.id,
          stockObj?.stock_id,
          stockObj?.stockId,
        ) || undefined;

      const invoiceItemId =
        pickNumber(
          item?.invoice_item_id,
          item?.invoiceItemId,
        ) || undefined;

      const displayId =
        pickNumber(
          stockId,
          item?.id,
          item?.invoice_item_id,
          item?.invoiceItemId,
          nestedItem?.id,
          item?.item_id,
          item?.itemId,
          idx + 1,
        ) || (idx + 1);

      const sku = pickString(
        item?.sku,
        item?.item_sku,
        item?.itemSku,
        stockObj?.sku,
        nestedItem?.sku,
        nestedItem?.code,
        item?.code,
      ) || "N/A";

      const name = pickString(
        item?.name,
        item?.item_name,
        item?.itemName,
        stockObj?.name,
        nestedItem?.name,
        nestedItem?.item_name,
        item?.description,
        nestedItem?.description,
      ) || "Unknown Item";

      const description = pickString(
        item?.description,
        stockObj?.description,
        nestedItem?.description,
      );

      const unitPrice = Number(
        item?.selling_price ??
        item?.sellingPrice ??
        item?.unit_price ??
        item?.unitPrice ??
        item?.price ??
        stockObj?.stock_price ??
        stockObj?.retail_price ??
        stockObj?.selling_price ??
        nestedItem?.selling_price ??
        nestedItem?.price ??
        0
      ) || 0;

      const qtyVal = Number(item?.quantity ?? item?.qty ?? item?.item_qty ?? 1);

      return {
        id: displayId,
        stockId,
        invoiceItemId,
        sku,
        name,
        description,
        unitPrice,
        qty: Math.max(1, Number.isFinite(qtyVal) ? qtyVal : 1),
      };
    });
  };

  const resolveRecalledCustomer = (invoice: any): Customer | null => {
    const c = invoice?.customer;
    const billForFallback = pickBestCustomerName(
      invoice?.bill_for,
      invoice?.billFor,
      invoice?.customer_name,
      invoice?.customerName,
      invoice?.customer_full_name,
      invoice?.customerFullName,
      invoice?.created_for_name,
      invoice?.createdForName,
    );

    const buildCustomer = (raw: any, fallbackIdRaw?: any): Customer | null => {
      if (!raw || typeof raw !== "object") return null;

      const cid = Number(raw?.id ?? raw?.customer_id ?? raw?.customerId ?? fallbackIdRaw ?? invoice?.customer_id ?? 0);
      const richName = pickBestCustomerName(
        raw?.full_name,
        raw?.fullName,
        raw?.customer_name,
        raw?.customerName,
        raw?.display_name,
        raw?.displayName,
        raw?.person_name,
        raw?.personName,
        raw?.name,
        billForFallback,
      );

      let first = String(raw?.first_name ?? raw?.firstName ?? "").trim();
      let last = String(raw?.last_name ?? raw?.lastName ?? "").trim();

      if ((!first && !last) || isGenericCustomerLabel(first)) {
        if (richName) {
          const parts = richName.split(/\s+/).filter(Boolean);
          if (parts.length) {
            first = parts[0];
            last = parts.slice(1).join(" ");
          }
        }
      }

      const finalFirst = pickBestCustomerName(first, richName, billForFallback) || (cid ? `Customer ${cid}` : "Customer");
      const finalLast = !isGenericCustomerLabel(last) ? last : "";

      return {
        id: Number.isFinite(cid) && cid > 0 ? cid : 0,
        first_name: finalFirst,
        last_name: finalLast,
        telephone: raw?.telephone ?? raw?.phone,
      };
    };

    if (c && typeof c === "object") {
      const built = buildCustomer(c);
      if (built) return built;
    }

    const fallbackId = Number(invoice?.customer_id ?? 0);
    if (fallbackId > 0 || billForFallback) {
      const built = buildCustomer({
        id: fallbackId,
        first_name: invoice?.customer_first_name ?? invoice?.customerFirstName,
        last_name: invoice?.customer_last_name ?? invoice?.customerLastName,
        customer_name: invoice?.customer_name ?? invoice?.customerName,
        full_name: invoice?.customer_full_name ?? invoice?.customerFullName,
        name: billForFallback,
      }, fallbackId);
      if (built) return built;
    }

    return null;
  };

  const fetchCustomerByIdForRecall = async (customerId: number): Promise<Customer | null> => {
    if (!Number.isFinite(customerId) || customerId <= 0) return null;
    try {
      const LIMIT = 200;
      for (let page = 1; page <= 30; page++) {
        const res = await getCustomers(page, LIMIT, "");
        const d = res.data;
        const arr = Array.isArray(d)
          ? d
          : Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d?.customers)
          ? d.customers
          : Array.isArray(d?.data?.customers)
          ? d.data.customers
          : Array.isArray(d?.data?.data)
          ? d.data.data
          : [];

        if (!Array.isArray(arr) || arr.length === 0) break;

        const found = arr.find((row: any) => Number(row?.id ?? row?.customer_id ?? row?.customerId) === customerId);
        if (found) {
          const normalized = resolveRecalledCustomer({ customer: found, customer_id: customerId });
          if (normalized) return normalized;
        }

        if (arr.length < LIMIT) break;
      }
    } catch (e) {
      console.warn("Failed to fetch customer for recalled invoice", e);
    }
    return null;
  };

  const applyRecalledInvoiceToForm = async (invoice: any) => {
    if (!invoice) return;

    const recalledId = Number(invoice?.id);
    if (Number.isFinite(recalledId) && recalledId > 0) {
      setPreviousInvoiceId(recalledId);
    } else {
      setPreviousInvoiceId(null);
    }

    const recalledInvoiceNo = invoice?.invoice_no || (Number.isFinite(recalledId) ? `INV-${recalledId}` : "AUTO");
    setInvoiceNumber(recalledInvoiceNo);
    recalledOriginalInvoiceNoRef.current = recalledInvoiceNo;
    setLastCreatedInvoiceNo(null);

    let recalledCustomer = resolveRecalledCustomer(invoice);
    if (!recalledCustomer || isGenericCustomerLabel(`${recalledCustomer.first_name || ""} ${recalledCustomer.last_name || ""}`)) {
      const cid = Number(invoice?.customer_id ?? invoice?.customer?.id ?? 0);
      if (Number.isFinite(cid) && cid > 0) {
        const fetched = await fetchCustomerByIdForRecall(cid);
        if (fetched) recalledCustomer = fetched;
      }
    }

    const mappedItems = mapRecalledInvoiceItems(invoice);
    recalledOriginalItemIdsRef.current = mappedItems
      .map((it) => Number((it as any).invoiceItemId || 0))
      .filter((id) => Number.isFinite(id) && id > 0);

    setSelectedCustomer(recalledCustomer);
    setInvoiceItems(mappedItems);
    setPaidAmount(Number(invoice?.paid_amount || 0));
    setDiscountAmount(Number(invoice?.discount_amount || 0));
    const recalledQty = Number(invoice?.next_box_number ?? 0);
    setQty(String(Number.isFinite(recalledQty) && recalledQty > 0 ? recalledQty : 1));

  };

  // If user recalled from "View Previous Invoice", that screen stores the selected invoice in localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECALL_INVOICE_STORAGE_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw);
      localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
      localStorage.removeItem(RECALL_OPEN_CREATE_KEY);

      // Apply recalled invoice data from localStorage (saved by View Previous Invoice screen)
      void applyRecalledInvoiceToForm(stored);
    } catch (e) {
      console.warn("Failed to load recalled invoice from storage:", e);
      try {
        localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
        localStorage.removeItem(RECALL_OPEN_CREATE_KEY);
      } catch {
        // ignore
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= BILL NO DISPLAY (avoid fake invoice numbers) ================= */
  useEffect(() => {
    // Keep recalled invoice number as-is.
    if (previousInvoiceId) return;

    // For a new unsaved invoice, do not show a fake generated number.
    if (!lastCreatedInvoiceNo && invoiceNumber !== "AUTO") {
      setInvoiceNumber("AUTO");
    }
  }, [invoiceNumber, lastCreatedInvoiceNo, previousInvoiceId]);

  const handleRecallInvoice = async (invoice: any) => {
    const invoiceId = Number(invoice?.id ?? invoice?.invoice_id ?? invoice?.invoiceId ?? 0) || undefined;

    const hasItemsInPayload = (payload: any) => {
      const arr =
        payload?.invoice_items ??
        payload?.items ??
        payload?.invoiceItems ??
        payload?.data?.invoice_items ??
        payload?.data?.items ??
        [];
      return Array.isArray(arr) && arr.length > 0;
    };

    try {
      if (!hasItemsInPayload(invoice) && invoiceId) {
        const res = await getInvoiceById(invoiceId);
        const fromApi =
          res.data?.data?.invoice ??
          res.data?.data ??
          res.data?.invoice ??
          res.data;
        invoice = fromApi || invoice;
      }
    } catch (e) {
      console.warn("Could not fetch full invoice for recall", e);
    }

    const mapped = mapRecalledInvoiceItems(invoice);
    if (mapped.length === 0) {
      throw new Error("This invoice has no recallable items or item details could not be loaded.");
    }

    console.log("Recalled invoice for state update:", invoice);
    await applyRecalledInvoiceToForm(invoice);
    setShowRecall(false);
  };

  const normalizeInvoiceDetailForSync = (invoice: any) => {
    const rawItems =
      invoice?.invoice_items ??
      invoice?.items ??
      invoice?.invoiceItems ??
      invoice?.data?.invoice_items ??
      invoice?.data?.items ??
      [];

    const arr = Array.isArray(rawItems) ? rawItems : [];
    return arr.map((it: any) => ({
      invoiceItemId: Number(it?.invoice_item_id ?? it?.invoiceItemId ?? it?.id ?? 0) || undefined,
      stockId: Number(it?.stock_id ?? it?.stockId ?? it?.stock?.id ?? 0) || undefined,
      quantity: Number(it?.quantity ?? it?.qty ?? 0) || 0,
    }));
  };

  const syncRecalledInvoiceItemsBestEffort = async (invoiceId: number) => {
    let existing: Array<{ invoiceItemId?: number; stockId?: number; quantity: number }> = [];

    try {
      const detailRes = await getInvoiceById(invoiceId);
      const detail = detailRes.data?.data?.invoice ?? detailRes.data?.data ?? detailRes.data?.invoice ?? detailRes.data;
      existing = normalizeInvoiceDetailForSync(detail);
    } catch (e) {
      console.warn("Failed to load existing invoice items for sync; using local recalled snapshot only", e);
    }

    const existingById = new Map<number, any>();
    const existingByStock = new Map<number, any>();
    for (const line of existing) {
      if (line.invoiceItemId) existingById.set(line.invoiceItemId, line);
      if (line.stockId) existingByStock.set(line.stockId, line);
    }

    // Delete removed lines (only if backend supports delete endpoint)
    const currentIds = new Set(
      invoiceItems.map((it: any) => Number(it?.invoiceItemId || 0)).filter((id) => Number.isFinite(id) && id > 0)
    );

    const originalIds = new Set(
      (recalledOriginalItemIdsRef.current || []).filter((id) => Number.isFinite(id) && id > 0)
    );

    for (const removedId of originalIds) {
      if (!currentIds.has(removedId)) {
        try {
          await deleteInvoiceItem(invoiceId, removedId);
        } catch (e) {
          console.warn(`Delete invoice item ${removedId} not supported / failed`, e);
        }
      }
    }

    // Update existing lines or add new ones
    for (const uiItem of invoiceItems as any[]) {
      const qtyNum = Number(uiItem?.qty || 0) || 1;
      const stockId = Number(uiItem?.stockId || uiItem?.id || 0) || undefined;
      const lineId = Number(uiItem?.invoiceItemId || 0) || undefined;
      const payload = {
        stock_id: stockId,
        quantity: qtyNum,
        selling_price: Number(uiItem?.unitPrice || 0) || 0,
        discount_type: discountType.toUpperCase(),
        discount_amount: 0,
      };

      const matchedExisting = (lineId && existingById.get(lineId)) || (stockId && existingByStock.get(stockId));
      const targetLineId = lineId || matchedExisting?.invoiceItemId;

      if (targetLineId) {
        try {
          await updateInvoiceItem(invoiceId, targetLineId, payload);
          continue;
        } catch (e) {
          console.warn(`Update invoice item ${targetLineId} failed; trying add fallback`, e);
        }
      }

      await addInvoiceItem(invoiceId, payload as any);
    }
  };

  /* ================= SEND INVOICE ================= */
  const handleSendInvoice = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer first");
      return;
    }

    if (invoiceItems.length === 0) {
      alert("Please add items to the invoice");
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      alert("User session invalid. Please login again.");
      return;
    }

    try {
      // Parse qty to number, default to 0 if empty/invalid
      const boxQty = parseInt(qty) || 0;

      // ✅ Bag/Box Qty must be at least 1
      if (!Number.isFinite(boxQty) || boxQty < 1) {
        alert("Bag/Box Qty must be at least 1");
        return;
      }

      const invoicePayload: any = {
        customer_id: selectedCustomer.id,
        created_user_id: userId,
        status: "PENDING",
        total_amount: totalAmount,
        discount_type: discountType.toUpperCase(),
        next_box_number: boxQty
      };

      if (paidAmount > 0) invoicePayload.paid_amount = paidAmount;
      if (discountAmount > 0) invoicePayload.discount_amount = discountAmount;

      let sentInvoiceId: number;
      let sentInvoiceNo: string;

      if (previousInvoiceId) {
        // ✅ Recall flow: UPDATE the same invoice record (keep same invoice number / count)
        sentInvoiceId = previousInvoiceId;

        console.log("Updating recalled invoice (same invoice id):", sentInvoiceId, invoicePayload);
        await updateInvoice(sentInvoiceId, invoicePayload);

        await syncRecalledInvoiceItemsBestEffort(sentInvoiceId);
        await sendInvoice(sentInvoiceId);

        sentInvoiceNo = recalledOriginalInvoiceNoRef.current || invoiceNumber || `INV-${sentInvoiceId}`;
      } else {
        // ✅ Normal create flow: create a new invoice record
        console.log("Creating invoice with payload:", invoicePayload);
        const invoiceResponse = await createInvoice(invoicePayload);
        console.log("Invoice creation response:", invoiceResponse);

        const responseData = invoiceResponse.data?.data || invoiceResponse.data;
        if (!responseData) throw new Error("No response data from server");

        const newInvoiceId = responseData.id;
        const newInvoiceNo = responseData.invoice_no || `INV-${newInvoiceId}`;
        if (!newInvoiceId) throw new Error("Invoice ID not returned");

        sentInvoiceId = newInvoiceId;
        sentInvoiceNo = newInvoiceNo;

        const itemPromises = invoiceItems.map(async (item: InvoiceItem) => {
          const itemPayload = {
            stock_id: item.stockId || item.id,
            quantity: item.qty,
            selling_price: item.unitPrice,
            discount_type: discountType.toUpperCase(),
            discount_amount: 0
          };
          console.log("Adding invoice item:", itemPayload);
          return addInvoiceItem(newInvoiceId, itemPayload);
        });

        await Promise.all(itemPromises);
        await sendInvoice(newInvoiceId);
      }

      // Set the invoice number and remember it
      setInvoiceNumber(sentInvoiceNo);
      setLastCreatedInvoiceNo(sentInvoiceNo);

      alert(`Invoice #${sentInvoiceNo} sent to cashier successfully!`);

      // Mark as finalized so auto-save does not run
      hasFinalizedRef.current = true;
      localStorage.removeItem("pos_local_draft_invoice");
      localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
      localStorage.removeItem(RECALL_OPEN_CREATE_KEY);

      // Reset form but keep the invoice number displayed
      setInvoiceItems([]);
      setSelectedCustomer(null);
      setQty("0");
      setDiscountAmount(0);
      setPaidAmount(0);
      setPreviousInvoiceId(null);
      recalledOriginalInvoiceNoRef.current = null;
      recalledOriginalItemIdsRef.current = [];
      // Don't reset invoiceNumber here - keep showing the last created invoice number
      setShowSendConfirm(false);

    } catch (error: any) {
      console.error("Invoice creation error:", error);
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        "Failed to send invoice. Please try again.";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleCancelInvoice = async () => {
    try {
      // Cancel only the draft created by this screen.
      // Do NOT cancel the original recalled invoice record.
      const toCancelId = lastDraftInvoiceIdRef.current || null;

      if (toCancelId) {
        try {
          await cancelInvoice(toCancelId);
        } catch (e: any) {
          // Fallback: backend may use "CANCELED"
          try {
            await updateInvoice(toCancelId, { status: "CANCELED" });
          } catch {
            // ignore
          }
        }
      }

      // Mark as finalized so auto-save does not create an ACTIVE invoice after cancel
      hasFinalizedRef.current = true;
      localStorage.removeItem("pos_local_draft_invoice");
      localStorage.removeItem(RECALL_INVOICE_STORAGE_KEY);
      localStorage.removeItem(RECALL_OPEN_CREATE_KEY);

      // Reset everything including invoice number
      setInvoiceItems([]);
      setSelectedCustomer(null);
      setQty("0");
      setDiscountAmount(0);
      setPaidAmount(0);
      setPreviousInvoiceId(null);
      recalledOriginalInvoiceNoRef.current = null;
      recalledOriginalItemIdsRef.current = [];
      setInvoiceNumber("AUTO");
      setLastCreatedInvoiceNo(null);
      setShowCancelConfirm(false);

      alert("Invoice cancelled successfully!");
    } catch (e) {
      console.warn("Cancel invoice failed:", e);
      setShowCancelConfirm(false);
      alert("Failed to cancel invoice. Please try again.");
    }
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or numbers
    if (value === "" || /^\d*$/.test(value)) {
      setQty(value);
    }
  };

  const increaseQty = () => {
    const current = parseInt(qty) || 0;
    setQty((current + 1).toString());
  };

  const decreaseQty = () => {
    const current = parseInt(qty) || 0;
    if (current > 0) {
      setQty((current - 1).toString());
    }
  };

  // Display invoice number - priority: lastCreated > currentDraft > AUTO
  const getDisplayNo = () => {
    if (previousInvoiceId && invoiceNumber && invoiceNumber !== "AUTO") return invoiceNumber;
    if (lastCreatedInvoiceNo) return lastCreatedInvoiceNo;
    if (invoiceNumber && invoiceNumber !== "AUTO") return invoiceNumber;
    return "AUTO";
  };
  const displayInvoiceNumber = getDisplayNo();


  // Auto-save invoice as ACTIVE when user leaves this screen without sending it.
  useEffect(() => {
    return () => {
      // Best-effort save on unmount
      persistActiveInvoice("unmount");
    };
    // We intentionally do NOT add persistActiveInvoice to deps to avoid re-registering cleanup often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center p-10 mx-auto overflow-hidden">
      {/* Top Bar */}
      {/* Top Bar */}
      <div className="w-full bg-[#D9D9D9] rounded-full flex items-center justify-between px-6 py-8 mb-4">
        <button
          onClick={async () => {
              await persistActiveInvoice("back");
              goBack();
            }}
          className="flex items-center gap-2 text-[29px] text-black"
        >
          <img src="/Polygon.png" alt="Back" className="w-12 h-12" />
          POS
        </button>
        <span className="font-bold text-[48px] text-black">
          Create New Invoice
        </span>
        <button className="flex items-center gap-2 text-[29px] text-black opacity-50">
          POS
          <img src="/Polygon 2.png" alt="Next" className="w-12 h-12" />
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full flex-1 flex flex-col items-center max-w-[1100px]">
        {/* Action Buttons Row */}
        <div className="w-full flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => setShowRecall(true)}
            className="w-[530px] h-[100px] bg-gradient-to-b from-[#9BF5AD] via-[#4AED80] to-[#053E0A] text-white rounded-full font-bold text-[35px] hover:scale-105 transition-transform"
          >
            Recall Invoice
          </button>

          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-[530px] h-[100px] bg-gradient-to-b from-[#F59B9B] via-[#ED654A] to-[#3B0202] text-white rounded-full font-bold text-[35px] hover:scale-105 transition-transform"
          >
            Cancel Invoice
          </button>
        </div>

        {/* Customer & Info Card */}
        <div className="w-full bg-gradient-to-b from-[#D9D9D9] via-[#827E7E] to-[#676464] rounded-[50px] p-8 mb-8 shadow-2xl">
          <div className="flex flex-row gap-8">
            {/* Customer Buttons - Left Side */}
            <div className="flex flex-row gap-6">
              <button
                onClick={() => { clearLastCreatedIfStartingNew(); setShowAddCustomer(true); }}
                className="w-[180px] h-[300px] bg-gradient-to-b from-[#9BF5A3] via-[#72ED4A] to-[#023B06] text-white rounded-[40px] font-medium flex flex-col items-center justify-center gap-4 hover:brightness-110 transition-all"
              >
                <img
                  src="/lets-icons_user-alt-fill.png"
                  alt="Add Customer"
                  className="w-35 h-35"
                />
                <span className="text-[30px] text-center leading-tight">
                  Add<br />Customer
                </span>
              </button>

              <button
                onClick={() => { clearLastCreatedIfStartingNew(); setShowCreateCustomer(true); }}
                className="w-[180px] h-[300px] bg-gradient-to-b from-[#A19BF5] via-[#4A5DED] to-[#02043B] text-white rounded-[40px] font-medium flex flex-col items-center justify-center gap-4 hover:brightness-110 transition-all"
              >
                <img
                  src="/typcn_user-add.png"
                  alt="Create Customer"
                  className="w-35 h-35 ml-5"
                />
                <span className="text-[30px] text-center leading-tight">
                  Create<br />Customer
                </span>
              </button>
            </div>

            {/* Right Side Info */}
            <div className="flex-1 flex flex-col justify-center text-[38px] text-white pl-8 space-y-4">
              {/* Bill For */}
              <div className="flex items-baseline">
                <span className="font-semibold w-48 shrink-0">Bill For</span>
                <span className="mr-2">:</span>
                <span className="text-blue-800 font-bold truncate">
                  {selectedCustomer
                    ? (pickBestCustomerName(
                        (selectedCustomer as any)?.full_name,
                        (selectedCustomer as any)?.fullName,
                        (selectedCustomer as any)?.customer_name,
                        (selectedCustomer as any)?.customerName,
                        (selectedCustomer as any)?.display_name,
                        (selectedCustomer as any)?.displayName,
                        (selectedCustomer as any)?.name,
                        `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim(),
                      ) || (selectedCustomer.id ? `Customer ${selectedCustomer.id}` : "Select Customer"))
                    : "Select Customer"}
                </span>
              </div>

              {/* Bill No */}
              <div className="flex items-baseline">
                <span className="font-semibold w-48 shrink-0">Bill No</span>
                <span className="mr-2">:</span>
                <span className="text-blue-800 font-bold">{displayInvoiceNumber}</span>
              </div>

              {/* Billing by */}
              <div className="flex items-baseline">
                <span className="font-semibold w-48 shrink-0">Billing by</span>
                <span className="mr-2">:</span>
                <span className="text-blue-800 font-bold">{getUserNameFromToken()}</span>
              </div>

              {/* Bag/Box Quantity */}
              <div className="flex items-center mt-2">
                <span className="font-semibold w-48 shrink-0">Bag/Box Qty</span>
                <div className="flex items-center bg-[#D9D9D9] rounded-xl px-3 py-2 gap-4 shadow-inner ml-4">
                  <button
                    onClick={decreaseQty}
                    className="w-12 h-12 bg-red-700 text-white rounded-lg flex items-center justify-center text-3xl font-bold hover:bg-red-600 active:scale-95 transition-all"
                  >
                    −
                  </button>

                  <input
                    type="text"
                    value={qty}
                    onChange={handleQtyChange}
                    className="w-24 bg-transparent outline-none text-blue-900 font-bold text-center text-[32px]"
                    placeholder="0"
                    maxLength={5}
                  />

                  <button
                    onClick={increaseQty}
                    className="w-12 h-12 bg-green-700 text-white rounded-lg flex items-center justify-center text-3xl font-bold hover:bg-green-600 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Items Button */}
        <button
          onClick={() => { clearLastCreatedIfStartingNew(); setShowProducts(true); }}
          disabled={!selectedCustomer}
          className={`w-full h-[110px] rounded-full font-bold text-[35px] mb-8 transition-all shadow-lg flex items-center justify-center gap-4 ${!selectedCustomer
            ? "bg-gray-500 cursor-not-allowed opacity-50"
            : "bg-gradient-to-b from-[#807CFE] via-[#574AED] to-[#0A053E] text-white hover:scale-105 active:scale-95"
            }`}
        >
          {!selectedCustomer && <span>⚠️</span>}
          {selectedCustomer ? "Add Items To Invoice" : "Please Select Customer First"}
        </button>

        {/* ITEMS TABLE */}
        <div className="w-full flex-1 bg-[#2F2F2F] rounded-[30px] overflow-hidden mb-8 flex flex-col shadow-2xl border border-white/10">
          {/* Table Header */}
          <div className="grid grid-cols-7 gap-4 text-[28px] font-bold text-white bg-[#3A3A3A] px-6 py-4 border-b-2 border-white/20">
            <div className="col-span-1">Item No</div>
            <div className="col-span-1">SKU</div>
            <div className="col-span-2">Item Name</div>
            <div className="col-span-1 text-center">Price</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {invoiceItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                <div className="text-[80px] mb-4">🛒</div>
                <div className="text-[35px]">No items added yet</div>
              </div>
            ) : (
              invoiceItems.map((item, i) => (
                <div key={item.id} className="grid grid-cols-7 gap-4 px-6 py-4 text-[26px] text-white border-b border-white/10 items-center hover:bg-white/5 transition-colors">
                  <div className="col-span-1 pl-4">{i + 1}</div>
                  <div className="col-span-1">{item.sku}</div>
                  <div className="col-span-2 flex flex-col">
                    <span className="font-semibold truncate">{item.name}</span>
                    <span className="text-[20px] text-gray-400 truncate">{item.description}</span>
                  </div>
                  <div className="col-span-1 text-center text-green-400 font-mono">
                    LKR {item.unitPrice.toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => handleItemQtyChange(i, e.target.value)}
                      className="w-24 text-center bg-white/10 rounded-full px-4 py-1 text-white font-mono outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => requestRemoveItem(i)}
                      className="px-6 py-2 bg-red-600/80 text-white rounded-full text-[20px] hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary Footer */}
          <div className="flex w-full text-[32px] font-bold border-t-2 border-white/20">
            <div className="w-1/2 bg-[#1E40FF] text-white px-8 py-6 flex flex-col justify-center">
              <span>Total Item count</span>
              <span className="text-[48px] leading-none mt-2">{itemCount}</span>
            </div>
            <div className="w-1/2 bg-[#1F4D1F] text-white px-8 py-6 flex flex-col items-end justify-center">
              <div className="flex w-full justify-between mb-2 text-[28px] opacity-80">
                <span>Subtotal:</span>
                <span>LKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex w-full justify-between mb-2 text-[28px] opacity-80">
                <span>Discount:</span>
                <span>{discountType === "percentage" ? `${discountAmount}%` : `LKR ${discountAmount.toFixed(2)}`}</span>
              </div>
              <div className="flex w-full justify-between text-[42px] border-t border-white/30 pt-2 mt-2">
                <span>Total:</span>
                <span className="text-yellow-300">LKR {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Send to cashier */}
        <button
          onClick={() => {
                const boxQty = parseInt(qty || "0");
                if (!Number.isFinite(boxQty) || boxQty < 1) {
                  alert("Bag/Box Qty must be at least 1");
                  return;
                }
                setShowSendConfirm(true);
              }}
          disabled={!selectedCustomer || invoiceItems.length === 0 || parseInt(qty || "0") < 1}
          className="w-full h-[110px] bg-gradient-to-b from-[#7CFE96] via-[#4AED7B] to-[#053E13] text-white rounded-full font-bold text-[40px] flex items-center justify-center gap-6 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-xl mb-8"
        >
          Send Invoice to cashier
          <span className="text-[50px]">➤</span>
        </button>
      </div>

      {/* Modals */}
      {showRecall && <RecallInvoice onClose={() => setShowRecall(false)} onSelect={handleRecallInvoice} />}
      {showCancelConfirm && (
        <CancelInvoiceConfirm
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelInvoice}
        />
      )}
      {showAddCustomer && <AddCustomer onClose={() => setShowAddCustomer(false)} onSelect={setSelectedCustomer} />}
      {showCreateCustomer && (
        <CreateCustomer
          onClose={() => setShowCreateCustomer(false)}
          onCustomerCreated={setSelectedCustomer}
        />
      )}
      {showProducts && (
        <SelectProducts
          onClose={() => setShowProducts(false)}
          onAdd={handleAddProduct}
        />
      )}
      {showSendConfirm && (
        <SendInvoiceConfirm
          onConfirm={handleSendInvoice}
          onClose={() => setShowSendConfirm(false)}
        />
      )}
      {showRemoveConfirm && (
        <RemoveItemConfirm
          itemName={removeIndex !== null ? invoiceItems[removeIndex]?.name : ""}
          onConfirm={confirmRemoveItem}
          onClose={() => {
            setShowRemoveConfirm(false);
            setRemoveIndex(null);
          }}
        />
      )}
    </div>
  );
};

export default CreateInvoice;