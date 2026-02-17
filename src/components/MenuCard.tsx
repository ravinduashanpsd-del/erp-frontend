import React from "react";

// Props for MenuCard component
interface MenuCardProps {
  title: string;
  bgColor: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

// MenuCard component
function MenuCard({ title, bgColor, icon, onClick }: MenuCardProps) {
  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <div
        className={`${bgColor} 
        w-[380px] h-[380px] 
        rounded-[90px] 
        flex items-center justify-center `}
      >
        {icon}
      </div>

      <p className="mt-2 text-white text-[50px] font-semibold text-center">
        {title}
      </p>
    </div>
  );
}

export default MenuCard;
