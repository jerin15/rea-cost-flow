import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SupplierRecord {
  id: string;
  item_number: number;
  date: string;
  item_description: string;
  client_name: string;
  supplier_name: string;
  qty: number;
  unit_cost: number;
  misc_unit_cost: number;
  supplier_unit_cost: number;
  total_cost: number;
  markup_percentage: number;
  markup_amount: number;
  quoted_price: number;
  client_unit_cost: number;
  margin_percentage: number;
  approval_status: string;
  created_at: string;
}

const CostSheetRecords = () => {
  const [records, setRecords] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);

    // Fetch product suppliers (not misc) with their item and client info
    const { data, error } = await supabase
      .from("cost_sheet_item_suppliers")
      .select(`
        *,
        suppliers(name),
        cost_sheet_items!inner(
          item_number, date, item, approval_status, created_at,
          cost_sheets!inner(client_id, clients(name))
        )
      `)
      .eq("supplier_type", "product")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching records:", error);
      setLoading(false);
      return;
    }

    if (!data) {
      setLoading(false);
      return;
    }

    // For each product supplier, fetch its misc suppliers
    const productIds = data.map(d => d.id);
    let miscData: any[] = [];
    if (productIds.length > 0) {
      const { data: misc } = await supabase
        .from("cost_sheet_item_suppliers")
        .select("*, suppliers(name)")
        .in("parent_supplier_id", productIds);
      miscData = misc || [];
    }

    const mapped: SupplierRecord[] = data.map(row => {
      // cost_sheet_items is a one-to-one via inner join, but handle array case
      const rawItem = row.cost_sheet_items as any;
      const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
      if (!item) return null;

      const rawSheet = item.cost_sheets;
      const sheet = Array.isArray(rawSheet) ? rawSheet[0] : rawSheet;

      const qty = Number(row.qty) || 1;
      const productUnitCost = Number(row.unit_cost) || 0;

      // Sum misc unit costs for this product supplier
      const relatedMisc = miscData.filter(m => m.parent_supplier_id === row.id);
      const miscUnitCost = relatedMisc.reduce((sum: number, m: any) => sum + (Number(m.unit_cost) || 0), 0);

      const supplierUnitCost = productUnitCost + miscUnitCost;
      const totalCost = supplierUnitCost * qty;
      const quotedPrice = Number(row.quoted_price) || 0;
      const markupPercentage = Number(row.markup_percentage) || 0;
      const markupAmount = quotedPrice - totalCost;
      const clientUnitCost = qty > 0 ? quotedPrice / qty : 0;
      const marginPercentage = quotedPrice > 0 ? ((quotedPrice - totalCost) / quotedPrice) * 100 : 0;

      return {
        id: row.id,
        item_number: item.item_number ?? 0,
        date: item.date || new Date().toISOString(),
        item_description: item.item || "",
        client_name: sheet?.clients?.name || "N/A",
        supplier_name: row.suppliers?.name || "N/A",
        qty,
        unit_cost: productUnitCost,
        misc_unit_cost: miscUnitCost,
        supplier_unit_cost: supplierUnitCost,
        total_cost: totalCost,
        markup_percentage: markupPercentage,
        markup_amount: markupAmount,
        quoted_price: quotedPrice,
        client_unit_cost: clientUnitCost,
        margin_percentage: marginPercentage,
        approval_status: row.approval_status || item.approval_status || "pending",
        created_at: item.created_at || row.created_at,
      };
    }).filter(Boolean) as SupplierRecord[];

    setRecords(mapped);
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
  const totalQuoted = records.reduce((sum, r) => sum + r.quoted_price, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">📊 Cost Sheet Records</CardTitle>
            <CardDescription>All cost sheet records across all clients (per supplier)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">AED {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quoted</p>
                <p className="text-2xl font-bold">AED {totalQuoted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.item_number}</TableCell>
                          <TableCell className="font-medium">{record.client_name}</TableCell>
                          <TableCell className="whitespace-nowrap">{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="max-w-[300px]">{record.item_description}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>{record.qty}</TableCell>
                          <TableCell className="font-semibold text-muted-foreground">
                            AED {record.supplier_unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            AED {record.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            AED {record.client_unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {record.markup_percentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            AED {record.markup_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-bold text-success">
                            AED {record.quoted_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-semibold text-success">
                            {record.margin_percentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </TableCell>
                          <TableCell>{getStatusBadge(record.approval_status)}</TableCell>
                        </TableRow>
                      ))}
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
