import { useState, useEffect, useRef } from "react";
import RecallInvoice from "./RecallInvoice";
import CancelInvoiceConfirm from "./CancelInvoiceConfirm";
import AddCustomer from "./AddCustomer";
import CreateCustomer from "./CreateCustomer";
import SelectProducts from "./SelectProducts";
import SendInvoiceConfirm from "./SendInvoiceConfirm";
import RemoveItemConfirm from "./RemoveItemConfirm";
import type { Customer } from "../api/customers";
import type { InvoiceItem } from "../api/items";
import { createInvoice, addInvoiceItem, sendInvoice, getInvoiceById, cancelInvoice, updateInvoice } from "../api/invoice";

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

      // If we recalled an invoice, keep the reference for audit/history.
      if (snap.previousInvoiceId) basePayload.previous_invoice_id = snap.previousInvoiceId;

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

  /* ================= AUTO GENERATE INVOICE NO ================= */
  useEffect(() => {
    if (!lastCreatedInvoiceNo && selectedCustomer && invoiceItems.length > 0 && invoiceNumber === "AUTO") {
      const timestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
      setInvoiceNumber(`INV-${timestamp}`);
    }
    else if (!lastCreatedInvoiceNo && (!selectedCustomer || invoiceItems.length === 0) && invoiceNumber !== "AUTO") {
      setInvoiceNumber("AUTO");
    }
  }, [selectedCustomer, invoiceItems, invoiceNumber, lastCreatedInvoiceNo]);

  const handleRecallInvoice = async (invoice: any) => {
    try {
      if (!invoice?.invoice_items || invoice.invoice_items.length === 0) {
        const res = await getInvoiceById(invoice.id);
        invoice = (res.data?.data ?? res.data) || invoice;
      }
    } catch (e) {
      console.warn("Could not fetch full invoice for recall", e);
    }
    console.log("Recalled invoice for state update:", invoice);
    setPreviousInvoiceId(invoice.id);
    setInvoiceNumber(invoice.invoice_no || `INV-${invoice.id}`);
    setLastCreatedInvoiceNo(null); // Clear last created so recalled number shows
    setSelectedCustomer(invoice.customer || null);

    // Map backend invoice_items to frontend InvoiceItem structure
    const mappedItems = (invoice.invoice_items || []).map((item: any) => ({
      id: item.stock_id || item.id,
      sku: item.stock?.sku || item.sku || "N/A",
      name: item.stock?.name || item.name || "Unknown Item",
      description: item.stock?.description || item.description || "",
      unitPrice: Number(item.selling_price || item.unitPrice || 0),
      qty: Number(item.quantity || item.qty || 0)
    }));

    setInvoiceItems(mappedItems);
    setPaidAmount(Number(invoice.paid_amount || 0));
    setDiscountAmount(Number(invoice.discount_amount || 0));
    setQty(invoice.next_box_number?.toString() || "0");
    setShowRecall(false);
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
        previous_invoice_id: previousInvoiceId || null,
        total_amount: totalAmount,
        discount_type: discountType.toUpperCase(),
        next_box_number: boxQty
      };

      if (paidAmount > 0) invoicePayload.paid_amount = paidAmount;
      if (discountAmount > 0) invoicePayload.discount_amount = discountAmount;

      console.log("Creating invoice with payload:", invoicePayload);

      const invoiceResponse = await createInvoice(invoicePayload);

      console.log("Invoice creation response:", invoiceResponse);

      const responseData = invoiceResponse.data?.data || invoiceResponse.data;

      if (!responseData) {
        throw new Error("No response data from server");
      }

      const newInvoiceId = responseData.id;
      const newInvoiceNo = responseData.invoice_no || `INV-${newInvoiceId}`;

      if (!newInvoiceId) {
        throw new Error("Invoice ID not returned");
      }

      // Set the invoice number and remember it
      setInvoiceNumber(newInvoiceNo);
      setLastCreatedInvoiceNo(newInvoiceNo);

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

      alert(`Invoice #${newInvoiceNo} sent to cashier successfully!`);

      // Mark as finalized so auto-save does not run
      hasFinalizedRef.current = true;
      localStorage.removeItem("pos_local_draft_invoice");

      // Reset form but keep the invoice number displayed
      setInvoiceItems([]);
      setSelectedCustomer(null);
      setQty("0");
      setDiscountAmount(0);
      setPaidAmount(0);
      setPreviousInvoiceId(null);
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
      // If we already created/saved a draft (or recalled one), cancel it in backend
      const toCancelId = lastDraftInvoiceIdRef.current || previousInvoiceId || null;

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

      // Reset everything including invoice number
      setInvoiceItems([]);
      setSelectedCustomer(null);
      setQty("0");
      setDiscountAmount(0);
      setPaidAmount(0);
      setPreviousInvoiceId(null);
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
    if (lastCreatedInvoiceNo) return `PENDING: ${lastCreatedInvoiceNo}`;
    if (invoiceNumber && invoiceNumber !== "AUTO") return ` ${invoiceNumber}`;
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
                    ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim()
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