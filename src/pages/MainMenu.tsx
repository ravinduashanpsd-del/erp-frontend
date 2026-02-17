import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MenuCard from "../components/MenuCard";
import ViewStock from "./ViewStock";

function MainMenu() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showViewStock, setShowViewStock] = useState(false);

  // ✅ NEW STATE
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername);

    const loginSuccess = localStorage.getItem("loginSuccess");
    if (loginSuccess === "true") {
      setShowSuccess(true);
      localStorage.removeItem("loginSuccess");
      setTimeout(() => setShowSuccess(false), 4000);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("loginSuccess");
    navigate("/");
  };

  if (showViewStock) return <ViewStock goBack={() => setShowViewStock(false)} />;

  return (
    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center justify-center p-10 mx-auto overflow-hidden">

      {/* Success Message */}
      <div className="h-[60px] mb-8">
        {showSuccess && (
          <div className="bg-green-700 text-white px-12 py-4 rounded-full text-[28px] font-medium text-center animate-fade-in">
            Login Successful!
          </div>
        )}
      </div>

      {/* Greeting */}
      {username && (
        <h2 className="text-white text-[60px] font-bold text-center mb-16">
          Hello {username}!
        </h2>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-x-20 gap-y-16 mb-20">

        {/* ROW 1 */}
        <MenuCard
          title="Report Time"
          bgColor={
            activeCard === "report-time"
              ? "bg-gradient-to-b from-[#8BA6FF] via-[#002FCA] to-[#002394]"
              : "bg-white"
          }
          onClick={() => setActiveCard("report-time")}
          icon={
            <img
              src="/report-time.png"
              alt="Report Time"
              className="w-48 h-48 object-contain"
            />
          }
        />

        <MenuCard
          title="Apply Leave"
          bgColor={
            activeCard === "apply-leave"
              ? "bg-gradient-to-b from-[#8BA6FF] via-[#002FCA] to-[#002394]"
              : "bg-white"
          }
          onClick={() => setActiveCard("apply-leave")}
          icon={
            <img
              src="/leave.png"
              alt="Apply Leave"
              className="w-48 h-48 object-contain"
            />
          }
        />

        {/* ROW 2 */}
        <MenuCard
          title="Point Of Sales"
          onClick={() => {
            setActiveCard("pos");
            navigate("/pos");
          }}
          bgColor="bg-white"
          icon={
            <img
              src="/cashier.png"
              alt="Point Of Sales"
              className="w-[220px] h-[220px] object-contain"
            />
          }
        />

        <MenuCard
          title="View Stock"
          onClick={() => {
            setActiveCard("stock");
            setShowViewStock(true);
          }}
          bgColor="bg-white"
          icon={
            <img
              src="/inventory.png"
              alt="View Stock"
              className="w-48 h-48 object-contain"
            />
          }
        />
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-[400px] h-[100px] bg-red-700 text-white rounded-[50px] text-[40px] font-bold hover:bg-red-800 transition-colors shadow-lg mt-8"
      >
        Logout
      </button>

    </div>
  );
}

export default MainMenu;
