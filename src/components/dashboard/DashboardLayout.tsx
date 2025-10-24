import { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home, CheckCircle } from "lucide-react";
import reaLogo from "@/assets/rea-logo.jpg";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={reaLogo} alt="REA" className="h-10 w-auto" />
              <div>
                <h1 className="text-lg font-bold text-primary">REA COST SHEET</h1>
                <p className="text-xs text-muted-foreground">
                  {userRole === "estimator" ? "Estimator Dashboard" : "Admin Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 pb-3">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              onClick={() => navigate("/")}
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Cost Sheets
            </Button>
            <Button
              variant={location.pathname === "/approved-cost-sheets" ? "default" : "ghost"}
              onClick={() => navigate("/approved-cost-sheets")}
              size="sm"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approved Cost Sheets
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
};
