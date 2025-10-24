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
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      fetchCostSheetDetails(selectedSheet);
    }
  }, [selectedSheet]);

  const fetchApprovedCostSheets = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("cost_sheets")
      .select(`
        id,
        client_id,
        created_at,
        submitted_at,
        clients!inner(name)
      `)
      .eq("status", "approved")
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      const sheetsWithDetails = await Promise.all(
        data.map(async (sheet) => {
          const { data: items } = await supabase
            .from("cost_sheet_items")
            .select("total_cost")
            .eq("cost_sheet_id", sheet.id);

          const totalCost = items?.reduce((sum, item) => sum + Number(item.total_cost), 0) || 0;
          
          return {
            id: sheet.id,
            client_id: sheet.client_id,
            client_name: sheet.clients.name,
            created_at: sheet.created_at,
            submitted_at: sheet.submitted_at,
            total_items: items?.length || 0,
            total_cost: totalCost,
          };
        })
      );

      setCostSheets(sheetsWithDetails);
    }
    
    setLoading(false);
  };

  const fetchCostSheetDetails = async (sheetId: string) => {
    const { data, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        suppliers(name)
      `)
      .eq("cost_sheet_id", sheetId)
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
                          onClick={() => setSelectedSheet(sheet.id)}
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
                      <TableHead>Supplier</TableHead>
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
                        <TableCell>{item.supplier_name}</TableCell>
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
