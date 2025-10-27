import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client {
  id: string;
  name: string;
}

interface CostSheetRecord {
  id: string;
  item_number: number;
  date: string;
  item: string;
  supplier_name: string;
  qty: number;
  supplier_cost: number;
  misc_cost: number;
  total_cost: number;
  rea_margin: number;
  actual_quoted: number;
  approval_status: string;
  created_at: string;
}

const CostSheetRecords = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [records, setRecords] = useState<CostSheetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchRecords(selectedClient);
    } else {
      setRecords([]);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  const fetchRecords = async (clientId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        suppliers!cost_sheet_items_supplier_id_fkey(name),
        cost_sheets!inner(client_id)
      `)
      .eq("cost_sheets.client_id", clientId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecords(data.map(item => ({
        id: item.id,
        item_number: item.item_number,
        date: item.date,
        item: item.item,
        supplier_name: item.suppliers?.name || "N/A",
        qty: item.qty,
        supplier_cost: item.supplier_cost,
        misc_cost: item.misc_cost || 0,
        total_cost: item.total_cost,
        rea_margin: item.rea_margin,
        actual_quoted: item.actual_quoted,
        approval_status: item.approval_status,
        created_at: item.created_at,
      })));
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved_both":
        return <Badge className="bg-success/20 text-success-foreground">Approved</Badge>;
      case "approved_admin_a":
        return <Badge className="bg-warning/20 text-warning-foreground">Admin A Approved</Badge>;
      case "approved_admin_b":
        return <Badge className="bg-warning/20 text-warning-foreground">Admin B Approved</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalCost = records.reduce((sum, record) => sum + record.total_cost, 0);
  const totalQuoted = records.reduce((sum, record) => sum + record.actual_quoted, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">📊 Cost Sheet Records</CardTitle>
            <CardDescription>View all cost sheet records by client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Select Client:</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{records.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">AED {totalCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Quoted</p>
                    <p className="text-2xl font-bold">AED {totalQuoted.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedClient && (
          <Card>
            <CardHeader>
              <CardTitle>Cost Sheet Items</CardTitle>
              <CardDescription>
                All cost sheet items for the selected client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : records.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No cost sheet items found for this client</p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Item Description</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Supplier Cost</TableHead>
                        <TableHead>Misc Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>REA Margin</TableHead>
                        <TableHead>Actual Quoted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.item_number}</TableCell>
                          <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="max-w-[300px] whitespace-normal">{record.item}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>{record.qty}</TableCell>
                          <TableCell>AED {record.supplier_cost.toLocaleString()}</TableCell>
                          <TableCell>AED {record.misc_cost.toLocaleString()}</TableCell>
                          <TableCell>AED {record.total_cost.toLocaleString()}</TableCell>
                          <TableCell>AED {record.rea_margin.toLocaleString()}</TableCell>
                          <TableCell className="font-bold">AED {record.actual_quoted.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(record.approval_status)}</TableCell>
                          <TableCell>{format(new Date(record.created_at), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CostSheetRecords;
