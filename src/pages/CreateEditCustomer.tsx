import { useEffect, useState } from "react";
import {
  createCustomer,
  getCustomers,
  type Customer,
  getUserId,
} from "../api/customers";
import api from "../api/axios";

interface CreateEditCustomerProps {
  goBack: () => void;
}

const CreateEditCustomer = ({ goBack }: CreateEditCustomerProps) => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    address: "",
    telephone: "",
    email: "",
    description: "",
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* ---------------- LOAD CUSTOMERS ---------------- */
  const loadCustomers = async () => {
    try {
      const res = await getCustomers(1, 100);
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  /* ---------------- INPUT HANDLER ---------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------------- CREATE / UPDATE ---------------- */
  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (editingId) {
        // UPDATE
        await api.patch(`/pos/customer/${editingId}`, {
          first_name: form.first_name,
          last_name: form.last_name,
          address: form.address,
          telephone: form.telephone,
          description: form.description,
          updated_by: getUserId(),
        });
      } else {
        // CREATE
        await createCustomer({
          first_name: form.first_name,
          last_name: form.last_name,
          address: form.address,
          telephone: form.telephone,
          description: form.description,
        });
      }

      setForm({
        first_name: "",
        last_name: "",
        address: "",
        telephone: "",
        email: "",
        description: "",
      });
      setEditingId(null);
      loadCustomers();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EDIT CUSTOMER ---------------- */
  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      address: customer.address || "",
      telephone: customer.telephone || "",
      email: "",
      description: customer.description || "",
    });
  };

  return (

    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center p-10 mx-auto overflow-hidden">

      {/* TOP BAR */}
      <div className="w-full shrink-0 bg-[#D9D9D9] rounded-full flex items-center justify-between px-6 py-8 mb-10">
        <button onClick={goBack} className="flex items-center gap-2 font-medium">
          <img src="/Polygon.png" className="w-12 h-12" alt="Back" />
          <span className="text-[32px]">POS</span>
        </button>

        <span className="font-bold text-[45px] text-center">
          Create / Edit Customer
        </span>

        <button className="opacity-50 flex items-center gap-2">
          <span className="text-[32px]">POS</span>
          <img src="/Polygon 2.png" className="w-12 h-12" alt="POS" />
        </button>
      </div>

      {/* FORM */}
      <div className="w-[1100px] bg-[#D0D0D0] rounded-[40px] p-10 mb-8 shadow-2xl shrink-0">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="First Name"
            className="h-[100px] rounded-full px-8 text-[35px] bg-white shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-500"
          />
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            className="h-[100px] rounded-full px-8 text-[35px] bg-white shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Address"
            rows={5}
            className="rounded-[30px] px-8 py-6 text-[35px] bg-white shadow-inner resize-none focus:outline-none focus:ring-4 focus:ring-blue-500"
          />
          <div className="flex flex-col gap-6 justify-between">
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="h-[100px] rounded-full px-8 text-[35px] bg-white shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-500"
            />
            <input
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="Phone"
              className="h-[100px] rounded-full px-8 text-[35px] bg-white shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-500"
            />
          </div>
        </div>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          rows={3}
          className="w-full rounded-[30px] px-8 py-6 text-[35px] bg-white mb-6 shadow-inner resize-none focus:outline-none focus:ring-4 focus:ring-blue-500"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-[300px] h-[100px] bg-gradient-to-b from-[#0E7A2A] to-[#064C18] text-white rounded-full text-[40px] font-bold hover:scale-105 transition-transform shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingId ? "UPDATE" : "ADD"}
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="w-[1100px] bg-white rounded-full flex items-center px-10 py-5 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border-2 border-white/20 shrink-0">
        <img src="/search.png" alt="Search" className="w-12 h-12 mr-6 opacity-60" />
        <input
          type="text"
          placeholder="Search customers by name or phone..."
          className="w-full bg-transparent outline-none text-[35px] text-black placeholder:text-gray-400 font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div className="w-[1100px] flex-1 bg-[#2F2F2F] rounded-[40px] p-8 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-gray-200 text-[28px]">
            <thead className="bg-[#3A3A3A] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">First</th>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">Last</th>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">Address</th>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">Phone</th>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">Desc</th>
                <th className="px-6 py-4 text-left font-bold border-b border-white/20">Created</th>
              </tr>
            </thead>

            <tbody>
              {customers
                .filter(c => {
                  const s = search.toLowerCase();
                  return (
                    (c.first_name || "").toLowerCase().includes(s) ||
                    (c.last_name || "").toLowerCase().includes(s) ||
                    (c.telephone || "").toLowerCase().includes(s)
                  );
                })
                .map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleEdit(c)}
                    className="hover:bg-white/10 cursor-pointer border-b border-white/10 transition-colors"
                  >
                    <td className="px-6 py-5 truncate max-w-[150px]">{c.first_name || "-"}</td>
                    <td className="px-6 py-5 truncate max-w-[150px]">{c.last_name || "-"}</td>
                    <td className="px-6 py-5 truncate max-w-[200px]">{c.address || "-"}</td>
                    <td className="px-6 py-5 truncate max-w-[180px]">{c.telephone || "-"}</td>
                    <td className="px-6 py-5 truncate max-w-[200px]">{c.description || "-"}</td>
                    <td className="px-6 py-5">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="text-center text-white/50 text-[35px] mt-20">No customers found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEditCustomer;
