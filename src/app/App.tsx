import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Controls } from "./pages/Controls";
import { History } from "./pages/History";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Admin } from "./pages/Admin";
import { Approvals } from "./pages/Approvals";
import { SensorProvider } from "./context/SensorContext";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { Home, Settings, BarChart3, Menu, X, LogOut } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { signOutUser } from "./services/auth";

function MobileConsoleShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed.";
      toast.error(message);
    } finally {
      navigate("/login");
    }
  };

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/dashboard" },
    { title: "Controls", icon: Settings, path: "/controls" },
    { title: "History", icon: BarChart3, path: "/history" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen w-full flex-col bg-white">
        <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-4 md:px-6 md:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1607194402064-d0742de6d17b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMGxlYWYlMjBwbGFudCUyMGxvZ298ZW58MXx8fHwxNzcyNjIzODU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="GreenPulse Logo"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
            />
            <h1 className="text-2xl font-bold text-white">GreenPulse</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="sm:hidden inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-2 text-white"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="hidden bg-white border-b border-gray-200 px-2 md:px-4 sm:grid grid-cols-3 gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center gap-1 px-2 py-3 md:py-3.5 border-b-2 transition-colors min-w-0 ${
                  isActive
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>

        {mobileNavOpen ? (
          <div className="sm:hidden border-b border-gray-200 bg-white px-3 py-2">
            <div className="grid grid-cols-1 gap-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={`mobile-${item.path}`}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 md:py-6"
          style={{ scrollbarGutter: "stable both-edges" }}
        >
          <div className="mx-auto w-full lg:max-w-5xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/approvals" element={<Approvals />} />
        <Route path="/" element={<MobileConsoleShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="controls" element={<Controls />} />
          <Route path="history" element={<History />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SensorProvider>
        <AppContent />
      </SensorProvider>
    </BrowserRouter>
  );
}
