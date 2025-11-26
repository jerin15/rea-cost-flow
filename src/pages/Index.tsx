import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ClientSelector } from "@/components/dashboard/ClientSelector";
import { CostSheetTable } from "@/components/cost-sheet/CostSheetTable";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { SubmittedSheetsWidget } from "@/components/dashboard/SubmittedSheetsWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { userRole } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Show role-specific widgets */}
        {userRole === 'admin' && <PendingApprovalsWidget />}
        {userRole === 'estimator' && <SubmittedSheetsWidget />}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Client Management</CardTitle>
                <CardDescription>Select a client to create or manage their cost sheets</CardDescription>
              </div>
              {selectedClient && (
                <Button
                  onClick={() => {
                    setSelectedClient(null);
                    setTimeout(() => setSelectedClient(selectedClient), 100);
                    setRefreshKey(prev => prev + 1);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Cost Sheet
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ClientSelector
              selectedClient={selectedClient}
              onClientSelect={setSelectedClient}
            />
          </CardContent>
        </Card>

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
              <p>Please select a client to view or create their cost sheets</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
