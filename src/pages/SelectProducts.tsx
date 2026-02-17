import { useEffect, useState, useMemo } from "react";
import { getItems } from "../api/items";
import { getStocksByOutlet } from "../api/stocks";

interface SelectProductsProps {
  onClose: () => void;
  onAdd: (product: any) => void;
}

interface Item {
  id: number;
  sub_category_id: number;
  name: string;
  other_name: string;
  description: string;
  origin: string;
  sku: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10; // Show 10 items per page

const SelectProducts = ({ onClose, onAdd }: SelectProductsProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [wholesalePrice, setWholesalePrice] = useState<string>("");
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  // Cache stocks for the currently selected outlet so we can display correct outlet name
  const [stocksByItemId, setStocksByItemId] = useState<Record<number, any>>({});
  const [currentOutletName, setCurrentOutletName] = useState<string>("-");


  useEffect(() => {
  const loadOutletStocks = async () => {
    try {
      const outletId = Number(localStorage.getItem("outlet_id")) || 1;
      const res = await getStocksByOutlet(outletId);

      const stocksData = Array.isArray(res.data)
        ? res.data
        : (res.data?.data && Array.isArray(res.data.data))
        ? res.data.data
        : [];

      const map: Record<number, any> = {};
      let outletName = "";

      stocksData.forEach((s: any) => {
        const itemId = Number(s?.item_id ?? s?.itemId);
        if (Number.isFinite(itemId)) map[itemId] = s;
        if (!outletName) {
          outletName = s?.outlet_name || s?.outlet?.name || "";
        }
      });

      setStocksByItemId(map);
      if (outletName) setCurrentOutletName(outletName);
    } catch (err) {
      console.error("Failed to load outlet stocks:", err);
      setStocksByItemId({});
    }
  };

  loadOutletStocks();
}, []);


useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await getItems(search);
        if (Array.isArray(res.data)) {
          setItems(res.data);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setItems(res.data.data);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("Error fetching items:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [search]);

  // Calculate pagination values
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / ITEMS_PER_PAGE);
  }, [items]);

