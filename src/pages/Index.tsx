import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ClientSelector } from "@/components/dashboard/ClientSelector";
import { CostSheetTable } from "@/components/cost-sheet/CostSheetTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Management</CardTitle>
            <CardDescription>Select a client to view and manage their cost sheets</CardDescription>
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
              <CostSheetTable clientId={selectedClient} />
            </CardContent>
          </Card>
        )}

        {!selectedClient && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>Please select a client to view their cost sheets</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
