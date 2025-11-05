import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  misc_supplier_name: string | null;
  misc_type: string | null;
  misc_description: string | null;
  qty: number;
  supplier_cost: number;
  misc_cost: number;
  total_cost: number;
  rea_margin: number;
  actual_quoted: number;
  admin_chosen_for_quotation: boolean;
  admin_chosen_supplier_name: string | null;
  admin_chosen_misc_supplier_name: string | null;
  admin_chosen_supplier_cost: number;
  admin_chosen_misc_cost: number;
  admin_chosen_total_cost: number;
  admin_chosen_rea_margin: number;
  admin_chosen_actual_quoted: number;
  admin_quotation_notes: string | null;
}

const ApprovedCostSheets = () => {
  const [costSheets, setCostSheets] = useState<ApprovedCostSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetDetails, setSheetDetails] = useState<CostSheetDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        suppliers!cost_sheet_items_supplier_id_fkey(name)
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
        suppliers!cost_sheet_items_supplier_id_fkey(name),
        misc_suppliers:suppliers!cost_sheet_items_misc_supplier_id_fkey(name),
        admin_chosen_suppliers:suppliers!cost_sheet_items_admin_chosen_supplier_id_fkey(name),
        admin_chosen_misc_suppliers:suppliers!cost_sheet_items_admin_chosen_misc_supplier_id_fkey(name),
        cost_sheets!inner(client_id)
      `)
      .eq("cost_sheets.client_id", clientId)
      .eq("approval_status", "approved_both")
      .order("item_number");

    if (!error && data) {
      setSheetDetails(data.map((item: any) => ({
        item_number: item.item_number,
        date: item.date,
        item: item.item,
        supplier_name: item.suppliers?.name || "N/A",
        misc_supplier_name: item.misc_suppliers?.name || null,
        misc_type: item.misc_type,
        misc_description: item.misc_description,
        qty: item.qty,
        supplier_cost: item.supplier_cost,
        misc_cost: item.misc_cost || 0,
        total_cost: item.total_cost,
        rea_margin: item.rea_margin,
        actual_quoted: item.actual_quoted,
        admin_chosen_for_quotation: item.admin_chosen_for_quotation || false,
        admin_chosen_supplier_name: item.admin_chosen_suppliers?.name || null,
        admin_chosen_misc_supplier_name: item.admin_chosen_misc_suppliers?.name || null,
        admin_chosen_supplier_cost: item.admin_chosen_supplier_cost || 0,
        admin_chosen_misc_cost: item.admin_chosen_misc_cost || 0,
        admin_chosen_total_cost: item.admin_chosen_total_cost || 0,
        admin_chosen_rea_margin: item.admin_chosen_rea_margin || 0,
        admin_chosen_actual_quoted: item.admin_chosen_actual_quoted || 0,
        admin_quotation_notes: item.admin_quotation_notes,
      })));
    }
  };

  const handleDeleteCostSheet = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete all approved cost sheets for ${clientName}?`)) {
      return;
    }

    // First get all cost sheet IDs for this client
    const { data: costSheetData } = await supabase
      .from("cost_sheets")
      .select("id")
      .eq("client_id", clientId);

    if (!costSheetData || costSheetData.length === 0) {
      toast({
        title: "Info",
        description: "No cost sheets found to delete",
      });
      return;
    }

    const costSheetIds = costSheetData.map(cs => cs.id);

    // Delete all approved items for these cost sheets
    const { error } = await supabase
      .from("cost_sheet_items")
      .delete()
      .eq("approval_status", "approved_both")
      .in("cost_sheet_id", costSheetIds);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete cost sheets",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Cost sheets deleted successfully",
      });
      fetchApprovedCostSheets();
      setSelectedSheet(null);
    }
  };

  const downloadCSV = (clientName: string) => {
    if (sheetDetails.length === 0) return;

    const headers = ["#", "Date", "Item", "Supplier", "Qty", "Supplier Cost (AED)", "Misc Cost (AED)", "Total Cost (AED)", "REA Margin (AED)", "Actual Quoted (AED)"];
    const rows = sheetDetails.map(item => [
      item.item_number,
      format(new Date(item.date), "dd/MM/yyyy"),
      item.item,
      item.supplier_name,
      item.qty,
      item.supplier_cost,
      item.misc_cost,
      item.total_cost,
      item.rea_margin,
      item.actual_quoted,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName}_approved_cost_sheet_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "CSV downloaded successfully",
    });
  };

  const downloadPDF = (clientName: string) => {
    if (sheetDetails.length === 0) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Approved Cost Sheet - ${clientName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    const tableData = sheetDetails.map(item => [
      item.item_number,
      format(new Date(item.date), "dd/MM/yyyy"),
      item.item,
      item.supplier_name,
      item.qty,
      `AED ${item.supplier_cost.toLocaleString()}`,
      `AED ${item.misc_cost.toLocaleString()}`,
      `AED ${item.total_cost.toLocaleString()}`,
      `AED ${item.rea_margin.toLocaleString()}`,
      `AED ${item.actual_quoted.toLocaleString()}`,
    ]);

    autoTable(doc, {
      head: [["#", "Date", "Item", "Supplier", "Qty", "Supplier Cost", "Misc Cost", "Total Cost", "REA Margin", "Actual Quoted"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${clientName}_approved_cost_sheet_${format(new Date(), "yyyy-MM-dd")}.pdf`);

    toast({
      title: "Success",
      description: "PDF downloaded successfully",
    });
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
                      <TableCell>AED {sheet.total_cost.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-success/20 text-success-foreground">Approved</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSheet(sheet.client_id)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCostSheet(sheet.client_id, sheet.client_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cost Sheet Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of items in this cost sheet
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const sheet = costSheets.find(s => s.client_id === selectedSheet);
                      if (sheet) downloadCSV(sheet.client_name);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const sheet = costSheets.find(s => s.client_id === selectedSheet);
                      if (sheet) downloadPDF(sheet.client_name);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetDetails.map((item) => (
                      <TableRow key={item.item_number} className="align-top">
                        <TableCell className="font-medium">{item.item_number}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="font-medium mb-2">{item.item}</p>
                          {item.misc_description && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <span className="font-medium">Misc Details:</span>
                              <p className="text-muted-foreground mt-1">{item.misc_description}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[600px]">
                          {item.admin_chosen_for_quotation ? (
                            <div className="space-y-3 p-4 bg-success/5 rounded-lg border border-success/20">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-success text-lg">✓</span>
                                <h4 className="font-semibold text-success">Admin's Approved Quotation Configuration</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-background rounded border">
                                  <span className="text-xs text-muted-foreground block mb-1">Product Supplier</span>
                                  <p className="font-semibold">{item.admin_chosen_supplier_name || item.supplier_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">Qty:</span>
                                    <span className="font-medium">{item.qty}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Cost:</span>
                                    <span className="font-bold text-primary">AED {(item.admin_chosen_supplier_cost || item.supplier_cost).toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="p-3 bg-background rounded border">
                                  <span className="text-xs text-muted-foreground block mb-1">Misc Supplier</span>
                                  <p className="font-semibold">{item.admin_chosen_misc_supplier_name || item.misc_supplier_name || "None"}</p>
                                  {item.misc_type && (
                                    <div className="text-xs text-muted-foreground mt-1">Type: {item.misc_type}</div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">Cost:</span>
                                    <span className="font-bold text-primary">AED {(item.admin_chosen_misc_cost || item.misc_cost).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                                <div className="p-3 bg-background rounded">
                                  <span className="text-xs text-muted-foreground block mb-1">Total Cost</span>
                                  <p className="text-lg font-bold">AED {((item.admin_chosen_supplier_cost || item.supplier_cost) + (item.admin_chosen_misc_cost || item.misc_cost)).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-primary/10 rounded">
                                  <span className="text-xs text-muted-foreground block mb-1">REA Margin</span>
                                  <p className="text-lg font-bold text-primary">AED {(item.admin_chosen_rea_margin || item.rea_margin).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-success/20 rounded border border-success">
                                  <span className="text-xs text-muted-foreground block mb-1">Final Quoted Price</span>
                                  <p className="text-lg font-bold text-success">AED {(item.admin_chosen_actual_quoted || item.actual_quoted).toLocaleString()}</p>
                                </div>
                              </div>

                              {item.admin_quotation_notes && (
                                <div className="p-3 bg-warning/10 rounded border border-warning/30 mt-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-warning-foreground text-lg">📝</span>
                                    <div className="flex-1">
                                      <span className="text-sm font-semibold text-warning-foreground block">Admin's Instructions:</span>
                                      <p className="text-sm mt-1">{item.admin_quotation_notes}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground">Estimator's Supplier:</span>
                                  <p className="font-medium">{item.supplier_name}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Supplier Cost:</span>
                                  <p className="font-medium">AED {item.supplier_cost.toLocaleString()}</p>
                                </div>
                              </div>
                              {item.misc_supplier_name && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-muted-foreground">Misc Supplier:</span>
                                    <p className="font-medium">{item.misc_supplier_name}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Misc Cost:</span>
                                    <p className="font-medium">AED {item.misc_cost.toLocaleString()}</p>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                <div>
                                  <span className="text-muted-foreground">Total Cost:</span>
                                  <p className="font-bold">AED {item.total_cost.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">REA Margin:</span>
                                  <p className="font-bold">AED {item.rea_margin.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Quoted:</span>
                                  <p className="font-bold">AED {item.actual_quoted.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
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
