import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CostSheetRecord {
  id: string;
  item_number: number;
  date: string;
  item: string;
  supplier_name: string;
  client_name: string;
  qty: number;
  supplier_cost: number;
  misc_cost: number;
  total_cost: number;
  rea_margin: number;
  rea_margin_percentage: number;
  actual_quoted: number;
  approval_status: string;
  created_at: string;
}

const CostSheetRecords = () => {
  const [records, setRecords] = useState<CostSheetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        suppliers!cost_sheet_items_supplier_id_fkey(name),
        cost_sheets!inner(client_id, clients(name))
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRecords(data.map(item => ({
        id: item.id,
        item_number: item.item_number,
        date: item.date,
        item: item.item,
        supplier_name: item.suppliers?.name || "N/A",
        client_name: (item.cost_sheets as any)?.clients?.name || "N/A",
        qty: item.qty,
        supplier_cost: item.supplier_cost,
        misc_cost: item.misc_cost || 0,
        total_cost: item.total_cost,
        rea_margin: item.rea_margin,
        rea_margin_percentage: item.rea_margin_percentage || 0,
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

  const totalCost = records.reduce((sum, r) => sum + r.total_cost, 0);
  const totalQuoted = records.reduce((sum, r) => sum + r.actual_quoted, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">📊 Cost Sheet Records</CardTitle>
            <CardDescription>All cost sheet records across all clients</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Cost Sheet Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No cost sheet items found</p>
            ) : (
              <ScrollArea className="h-[600px] w-full">
                <div className="min-w-[1500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead className="w-40">Client</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="w-40">Supplier</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Supplier Unit Cost</TableHead>
                        <TableHead className="w-32">Total Cost</TableHead>
                        <TableHead className="w-32">Client Unit Cost</TableHead>
                        <TableHead className="w-24">Markup %</TableHead>
                        <TableHead className="w-32">Markup (AED)</TableHead>
                        <TableHead className="w-32">Quoted Price</TableHead>
                        <TableHead className="w-24">Margin %</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-32">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => {
                        const supplierUnitCost = record.qty > 0 ? record.supplier_cost / record.qty : 0;
                        const clientUnitCost = record.qty > 0 ? record.actual_quoted / record.qty : 0;
                        const marginPercentage = record.actual_quoted > 0
                          ? ((record.actual_quoted - record.total_cost) / record.actual_quoted) * 100
                          : 0;

                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.item_number}</TableCell>
                            <TableCell className="font-medium">{record.client_name}</TableCell>
                            <TableCell className="whitespace-nowrap">{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="max-w-[300px]">{record.item}</TableCell>
                            <TableCell>{record.supplier_name}</TableCell>
                            <TableCell>{record.qty}</TableCell>
                            <TableCell className="font-semibold text-muted-foreground">
                              AED {supplierUnitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold">
                              AED {record.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              AED {clientUnitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {record.rea_margin_percentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              AED {record.rea_margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-bold text-success">
                              AED {record.actual_quoted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold text-success">
                              {marginPercentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </TableCell>
                            <TableCell>{getStatusBadge(record.approval_status)}</TableCell>
                            <TableCell className="whitespace-nowrap">{format(new Date(record.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CostSheetRecords;