  // Get current page items
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage]);

  const handleItemSelect = (item: Item) => {
  setSelectedItem(item);

  const stock = stocksByItemId[item.id];

  if (!stock) {
    alert("No stock found for this item in current outlet");
    setWholesalePrice("");
    setSellingPrice("");
    setAvailableStock(0);
    setSelectedStockId(null);
    return;
  }

  setAvailableStock(Number(stock.quantity || 0));
  setSelectedStockId(stock.id);

  const selling =
    stock.stock_price ??
    stock.retail_price ??
    stock.selling_price ??
    0;

  // System rule: wholesale selling price == selling price
  setSellingPrice(String(selling));
  setWholesalePrice(String(selling));
};


  const handleAddToInvoice = () => {
    if (!selectedItem || !selectedStockId) {
      alert("Please select an item with available stock first");
      return;
    }

    const qty = parseInt(quantity) || 1;

    if (qty > availableStock) {
      alert(`Insufficient stock! Available: ${availableStock}`);
      return;
    }

    const price = parseFloat(sellingPrice) || 0;

    const product = {
      id: selectedItem.id,
      stockId: selectedStockId,
      sku: selectedItem.sku,
      name: selectedItem.name,
      description: selectedItem.description,
      unitPrice: price,
      qty: qty
    };

    onAdd(product);

    // Reset form
    setSelectedItem(null);
    setSelectedStockId(null);
    setQuantity("1");
    setSellingPrice("");
    setWholesalePrice("");
    setAvailableStock(0);

    alert("Product added to invoice!");
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-[1200px] max-h-[1920px] bg-[#D9D9D9] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* SEARCH */}
        <div className="w-full bg-white rounded-full flex items-center px-10 py-5 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20 flex-shrink-0">
          <img src="/search.png" alt="Search" className="w-12 h-12 mr-6 opacity-60" />
          <input
            type="text"
            placeholder="Search Products..."
            className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="flex-1 bg-[#A0A0A0] rounded-3xl overflow-hidden border-2 border-black/30 flex flex-col mb-4 sm:mb-6 min-h-0">
          {/* HEADER */}
          <div className="grid grid-cols-5 bg-[#2F2F2F] font-semibold text-white px-3 sm:px-4 py-2 sm:py-3 text-[16px] sm:text-[22px] md:text-[26px] flex-shrink-0">
            <div className="text-center">#</div>
            <div className="text-center">SKU</div>
            <div className="text-center">Description</div>
            <div className="text-center">Item Name</div>
            <div className="text-center">Outlet</div>
          </div>

          {/* ROWS */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && <div className="text-center py-8 sm:py-12 text-[24px] sm:text-[30px] text-gray-600">Loading...</div>}

            {!loading && items.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-[24px] sm:text-[30px] text-gray-600">No items found</div>
            )}

            {!loading &&
              currentItems.map((item, i) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={`grid grid-cols-5 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-[14px] sm:text-[18px] md:text-[22px] ${selectedItem?.id === item.id ? 'bg-blue-300' : ''}`}
                  >
                    <div className="text-center">{globalIndex + 1}</div>
                    <div className="text-center font-medium truncate">{item.sku}</div>
                    <div className="text-center truncate">{item.description}</div>
                    <div className="text-center truncate">{item.name}</div>
                    <div className="text-center truncate">{stocksByItemId[item.id]?.outlet_name || stocksByItemId[item.id]?.outlet?.name || currentOutletName || "-"}</div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0 overflow-x-auto">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-300 hover:bg-gray-400 rounded-full text-black text-[20px] sm:text-[24px] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            ◀
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 sm:gap-2">
            {totalPages > 0 && (
              <button
                onClick={() => goToPage(1)}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full text-[16px] sm:text-[20px] font-bold flex-shrink-0 ${currentPage === 1
                  ? 'bg-gray-400 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-black'
                  }`}
              >
                1
              </button>
            )}

            {currentPage > 3 && totalPages > 5 && (
              <span className="text-[16px] sm:text-[18px]">...</span>
            )}

            {Array.from({ length: Math.min(3, totalPages - 2) }, (_, i) => {
              let pageNum;
              if (currentPage <= 2) {
                pageNum = i + 2;
              } else if (currentPage >= totalPages - 1) {
                pageNum = totalPages - 3 + i;
              } else {
                pageNum = currentPage - 1 + i;
              }

              if (pageNum > 1 && pageNum < totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full text-[16px] sm:text-[20px] font-bold flex-shrink-0 ${currentPage === pageNum
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-black'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}

            {currentPage < totalPages - 2 && totalPages > 5 && (
              <span className="text-[16px] sm:text-[18px]">...</span>
            )}

            {totalPages > 1 && (
              <button
                onClick={() => goToPage(totalPages)}
                className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full text-[16px] sm:text-[20px] font-bold flex-shrink-0 ${currentPage === totalPages
                  ? 'bg-gray-400 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-black'
                  }`}
              >
                {totalPages}
              </button>
            )}
          </div>

          <span className="text-[14px] sm:text-[16px] md:text-[18px] font-medium text-black mx-2 sm:mx-4 flex-shrink-0">
            <span className="font-bold">{currentPage}</span> / <span className="font-bold">{totalPages || 1}</span>
          </span>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-300 hover:bg-gray-400 rounded-full text-black text-[20px] sm:text-[24px] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            ▶
          </button>
        </div>

        {/* FORM */}
        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[210px_1fr] gap-y-3 sm:gap-y-4 gap-x-4 sm:gap-x-6 mb-4 sm:mb-6 flex-shrink-0">
          {/* Selected Product */}
          <span className="font-semibold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">Selected:</span>
          <span className="text-blue-700 font-bold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">
            {selectedItem ? selectedItem.sku : "None"}
          </span>

          {/* Quantity */}
          <span className="font-semibold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">Qty:</span>
          <input
            type="number"
            placeholder="Qty"
            className="w-full max-w-[220px] bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-[18px] sm:text-[22px] md:text-[24px]"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
          />

          {/* Wholesale Price */}
          <span className="font-semibold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">Wholesale:</span>
          <input
            type="number"
            placeholder="Price"
            className="w-full max-w-[220px] bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-[18px] sm:text-[22px] md:text-[24px]"
            value={wholesalePrice}
            readOnly
            disabled
            // Wholesale is synced with selling price
            step="0.01"
          />

          {/* Available Stock */}
          <span className="font-semibold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">Available Stock:</span>
          <span className={`font-bold text-[20px] sm:text-[26px] md:text-[30px] leading-tight ${availableStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {availableStock}
          </span>

          {/* Selling Price */}
          <span className="font-semibold text-[20px] sm:text-[26px] md:text-[30px] leading-tight">Selling Price:</span>
          <input
            type="number"
            placeholder="Price"
            className="w-full max-w-[220px] bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-[18px] sm:text-[22px] md:text-[24px]"
            value={sellingPrice}
            onChange={(e) => {
              const v = e.target.value;
              setSellingPrice(v);
              // Keep wholesale in sync with selling
              setWholesalePrice(v);
            }}
            step="0.01"
            required
          />
        </div>

        {/* FOOTER */}
        <div className="flex gap-4 sm:gap-6 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-8 sm:px-12 h-14 sm:h-16 bg-gradient-to-b from-[#F59B9B] via-[#ED654A] to-[#3B0202] text-white rounded-full font-medium hover:from-[#F5ABAB] hover:to-[#ED755A] transition-all text-[18px] sm:text-[24px] md:text-[28px]"
          >
            CANCEL
          </button>

          <button
            onClick={handleAddToInvoice}
            disabled={!selectedItem}
            className="px-8 sm:px-12 h-14 sm:h-16 bg-gradient-to-b from-[#0E7A2A] to-[#064C18] text-white rounded-full font-medium hover:from-[#0E8A2A] hover:to-[#065C18] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[18px] sm:text-[24px] md:text-[28px]"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectProducts;