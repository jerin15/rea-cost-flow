import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ApprovedCostSheet {
  id: string;
  client_id: string;
  client_name: string;
  created_at: string;
  submitted_at: string;
  total_items: number;
  total_cost: number;
}

interface CostSheetDetail {
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
}

const ApprovedCostSheets = () => {
  const [costSheets, setCostSheets] = useState<ApprovedCostSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetDetails, setSheetDetails] = useState<CostSheetDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedCostSheets();

    // Real-time subscription for new approvals
    const channel = supabase
      .channel('approved-items-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cost_sheet_items',
        },
        (payload) => {
          const newItem = payload.new as any;
          if (newItem.approval_status === 'approved_both') {
            // Refresh the list when new items are approved
            fetchApprovedCostSheets();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      fetchCostSheetDetails(selectedSheet);
    }
  }, [selectedSheet]);

  const fetchApprovedCostSheets = async () => {
    setLoading(true);
    
    // Get all approved items grouped by client
    const { data: approvedItems, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        id,
        date,
        item,
        supplier_id,
        qty,
        supplier_cost,
        misc_cost,
        total_cost,
        rea_margin,
        actual_quoted,
        item_number,
        cost_sheet_id,
        cost_sheets!inner(
          id,
          client_id,
          submitted_at,
          clients!inner(name)
        ),
        suppliers(name)
      `)
      .eq("approval_status", "approved_both")
      .order("date", { ascending: false });

    console.log("Approved items query result:", { data: approvedItems, error });

    if (error) {
      console.error("Error fetching approved cost sheets:", error);
      setLoading(false);
      return;
    }

    if (approvedItems && approvedItems.length > 0) {
      // Group items by client
      const groupedByClient = approvedItems.reduce((acc, item: any) => {
        const clientId = item.cost_sheets.client_id;
        const clientName = item.cost_sheets.clients.name;
        
        if (!acc[clientId]) {
          acc[clientId] = {
            id: clientId,
            client_id: clientId,
            client_name: clientName,
            created_at: item.cost_sheets.submitted_at || new Date().toISOString(),
            submitted_at: item.cost_sheets.submitted_at || new Date().toISOString(),
            total_items: 0,
            total_cost: 0,
          };
        }
        
        acc[clientId].total_items += 1;
        acc[clientId].total_cost += Number(item.total_cost);
        
        return acc;
      }, {} as Record<string, ApprovedCostSheet>);

      setCostSheets(Object.values(groupedByClient));
    } else {
      setCostSheets([]);
    }
    
    setLoading(false);
  };

  const fetchCostSheetDetails = async (clientId: string) => {
    const { data, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        suppliers(name),
        cost_sheets!inner(client_id)
      `)
      .eq("cost_sheets.client_id", clientId)
      .eq("approval_status", "approved_both")
      .order("item_number");

    if (!error && data) {
      setSheetDetails(data.map(item => ({
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
      })));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">✅ Approved Cost Sheets</CardTitle>
            <CardDescription>View all approved cost sheets and their details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : costSheets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No approved cost sheets yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costSheets.map((sheet) => (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium">{sheet.client_name}</TableCell>
                      <TableCell>{format(new Date(sheet.submitted_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{sheet.total_items}</TableCell>
                      <TableCell>₹{sheet.total_cost.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-success/20 text-success-foreground">Approved</Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setSelectedSheet(sheet.client_id)}
                          className="text-primary hover:underline"
                        >
                          View Details
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedSheet && sheetDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cost Sheet Details</CardTitle>
              <CardDescription>
                Detailed breakdown of items in this cost sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="font-semibold text-success">Approved Supplier</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Supplier Cost</TableHead>
                      <TableHead>Misc Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>REA Margin</TableHead>
                      <TableHead>Actual Quoted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetDetails.map((item) => (
                      <TableRow key={item.item_number}>
                        <TableCell>{item.item_number}</TableCell>
                        <TableCell>{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="max-w-[300px] whitespace-normal">{item.item}</TableCell>
                        <TableCell className="font-medium text-success">{item.supplier_name}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>₹{item.supplier_cost.toLocaleString()}</TableCell>
                        <TableCell>₹{item.misc_cost.toLocaleString()}</TableCell>
                        <TableCell>₹{item.total_cost.toLocaleString()}</TableCell>
                        <TableCell>₹{item.rea_margin.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">₹{item.actual_quoted.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApprovedCostSheets;
