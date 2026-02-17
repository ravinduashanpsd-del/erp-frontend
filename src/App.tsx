// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainMenu from "./pages/MainMenu";
import PosMainMenu from "./pages/PosMainMenu";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  // ✅ Your screens were designed in 1200 x 1920.
  // On real devices (Tab A8), Chrome uses CSS pixels like 800 x 1280.
  // So we scale the whole UI to fit the visible screen.
  const DESIGN = useMemo(() => ({ w: 1200, h: 1920 }), []);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calcScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Fit without scrolling; do not upscale above 1.
      const s = Math.min(vw / DESIGN.w, vh / DESIGN.h, 1);
      setScale(Number.isFinite(s) ? s : 1);
    };

    calcScale();
    window.addEventListener("resize", calcScale);
    window.addEventListener("orientationchange", calcScale);

    return () => {
      window.removeEventListener("resize", calcScale);
      window.removeEventListener("orientationchange", calcScale);
    };
  }, [DESIGN]);

  const outerStyle = {
    width: `${DESIGN.w * scale}px`,
    height: `${DESIGN.h * scale}px`,
  } as const;

  const innerStyle = {
    width: `${DESIGN.w}px`,
    height: `${DESIGN.h}px`,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  } as const;

  return (
    <BrowserRouter>
      <div className="app-scale-container">
        <div className="app-scale-outer" style={outerStyle}>
          <div className="app-scale-inner" style={innerStyle}>
            <Routes>
              <Route path="/" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route
                path="/main-menu"
                element={
                  <ProtectedRoute>
                    <MainMenu />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <PosMainMenu />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App; //navodadev-2
