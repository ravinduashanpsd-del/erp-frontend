import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages;

  return (
    <div className="flex gap-6 mt-4 items-center text-white">
      <button
        className={`w-10 h-10 flex items-center justify-center rounded
          ${prevDisabled ? "opacity-40 cursor-not-allowed" : "hover:scale-110 active:scale-95 transition-transform"}`}
        disabled={prevDisabled}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <img src="/Polygon.png" alt="Previous" className="w-full h-full object-contain" />
      </button>

      <span className="font-medium text-[30px]">
        Page <span className="font-bold">{currentPage}</span> of{" "}
        <span className="font-bold">{totalPages}</span>
      </span>

      <button
        className={`w-10 h-10 flex items-center justify-center rounded
          ${nextDisabled ? "opacity-40 cursor-not-allowed" : "hover:scale-110 active:scale-95 transition-transform"}`}
        disabled={nextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <img src="/Polygon 2.png" alt="Next" className="w-full h-full object-contain" />
      </button>
    </div>
  );
};

export default Pagination;
