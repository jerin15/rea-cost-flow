import { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import reaLogo from "@/assets/rea-logo.jpg";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut, user, userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
};
