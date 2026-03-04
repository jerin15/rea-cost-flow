import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ClientMasterList } from "@/components/dashboard/ClientMasterList";
import { SupplierMasterList } from "@/components/dashboard/SupplierMasterList";
import { CostSheetTable } from "@/components/cost-sheet/CostSheetTable";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { SubmittedSheetsWidget } from "@/components/dashboard/SubmittedSheetsWidget";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { userRole } = useAuth();

  const handleClientSelect = (clientId: string) => {
    if (clientId === selectedClient) return;
    setSelectedClient(clientId || null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Role-specific widgets */}
        {userRole === 'admin' && <PendingApprovalsWidget />}
        {userRole === 'estimator' && <SubmittedSheetsWidget />}

        {/* Master Lists side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClientMasterList
            onClientSelect={handleClientSelect}
            selectedClient={selectedClient}
          />
          <SupplierMasterList />
        </div>

        {/* Cost Sheet for selected client */}
        {selectedClient && (
          <Card>
            <CardContent className="pt-6">
              <CostSheetTable key={refreshKey} clientId={selectedClient} />
            </CardContent>
          </Card>
        )}

        {!selectedClient && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>Select a client from the list above to view or create their cost sheets</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
