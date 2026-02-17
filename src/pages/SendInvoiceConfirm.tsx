// SendInvoiceConfirm.tsx
interface SendInvoiceConfirmProps {
  onConfirm: () => void;
  onClose: () => void;
}

const SendInvoiceConfirm = ({
  onConfirm,
  onClose,
}: SendInvoiceConfirmProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-[800px] h-auto bg-[#D9D9D9] rounded-[40px] p-8 shadow-2xl flex flex-row items-center justify-between gap-16">
        {/* TEXT */}
        <div className="text-[42px] font-bold text-gray-700 leading-tight text-left">
          Do You Want to
          <br />
          <span className="text-black">Send Invoice?</span>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col gap-6 w-auto">
          {/* YES */}
          <button
            onClick={onConfirm}
            className="w-[220px] h-[90px] bg-gradient-to-b from-[#7CFE96] to-[#1E7A3A] text-white font-bold rounded-[20px] shadow hover:from-[#8CFEA6] hover:to-[#2E8A4A] transition-all text-[42px] active:scale-95"
          >
            YES
          </button>

          {/* NO */}
          <button
            onClick={onClose}
            className="w-[220px] h-[90px] bg-gradient-to-b from-[#F59B9B] via-[#ED654A] to-[#3B0202] text-white font-bold rounded-[20px] shadow hover:from-[#F5ABAB] hover:to-[#ED755A] transition-all text-[42px] active:scale-95"
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendInvoiceConfirm;