import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function SystemMessageProvider({ children }: Props) {
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    const originalAlert = window.alert.bind(window);

    window.alert = (message?: any) => {
      const text = typeof message === "string" ? message : String(message ?? "");
      setQueue((prev) => [...prev, text]);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const currentMessage = queue.length > 0 ? queue[0] : null;

  const closeMessage = () => {
    setQueue((prev) => prev.slice(1));
  };

  const lines = useMemo(() => (currentMessage ? currentMessage.split(/\n+/) : []), [currentMessage]);

  return (
    <>
      {children}

      {currentMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeMessage} />
          <div className="relative w-full max-w-[680px] rounded-3xl border border-white/20 bg-gradient-to-b from-[#efefef] to-[#d8d8d8] shadow-2xl p-6 sm:p-8">
            <div className="text-[26px] sm:text-[34px] font-bold text-[#1f2937] mb-4">System Message</div>
            <div className="bg-white/70 rounded-2xl p-5 sm:p-6 border border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
              {lines.map((line, idx) => (
                <p key={idx} className="text-[19px] sm:text-[24px] leading-relaxed text-[#111827] break-words">
                  {line || '\u00a0'}
                </p>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeMessage}
                className="min-w-[130px] sm:min-w-[160px] h-12 sm:h-14 rounded-full px-6 bg-gradient-to-b from-[#3BA55D] to-[#1E7A3A] text-white text-[20px] sm:text-[24px] font-semibold shadow-lg hover:brightness-105 active:scale-[0.99] transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
