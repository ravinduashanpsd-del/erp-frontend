// CreateCustomer.tsx
import { useState } from "react";
import { createCustomer, type Customer } from "../api/customers";

interface CreateCustomerProps {
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

const CreateCustomer = ({ onClose, onCustomerCreated }: CreateCustomerProps) => {
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    address: "",
    telephone: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await createCustomer(formData);
      const newCustomer: Customer = response.data.data || response.data;
      
      alert("Customer created successfully!");
      
      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
      
      onClose();
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer");
    } finally {
      setLoading(false);
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
        
        {/* HEADER */}
        <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
          <h2 className="font-bold text-black text-[28px] sm:text-[36px] md:text-[42px]">Create New Customer</h2>
          <p className="text-gray-600 text-[18px] sm:text-[24px] md:text-[28px]">Fill in customer details</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 px-2 mb-4 sm:mb-6 min-h-0">
          {/* First Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px]"
              placeholder="Enter first name"
            />
          </div>

          {/* Middle Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px]"
              placeholder="Enter middle name (optional)"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px]"
              placeholder="Enter last name"
            />
          </div>

          {/* Telephone */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              Telephone *
            </label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px]"
              placeholder="Enter phone number"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px]"
              placeholder="Enter address"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5 text-[16px] sm:text-[20px] md:text-[24px]">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-white rounded-2xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-[16px] sm:text-[20px] md:text-[24px] resize-none"
              placeholder="Enter description (optional)"
            />
          </div>
        </form>

        {/* BUTTONS */}
        <div className="flex justify-end gap-4 sm:gap-6 border-t border-gray-300 pt-4 sm:pt-6 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-8 sm:px-12 h-14 sm:h-16 bg-gray-300 text-black rounded-full font-medium hover:bg-gray-400 transition-all text-[18px] sm:text-[24px] md:text-[28px] min-w-[140px] sm:min-w-[160px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="px-8 sm:px-12 h-14 sm:h-16 bg-gradient-to-b from-[#05522B] to-[#023618] text-white rounded-full font-medium hover:from-[#06622B] hover:to-[#034618] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[18px] sm:text-[24px] md:text-[28px] min-w-[140px] sm:min-w-[200px]"
          >
            {loading ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomer;