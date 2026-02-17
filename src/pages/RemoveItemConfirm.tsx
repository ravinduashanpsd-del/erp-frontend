interface RemoveItemConfirmProps {
  itemName?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const RemoveItemConfirm = ({ itemName, onConfirm, onClose }: RemoveItemConfirmProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-[620px] sm:w-[860px] h-auto bg-[#D9D9D9] rounded-[30px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-16">
        {/* TEXT */}
        <div className="text-[28px] sm:text-[36px] md:text-[42px] font-bold text-gray-700 leading-tight text-center sm:text-left">
          Remove this item?
          <br />
          <span className="text-black">{itemName ? itemName : "Selected item"}</span>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-row sm:flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          {/* YES */}
          <button
            onClick={() => void onConfirm()}
            className="flex-1 sm:flex-none sm:w-[220px] sm:h-[90px] h-[60px] bg-gradient-to-b from-[#F59B9B] via-[#ED654A] to-[#3B0202] text-white font-bold rounded-[16px] sm:rounded-[20px] shadow hover:from-[#F5ABAB] hover:to-[#ED755A] transition-all text-[20px] sm:text-[32px] md:text-[42px] active:scale-95"
          >
            YES
          </button>

          {/* NO */}
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none sm:w-[220px] sm:h-[90px] h-[60px] bg-gradient-to-b from-[#7CFE96] to-[#1E7A3A] text-white font-bold rounded-[16px] sm:rounded-[20px] shadow hover:from-[#8CFEA6] hover:to-[#2E8A4A] transition-all text-[20px] sm:text-[32px] md:text-[42px] active:scale-95"
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveItemConfirm;
