import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination";

interface ViewStockProps {
  goBack: () => void;
}

interface Stock {
  id: number;
  name: string;
  other_name?: string;
  type_name?: string;
  category_name?: string;
  sub_category_name?: string;
  sku?: string;
  description?: string;
  rack?: string;
  outlet_name?: string;
  origin?: string;
  buy_price?: number;
  retail_price?: number;
  stock_price?: number;
  quantity?: number;
  unit?: string;
  created_at?: string;
  status?: string;
}

const getStocksPage = async (take = 200, skip = 0) => {
  return api.get("/store/stocks", { params: { take, skip } });
};

const ViewStock = ({ goBack }: ViewStockProps) => {
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const take = 20;

  const loadAllStocks = async () => {
    try {
      setLoading(true);

      const PAGE_SIZE = 200;
      let skip = 0;
      let all: Stock[] = [];

      // ✅ loop pages until backend returns less than PAGE_SIZE
      for (let i = 0; i < 50; i++) {
        const res = await getStocksPage(PAGE_SIZE, skip);

        const pageData: Stock[] = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        all = [...all, ...pageData];

        if (pageData.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
      }

      setStocks(all);
    } catch (err) {
      console.error("Error loading stocks:", err);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStocks();
  }, []);

  // Reset to page 1 when searching
  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stocks;

    return stocks.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const sku = (s.sku || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      // Search by item name, SKU, and description
      return name.includes(q) || sku.includes(q) || desc.includes(q);
    });
  }, [stocks, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / take));

  const pagedStocks = useMemo(() => {
    const start = (currentPage - 1) * take;
    return filteredStocks.slice(start, start + take);
  }, [filteredStocks, currentPage]);

  return (
    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center p-10 mx-auto overflow-hidden">
      {/* TOP BAR */}
      <div className="w-full shrink-0 bg-[#D9D9D9] rounded-full flex items-center justify-between px-6 py-8 mb-10">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-[29px] text-black"
        >
          <img src="/Polygon.png" className="w-12 h-12" alt="Back" />
          Main menu
        </button>

        <span className="font-bold text-[48px] text-black">View Stock</span>

        <button className="flex items-center gap-2 text-[29px] text-black opacity-50">
          Main menu
          <img src="/Polygon 2.png" className="w-12 h-12" alt="Next" />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="w-full max-w-[1100px] bg-white rounded-full flex items-center px-8 py-5 mb-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20">
        <img
          src="/search.png"
          alt="Search"
          className="w-12 h-12 mr-6 opacity-60"
        />
        <input
          type="text"
          placeholder="Search items by name / sku..."
          className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div className="w-full flex-1 flex flex-col items-center overflow-hidden mb-8">
        <div className="w-full max-w-[1100px] h-full overflow-x-auto border border-white/20 rounded-[30px] bg-[#2F2F2F] shadow-2xl flex flex-col">
          {/* HEADER */}
          <div className="min-w-[2800px] bg-[#243A9B] text-white text-[32px] font-bold grid grid-cols-17 sticky top-0">
            {[
              "Name",
              "Sinhala Name",
              "Type",
              "Category",
              "Sub Category",
              "SKU",
              "Description",
              "Rack",
              "Outlet",
              "Origin",
              "Buying Price",
              "Retail Price",
              "Wholesale Price",
              "Quantity",
              "Unit",
              "Created At",
              "Status",
            ].map((h, i) => (
              <div
                key={i}
                className="px-4 py-6 border-r border-white/20 truncate text-center"
              >
                {h}
              </div>
            ))}
          </div>

          {/* BODY */}
          <div className="min-w-[2800px] flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-white text-[40px]">
                Loading stocks...
              </div>
            ) : pagedStocks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/50 text-[40px]">
                No stocks found
              </div>
            ) : (
              pagedStocks.map((stock, idx) => (
                <div
                  key={stock.id || idx}
                  className="grid grid-cols-17 bg-[#3A3A3A] border-b border-white/10 hover:bg-white/5 text-[28px] text-white"
                >
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.name}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.other_name || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.type_name || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.category_name || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.sub_category_name || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.sku || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.description || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.rack || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.outlet_name || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {(stock as any)["item.origin"] || stock.origin || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    LKR {stock.buy_price || "0"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    LKR {stock.retail_price || "0"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    LKR {stock.retail_price || "0"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.quantity || "0"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.unit || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.created_at?.split("T")[0] || "-"}
                  </div>
                  <div className="px-4 py-4 border-r border-white/10 truncate text-center">
                    {stock.status || "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="shrink-0 mb-8 scale-[1.5] text-white">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
        />
      </div>
    </div>
  );
};

export default ViewStock;
