import { useEffect, useState } from "react";
import { getCustomers, type Customer } from "../api/customers";
import Pagination from "../components/Pagination";

interface AddCustomerProps {
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const ITEMS_PER_PAGE = 10;

const AddCustomer = ({ onClose, onSelect }: AddCustomerProps) => {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load all customers on mount
  useEffect(() => {
    const loadAllCustomers = async () => {
      try {
        setLoading(true);
        const res = await getCustomers(1, 1000); // Load up to 1000 customers
        setAllCustomers(res.data.data || []);
      } catch (e) {
        console.error("Error loading customers:", e);
        setAllCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllCustomers();
  }, []);

  // Filter customers based on search
  const filteredCustomers = allCustomers.filter((customer) =>
    customer.id.toString().includes(search) ||
    `${customer.first_name || ''} ${customer.last_name || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (customer.address && customer.address.toLowerCase().includes(search.toLowerCase())) ||
    (customer.telephone && customer.telephone.toLowerCase().includes(search.toLowerCase())) ||
    (customer.description && customer.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Calculate pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleSelect = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[1200px] max-h-[1920px] bg-[#D9D9D9] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">

        <div className="w-full bg-white rounded-full flex items-center px-8 py-5 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20 flex-shrink-0">
          <img src="/search.png" alt="Search" className="w-12 h-12 mr-6 opacity-60" />
          <input
            type="text"
            placeholder="Search Customer..."
            className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="flex-1 bg-[#BFBABA] rounded-3xl overflow-hidden border-2 border-black/30 flex flex-col mb-4 sm:mb-6 min-h-0">
          <div className="grid grid-cols-5 bg-[#9FA8DA] font-semibold text-black text-[16px] sm:text-[22px] md:text-[26px] flex-shrink-0">
            <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/30 text-center">#</div>
            <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/30 text-center">Customer Name</div>
            <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/30 text-center">Address</div>
            <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/30 text-center">Phone</div>
            <div className="px-2 sm:px-3 py-2 sm:py-3 border-b-2 border-black/30 text-center">Description</div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white/30 min-h-0">
            {loading && (
              <div className="text-center py-8 sm:py-12 text-[24px] sm:text-[30px] text-gray-600">Loading...</div>
            )}

            {!loading && paginatedCustomers.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-[24px] sm:text-[30px] text-gray-600">
                {filteredCustomers.length === 0 ? "No customers found" : "No results for your search"}
              </div>
            )}

            {paginatedCustomers.map((c, i) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`grid grid-cols-5 cursor-pointer text-[14px] sm:text-[18px] md:text-[22px] transition-colors
                  ${selected?.id === c.id
                    ? "bg-green-300"
                    : "hover:bg-white/40"
                  }`}
              >
                <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/20 text-center">
                  {startIndex + i + 1}
                </div>
                <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/20 text-center truncate">
                  {c.first_name} {c.last_name}
                </div>
                <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/20 text-center truncate">
                  {c.address || "-"}
                </div>
                <div className="px-2 sm:px-3 py-2 sm:py-3 border-r-2 border-b-2 border-black/20 text-center truncate">
                  {c.telephone || "-"}
                </div>
                <div className="px-2 sm:px-3 py-2 sm:py-3 border-b-2 border-black/20 text-center truncate">
                  {c.description || "-"}
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
              disabled={!selected}
              onClick={handleSelect}
              className="px-8 sm:px-12 h-14 sm:h-16 bg-gradient-to-b from-[#05522B] to-[#023618] text-white rounded-full text-[20px] sm:text-[28px] disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#06622B] hover:to-[#034618] transition-all min-w-[140px] sm:min-w-[160px]"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomer;