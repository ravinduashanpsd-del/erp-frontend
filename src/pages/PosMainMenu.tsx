import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateInvoice from "./CreateInvoice";
import CreateEditCustomer from "./CreateEditCustomer";
import ViewPreviousInvoice from "./ViewPreviousInvoice";

const PosMainMenu = () => {
    const navigate = useNavigate();

    // States to control which component/modal to show
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [showViewInvoice, setShowViewInvoice] = useState(false);

    // Conditional rendering based on which action is chosen
    if (showCreateInvoice) return <CreateInvoice goBack={() => setShowCreateInvoice(false)} />;
    if (showCreateCustomer) return <CreateEditCustomer goBack={() => setShowCreateCustomer(false)} />;
    if (showViewInvoice) return <ViewPreviousInvoice goBack={() => setShowViewInvoice(false)} />;

    return (
        <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center justify-center p-10 overflow-hidden">
            {/* Top Bar */}
            <div className="w-[1000px] bg-[#D9D9D9] rounded-full flex items-center justify-between px-6 py-8 mb-16">
                <button
                    onClick={() => navigate("/main-menu")}
                    className="flex items-center gap-2 text-[29px] text-black"
                >
                    <img src="/Polygon.png" alt="Back" className="w-12 h-12" />
                    Main menu
                </button>
                <span className="font-bold text-[48px] text-black">POS</span>
                <button className="flex items-center gap-2 text-[29px] text-black">
                    Main menu
                    <img src="/Polygon 2.png" alt="Next" className="w-12 h-12" />
                </button>
            </div>

            {/* Buttons Container */}
            <div className="w-full max-w-[900px] flex flex-col gap-16">

                {/* Create Invoice */}
                <button
                    onClick={() => setShowCreateInvoice(true)}
                    className="w-full h-[320px] flex items-center justify-between rounded-[80px] px-16 text-white bg-gradient-to-b from-[#7D77ED] via-[#251DCC] to-[#191388] hover:scale-105 transition-transform shadow-2xl"
                >
                    <div className="text-left">
                        <h2 className="text-[50px] font-bold leading-tight">
                            Create<br />New<br />Invoice
                        </h2>
                    </div>
                    <div>
                        <img src="/mdi_invoice-text-plus.png" alt="Create Invoice" className="w-48 h-48" />
                    </div>
                </button>

                {/* View Previous Invoice */}
                <button
                    onClick={() => setShowViewInvoice(true)}
                    className="w-full h-[320px] flex items-center justify-between rounded-[80px] px-16 text-white bg-gradient-to-b from-[#9EF6A5] via-[#1B8C21] to-[#022003] hover:scale-105 transition-transform shadow-2xl"
                >
                    <div className="text-left">
                        <h2 className="text-[50px] font-bold leading-tight">
                            View<br />Previous<br />Invoice
                        </h2>
                    </div>
                    <div>
                        <img src="/mdi_invoice-clock.png" alt="View Invoice" className="w-48 h-48" />
                    </div>
                </button>

                {/* Create / Edit Customer */}
                <button
                    onClick={() => setShowCreateCustomer(true)}
                    className="w-full h-[320px] flex items-center justify-between rounded-[80px] px-16 text-white bg-gradient-to-b from-[#F6ED9E] via-[#868C1B] to-[#1A2002] hover:scale-105 transition-transform shadow-2xl"
                >
                    <div className="text-left">
                        <h2 className="text-[50px] font-bold leading-tight">
                            Create /<br />Edit<br />Customer
                        </h2>
                    </div>
                    <div>
                        <img src="/mdi_user-add.png" alt="Create Customer" className="w-48 h-48" />
                    </div>
                </button>

            </div>
        </div>
    );
};

export default PosMainMenu;
