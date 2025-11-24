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
  qty: number;
  suppliers: {
    name: string;
    type: string;
    unit_cost: number;
    qty: number;
    quoted_price: number;
    markup_percentage: number;
    description?: string;
    approval_status: string;
  }[];
  total_cost: number;
  rea_margin: number;
  rea_margin_percentage: number;
  actual_quoted: number;
  admin_remarks: string | null;
}

const ApprovedCostSheets = () => {
  const [costSheets, setCostSheets] = useState<ApprovedCostSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetDetails, setSheetDetails] = useState<CostSheetDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovedCostSheets();

    // Real-time subscription for new approvals (supplier level)
    const channel = supabase
      .channel('approved-suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cost_sheet_item_suppliers',
        },
        (payload) => {
          const newSupplier = payload.new as any;
          if (newSupplier.approval_status === 'approved') {
            // Refresh the list when new suppliers are approved
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
    
    // Get all items with at least one approved supplier
    const { data: approvedSuppliers, error } = await supabase
      .from("cost_sheet_item_suppliers")
      .select(`
        id,
        cost_sheet_item_id,
        approval_status,
        cost_sheet_items!inner(
          id,
          date,
          item,
          item_number,
          cost_sheet_id,
          cost_sheets!inner(
            id,
            client_id,
            submitted_at,
            clients!inner(name)
          )
        )
      `)
      .eq("approval_status", "approved");

    console.log("Approved suppliers query result:", { data: approvedSuppliers, error });

    if (error) {
      console.error("Error fetching approved cost sheets:", error);
      setLoading(false);
      return;
    }

    if (approvedSuppliers && approvedSuppliers.length > 0) {
      // Group by client
      const groupedByClient = approvedSuppliers.reduce((acc, supplier: any) => {
        const clientId = supplier.cost_sheet_items.cost_sheets.client_id;
        const clientName = supplier.cost_sheet_items.cost_sheets.clients.name;
        
        if (!acc[clientId]) {
          acc[clientId] = {
            id: clientId,
            client_id: clientId,
            client_name: clientName,
            created_at: supplier.cost_sheet_items.cost_sheets.submitted_at || new Date().toISOString(),
            submitted_at: supplier.cost_sheet_items.cost_sheets.submitted_at || new Date().toISOString(),
            total_items: new Set(),
            total_cost: 0,
          };
        }
        
        // Track unique items
        acc[clientId].total_items.add(supplier.cost_sheet_item_id);
        
        return acc;
      }, {} as Record<string, any>);

      // Convert sets to counts
      const costSheetsArray = Object.values(groupedByClient).map((sheet: any) => ({
        ...sheet,
        total_items: sheet.total_items.size,
      }));

      setCostSheets(costSheetsArray);
    } else {
      setCostSheets([]);
    }
    
    setLoading(false);
  };

  const fetchCostSheetDetails = async (clientId: string) => {
    // Fetch cost sheet items
    const { data: items, error: itemsError } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        cost_sheets!inner(client_id)
      `)
      .eq("cost_sheets.client_id", clientId)
      .order("item_number");

    if (itemsError || !items) {
      console.error("Error fetching items:", itemsError);
      return;
    }

    // Fetch all supplier options for these items (both approved and rejected)
    const itemIds = items.map(item => item.id);
    const { data: supplierOptions, error: supplierError } = await supabase
      .from("cost_sheet_item_suppliers")
      .select(`
        *,
        suppliers(name)
      `)
      .in("cost_sheet_item_id", itemIds);

    if (supplierError) {
      console.error("Error fetching supplier options:", supplierError);
    }

    // Map items with their suppliers (approved and rejected)
    const detailsWithSuppliers = items.map((item: any) => {
      const itemSuppliers = supplierOptions?.filter(s => s.cost_sheet_item_id === item.id) || [];
      
      return {
        item_number: item.item_number,
        date: item.date,
        item: item.item,
        qty: item.qty,
        suppliers: itemSuppliers.map(s => ({
          name: s.suppliers?.name || "Unknown",
          type: s.supplier_type,
          unit_cost: s.unit_cost,
          qty: s.qty,
          quoted_price: s.quoted_price || 0,
          markup_percentage: s.markup_percentage || 0,
          description: s.description,
          approval_status: s.approval_status || 'pending',
        })),
        total_cost: item.total_cost,
        rea_margin: item.rea_margin,
        rea_margin_percentage: item.rea_margin_percentage || 0,
        actual_quoted: item.actual_quoted,
        admin_remarks: item.admin_remarks || null,
      };
    });

    // Filter to only show items that have at least one approved supplier
    const itemsWithApprovedSuppliers = detailsWithSuppliers.filter(
      item => item.suppliers.some(s => s.approval_status === 'approved')
    );

    setSheetDetails(itemsWithApprovedSuppliers);
  };

  const handleDeleteCostSheet = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to reset all supplier approvals for ${clientName}?`)) {
      return;
    }

    // Get all cost sheet IDs for this client
    const { data: costSheetData } = await supabase
      .from("cost_sheets")
      .select("id")
      .eq("client_id", clientId);

    if (!costSheetData || costSheetData.length === 0) {
      toast({
        title: "Info",
        description: "No cost sheets found",
      });
      return;
    }

    const costSheetIds = costSheetData.map(cs => cs.id);

    // Get all item IDs from these cost sheets
    const { data: itemsData } = await supabase
      .from("cost_sheet_items")
      .select("id")
      .in("cost_sheet_id", costSheetIds);

    if (!itemsData || itemsData.length === 0) {
      toast({
        title: "Info",
        description: "No items found",
      });
      return;
    }

    const itemIds = itemsData.map(item => item.id);

    // Reset all supplier approvals to pending
    const { error } = await supabase
      .from("cost_sheet_item_suppliers")
      .update({ 
        approval_status: 'pending',
        approved_by: null,
        approved_at: null
      })
      .in("cost_sheet_item_id", itemIds);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reset approvals",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "All supplier approvals have been reset",
      });
      fetchApprovedCostSheets();
      setSelectedSheet(null);
    }
  };

  const downloadCSV = (clientName: string) => {
    if (sheetDetails.length === 0) return;

    const headers = ["#", "Date", "Item", "Suppliers", "Total Qty", "Total Cost", "Total Quoted", "REA Margin", "REA Margin %", "Admin Remarks"];
    const rows = sheetDetails.map(item => {
      const supplierNames = item.suppliers.map(s => `${s.name} (${s.type})`).join("; ");
      
      return [
        item.item_number,
        format(new Date(item.date), "dd/MM/yyyy"),
        item.item,
        supplierNames,
        item.qty,
        item.total_cost.toFixed(2),
        item.actual_quoted.toFixed(2),
        item.rea_margin.toFixed(2),
        item.rea_margin_percentage.toFixed(2),
        item.admin_remarks || "",
      ];
    });

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

    const doc = new jsPDF('landscape'); // Use landscape mode for more columns
    
    doc.setFontSize(18);
    doc.text(`Approved Cost Sheet - ${clientName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    const tableData = sheetDetails.map(item => {
      const supplierNames = item.suppliers.map(s => `${s.name} (${s.type})`).join(", ");
      
      return [
        item.item_number,
        format(new Date(item.date), "dd/MM/yyyy"),
        item.item,
        supplierNames,
        item.qty,
        `AED ${item.total_cost.toFixed(2)}`,
        `AED ${item.actual_quoted.toFixed(2)}`,
        `AED ${item.rea_margin.toFixed(2)}`,
        `${item.rea_margin_percentage.toFixed(2)}%`,
      ];
    });

    autoTable(doc, {
      head: [["#", "Date", "Item", "Suppliers", "Qty", "Total Cost", "Total Quoted", "REA Margin", "Margin %"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 7 },
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
                            title="Reset all approvals for this client"
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
              <ScrollArea className="h-[600px] w-full">
                <div className="min-w-[1400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="min-w-[150px]">Suppliers</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Supplier Unit Cost</TableHead>
                        <TableHead className="w-32">Total Cost</TableHead>
                        <TableHead className="w-32">Client Unit Cost</TableHead>
                        <TableHead className="w-24">Markup %</TableHead>
                        <TableHead className="w-32">Markup (AED)</TableHead>
                        <TableHead className="w-32">Quoted Price</TableHead>
                        <TableHead className="w-24">Margin %</TableHead>
                        <TableHead className="min-w-[200px]">Admin Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetDetails.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.item_number}</TableCell>
                          <TableCell className="whitespace-nowrap">{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <div className="max-w-md">{item.item}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.suppliers.map((s, idx) => (
                                <div key={idx} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{s.name}</span>
                                    <span className="text-muted-foreground">({s.type})</span>
                                    {s.approval_status === 'approved' && (
                                      <Badge className="bg-success text-xs">✓ Approved</Badge>
                                    )}
                                    {s.approval_status === 'rejected' && (
                                      <Badge variant="destructive" className="text-xs">✗ Rejected</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs block">
                                    {s.qty} × AED {s.unit_cost.toFixed(2)} = AED {(s.qty * s.unit_cost).toFixed(2)}
                                    {s.markup_percentage > 0 && ` | Markup: ${s.markup_percentage.toFixed(1)}%`}
                                    {s.quoted_price > 0 && ` → AED ${s.quoted_price.toFixed(2)}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                            <TableCell>{item.qty}</TableCell>
                            <TableCell>AED {item.total_cost.toFixed(2)}</TableCell>
                            <TableCell className="font-bold">AED {item.actual_quoted.toFixed(2)}</TableCell>
                            <TableCell>AED {item.rea_margin.toFixed(2)}</TableCell>
                            <TableCell>{item.rea_margin_percentage.toFixed(2)}%</TableCell>
                            <TableCell>
                              {item.admin_remarks && (
                                <div className="max-w-[200px] text-sm text-muted-foreground">
                                  {item.admin_remarks}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApprovedCostSheets;
