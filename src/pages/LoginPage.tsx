import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Loader from "../components/Loader";
import api from "../api/axios";

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRedirectLoader, setShowRedirectLoader] = useState(false);

  // Clear session on login page load
  useEffect(() => {
    sessionStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token");
    localStorage.removeItem("user_id"); // Clear previous user ID
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!username || !password) {
      setError(true);
      return;
    }

    setError(false);
    setSuccessMsg(false);
    setLoading(true);

    localStorage.removeItem("token");
    localStorage.removeItem("user_id"); // Clear any old user ID

    try {
      const res = await api.post("/auth/login", {
        email: username,
        password: password,
      });

      console.log("Login API Response:", res.data);

      const responseData = res.data;
      // Handle both nested data structure from docs and flat structure
      const apiData = responseData.data || responseData;
      const token = apiData.accessToken || responseData.access_token || apiData.token;
      const user = apiData.user || apiData;
      const userId = user.id || user.user_id || responseData.user_id;

      if (!token) {
        throw new Error("No token received from server");
      }

      // Save auth data
      sessionStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);

      if (userId) {
        localStorage.setItem("user_id", userId.toString());
        console.log("Saved user_id to localStorage:", userId);
      } else {
        console.warn("No user ID found in login response!");
      }

      localStorage.setItem("loginSuccess", "true");

      setSuccessMsg(true);
      setLoading(false);
      setShowRedirectLoader(true);

      setTimeout(() => {
        navigate("/main-menu");
      }, 1000);
    } catch (error: any) {
      console.error("Login error:", error.response?.data || error.message);
      setError(true);
      setLoading(false);

      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="w-[1200px] h-[1920px] bg-black flex flex-col items-center justify-center mx-auto overflow-hidden relative">
      {showRedirectLoader && <Loader fullScreen={true} />}

      <div className="w-[800px] flex flex-col items-center">
        {error && (
          <div className="w-full bg-red-600 text-white py-8 rounded-full text-[32px] font-bold text-center mb-10 shadow-lg">
            Incorrect Username or Password
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-green-600 text-white py-8 rounded-full text-[32px] font-bold text-center mb-10 shadow-lg">
            Login Successful!
          </div>
        )}

        <div className="mb-[-230px]">
          <Logo />
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-12">
          <div className="w-full">
            <label className="block text-white text-[45px] font-bold mb-4 ml-6 uppercase tracking-wider">
              User Name *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              disabled={loading || showRedirectLoader}
              placeholder="Enter your username"
              className={`w-full px-10 py-10 rounded-full text-black outline-none text-[32px] shadow-inner transition-all ${error ? "bg-red-50 border-4 border-red-500" : "bg-white hover:bg-gray-100 focus:bg-white"
                } ${loading || showRedirectLoader ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          <div className="w-full">
            <label className="block text-white text-[45px] font-bold mb-4 ml-6 uppercase tracking-wider">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyPress={handleKeyPress}
              disabled={loading || showRedirectLoader}
              placeholder="••••••••"
              className={`w-full px-10 py-10 rounded-full text-black outline-none text-[32px] shadow-inner transition-all ${error ? "bg-red-50 border-4 border-red-500" : "bg-white hover:bg-gray-100 focus:bg-white"
                } ${loading || showRedirectLoader ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          <div className="flex flex-col items-center gap-10 pt-6">
            <button
              type="submit"
              disabled={loading || showRedirectLoader}
              className={`w-[400px] h-[100px] bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] text-white font-bold rounded-full transition-all text-[36px] shadow-xl flex items-center justify-center gap-4 ${loading || showRedirectLoader ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                "LOG IN"
              )}
            </button>

            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading || showRedirectLoader}
                className="w-8 h-8 rounded accent-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-white text-[32px] font-medium cursor-pointer select-none">
                Remember me
              </label>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-20 flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/error.png" alt="info" className="w-12 h-12" />
              <p className="text-white text-[32px] font-bold">Forgotten Password?</p>
            </div>
            <p className="text-gray-400 text-[26px] leading-relaxed max-w-[700px]">
              If you forget your <span className="text-white">USERNAME</span> or <span className="text-white">PASSWORD</span> please contact your <span className="text-blue-400 font-bold underline">System Administrator</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;