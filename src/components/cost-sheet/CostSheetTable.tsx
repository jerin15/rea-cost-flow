import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { format } from "date-fns";

interface Supplier {
  id: string;
  name: string;
}

type ApprovalStatus = "pending" | "approved_admin_a" | "approved_admin_b" | "approved_both" | "rejected";

interface CostSheetItem {
  id?: string;
  item_number: number;
  date: string;
  item: string;
  supplier_id: string | null;
  misc_supplier_id: string | null;
  qty: number;
  supplier_cost: number;
  misc_cost: number;
  misc_qty: number;
  misc_cost_type: string;
  total_cost: number;
  rea_margin_percentage: number;
  rea_margin: number;
  actual_quoted: number;
  approval_status: ApprovalStatus;
  admin_remarks: string;
}

interface CostSheetTableProps {
  clientId: string;
}

export const CostSheetTable = ({ clientId }: CostSheetTableProps) => {
  const { userRole } = useAuth();
  const [items, setItems] = useState<CostSheetItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [costSheetId, setCostSheetId] = useState<string | null>(null);
  const [costSheetStatus, setCostSheetStatus] = useState<string>("draft");

  useEffect(() => {
    if (clientId) {
      fetchSuppliers();
      fetchCostSheetItems();
    }
  }, [clientId]);

  // Real-time subscription for item approvals
  useEffect(() => {
    if (!costSheetId || userRole !== "estimator") return;

    const channel = supabase
      .channel('cost-sheet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cost_sheet_items',
          filter: `cost_sheet_id=eq.${costSheetId}`
        },
        async (payload) => {
          const newItem = payload.new as any;
          
          // Check if an item was just approved
          if (newItem.approval_status === 'approved_both') {
            // Fetch supplier name
            const { data: supplierData } = await supabase
              .from('suppliers')
              .select('name')
              .eq('id', newItem.supplier_id)
              .maybeSingle();

            const { data: clientData } = await supabase
              .from('clients')
              .select('name')
              .eq('id', clientId)
              .maybeSingle();

            // Play notification sound
            const playSound = async () => {
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 880;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.4);
              } catch (e) {
                console.log('Audio play failed:', e);
              }
            };
            
            playSound();

            // Show toast notification
            toast.success(
              `✅ Item Approved!`,
              {
                description: `Supplier: ${supplierData?.name || 'Unknown'} | Price: AED ${newItem.actual_quoted.toLocaleString()} | Client: ${clientData?.name || 'Unknown'}`,
                duration: 8000,
              }
            );

            // Refresh the items list
            fetchCostSheetItems();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [costSheetId, userRole, clientId]);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("client_id", clientId)
      .order("name");

    if (!error && data) {
      setSuppliers(data);
    }
  };

  const fetchCostSheetItems = async () => {
    try {
      const { data, error } = await supabase
        .from("cost_sheet_items")
        .select(`
          *,
          cost_sheets!inner(client_id, id, status)
        `)
        .eq("cost_sheets.client_id", clientId)
        .neq("approval_status", "approved_both")
        .order("item_number");

      console.log("Fetched cost sheet items:", { data, error });

      if (error) {
        console.error("Error fetching cost sheet items:", error);
        setItems([]);
        setCostSheetId(null);
        setCostSheetStatus("draft");
        return;
      }

      if (data && data.length > 0) {
        // Ensure misc_qty has a default value for existing records
        const itemsWithDefaults = data.map(item => ({
          ...item,
          misc_qty: item.misc_qty ?? 1,
          misc_cost: item.misc_cost ?? 0,
        }));
        setItems(itemsWithDefaults);
        setCostSheetId(data[0].cost_sheet_id);
        
        // Get cost sheet status - use maybeSingle to avoid errors
        const { data: sheetData, error: sheetError } = await supabase
          .from("cost_sheets")
          .select("status")
          .eq("id", data[0].cost_sheet_id)
          .maybeSingle();
        
        if (!sheetError && sheetData) {
          setCostSheetStatus(sheetData.status);
        } else {
          setCostSheetStatus("draft");
        }
      } else {
        // No existing cost sheet, start fresh
        setItems([]);
        setCostSheetId(null);
        setCostSheetStatus("draft");
      }
    } catch (err) {
      console.error("Unexpected error in fetchCostSheetItems:", err);
      setItems([]);
      setCostSheetId(null);
      setCostSheetStatus("draft");
    }
  };

  const addNewSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Supplier name cannot be empty");
      return;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert([{ name: newSupplierName.trim(), client_id: clientId }])
      .select()
      .single();

    if (error) {
      toast.error("Failed to add supplier");
      return;
    }

    setSuppliers([...suppliers, data]);
    setNewSupplierName("");
    setSupplierDialogOpen(false);
    toast.success("Supplier added successfully");
  };

  const addNewRow = () => {
    const newItem: CostSheetItem = {
      item_number: items.length + 1,
      date: format(new Date(), "yyyy-MM-dd"),
      item: "",
      supplier_id: null,
      misc_supplier_id: null,
      qty: 1,
      supplier_cost: 0,
      misc_cost: 0,
      misc_qty: 1,
      misc_cost_type: "",
      total_cost: 0,
      rea_margin_percentage: 0,
      rea_margin: 0,
      actual_quoted: 0,
      approval_status: "pending",
      admin_remarks: "",
    };
    setItems([...items, newItem]);
  };

  const calculateTotals = (item: CostSheetItem) => {
    // Calculate total cost: (supplier_cost × qty) + (misc_cost × misc_qty)
    const supplierTotal = (Number(item.supplier_cost) || 0) * (Number(item.qty) || 1);
    const miscTotal = item.misc_supplier_id 
      ? (Number(item.misc_cost) || 0) * (Number(item.misc_qty) || 1) 
      : 0;
    const totalCost = supplierTotal + miscTotal;
    
    // Markup % is entered by user
    const markupPercentage = Number(item.rea_margin_percentage) || 0;
    
    // Markup Amount = Total Cost × (Markup% / 100)
    const markupAmount = (totalCost * markupPercentage) / 100;
    
    // Actual Quoted = Total Cost + Markup Amount
    const actualQuoted = totalCost + markupAmount;
    
    // Gross Margin % = Markup% / (1 + Markup%/100)
    const grossMarginPercentage = markupPercentage > 0 
      ? (markupPercentage / (1 + markupPercentage / 100)) 
      : 0;
    
    return { 
      totalCost, 
      reaMargin: markupAmount, 
      actualQuoted, 
      grossMarginPercentage 
    };
  };

  const updateItem = (index: number, field: keyof CostSheetItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate whenever cost-related fields change
    const { totalCost, reaMargin, actualQuoted } = calculateTotals(updatedItems[index]);
    updatedItems[index].total_cost = totalCost;
    updatedItems[index].rea_margin = reaMargin;
    updatedItems[index].actual_quoted = actualQuoted;
    
    setItems(updatedItems);
  };

  const deleteItem = async (index: number) => {
    const item = items[index];
    
    if (item.id) {
      // Delete from database
      const { error } = await supabase
        .from("cost_sheet_items")
        .delete()
        .eq("id", item.id);
      
      if (error) {
        toast.error("Failed to delete item");
        return;
      }
      toast.success("Item deleted successfully");
    }
    
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const deleteSupplier = async (supplierId: string) => {
    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplierId);
    
    if (error) {
      toast.error("Failed to delete supplier");
      return;
    }
    
    toast.success("Supplier deleted successfully");
    fetchSuppliers();
  };

  const deleteCostSheet = async () => {
    if (!costSheetId) {
      toast.error("No cost sheet to delete");
      return;
    }
    
    setLoading(true);
    
    // Delete cost sheet items first
    const { error: itemsError } = await supabase
      .from("cost_sheet_items")
      .delete()
      .eq("cost_sheet_id", costSheetId);
    
    if (itemsError) {
      toast.error("Failed to delete cost sheet items");
      setLoading(false);
      return;
    }
    
    // Delete cost sheet
    const { error: sheetError } = await supabase
      .from("cost_sheets")
      .delete()
      .eq("id", costSheetId);
    
    if (sheetError) {
      toast.error("Failed to delete cost sheet");
      setLoading(false);
      return;
    }
    
    toast.success("Cost sheet deleted successfully");
    setLoading(false);
    setItems([]);
    setCostSheetId(null);
    setCostSheetStatus("draft");
  };

  const saveCostSheet = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setLoading(true);

    let sheetId = costSheetId;

    // Create cost sheet only if it doesn't exist
    if (!sheetId) {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: costSheet, error: sheetError } = await supabase
        .from("cost_sheets")
        .insert([{
          client_id: clientId,
          created_by: userData.user?.id,
          status: "draft"
        }])
        .select()
        .single();

      if (sheetError) {
        toast.error("Failed to create cost sheet");
        setLoading(false);
        return;
      }

      sheetId = costSheet.id;
      setCostSheetId(sheetId);
    }

    // Separate items with IDs (existing) from new items (no ID)
    const existingItems = items.filter(item => item.id);
    const newItems = items.filter(item => !item.id);

    // Update existing items
    if (existingItems.length > 0) {
      for (const item of existingItems) {
        const { error } = await supabase
          .from("cost_sheet_items")
          .update({
            date: item.date,
            item: item.item,
            supplier_id: item.supplier_id,
            misc_supplier_id: item.misc_supplier_id,
            qty: item.qty,
            supplier_cost: item.supplier_cost,
            misc_cost: item.misc_cost,
            misc_qty: item.misc_qty,
            misc_cost_type: item.misc_cost_type,
            total_cost: item.total_cost,
            rea_margin_percentage: item.rea_margin_percentage,
            rea_margin: item.rea_margin,
            actual_quoted: item.actual_quoted,
          })
          .eq("id", item.id);

        if (error) {
          console.error("Failed to update item:", error);
        }
      }
    }

    // Insert new items
    if (newItems.length > 0) {
      const itemsToInsert = newItems.map(item => ({
        ...item,
        cost_sheet_id: sheetId,
      }));

      const { error: itemsError } = await supabase
        .from("cost_sheet_items")
        .insert(itemsToInsert);

      if (itemsError) {
        toast.error("Failed to save new items");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast.success("Cost sheet saved successfully");
    fetchCostSheetItems();
  };

  const submitForApproval = async () => {
    if (!costSheetId) {
      toast.error("Please save the cost sheet first");
      return;
    }

    setLoading(true);

    // Update cost sheet status
    const { error: updateError } = await supabase
      .from("cost_sheets")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", costSheetId);

    if (updateError) {
      toast.error("Failed to submit cost sheet");
      setLoading(false);
      return;
    }

    // Get admin users
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id, email")
      .eq("role", "admin");

    // Get client name
    const { data: clientData } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();

    // Create notifications for admins
    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        title: "📋 New Cost Sheet Awaiting Approval",
        message: `A new cost sheet for ${clientData?.name || "client"} has been submitted and requires your approval.`,
        type: "approval_request",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    setLoading(false);
    setCostSheetStatus("submitted");
    toast.success("Cost sheet submitted for approval!");
  };

  const approveItem = async (itemId: string) => {
    setLoading(true);

    // Get item details before approval
    const { data: itemData } = await supabase
      .from("cost_sheet_items")
      .select("*, suppliers!cost_sheet_items_supplier_id_fkey(name)")
      .eq("id", itemId)
      .maybeSingle();

    const { error } = await supabase
      .from("cost_sheet_items")
      .update({ approval_status: "approved_both" })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to approve item");
      setLoading(false);
      return;
    }

    // Get estimator and client info
    const { data: costSheetData } = await supabase
      .from("cost_sheets")
      .select("created_by")
      .eq("id", costSheetId)
      .maybeSingle();

    const { data: clientData } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();

    // Notify estimator with detailed information
    if (costSheetData && itemData) {
      await supabase.from("notifications").insert({
        user_id: costSheetData.created_by,
        title: "✅ Item Approved",
        message: `Supplier: ${itemData.suppliers?.name || 'Unknown'} | Price: AED ${itemData.actual_quoted?.toLocaleString() || 'N/A'} | Client: ${clientData?.name || "client"}`,
        type: "approval",
      });
    }

    setLoading(false);
    toast.success("Item approved successfully!");
    fetchCostSheetItems();
  };

  const rejectItem = async (itemId: string) => {
    setLoading(true);

    const { error } = await supabase
      .from("cost_sheet_items")
      .update({ approval_status: "rejected" })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to reject item");
      setLoading(false);
      return;
    }

    // Get estimator and client info
    const { data: costSheetData } = await supabase
      .from("cost_sheets")
      .select("created_by")
      .eq("id", costSheetId)
      .maybeSingle();

    const { data: clientData } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();

    // Notify estimator
    if (costSheetData) {
      await supabase.from("notifications").insert({
        user_id: costSheetData.created_by,
        title: "❌ Item Rejected",
        message: `An item from your cost sheet for ${clientData?.name || "client"} has been rejected.`,
        type: "rejection",
      });
    }

    setLoading(false);
    toast.success("Item rejected");
    fetchCostSheetItems();
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-primary">Cost Sheet</h2>
          {costSheetStatus && costSheetStatus !== "draft" && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
              ${costSheetStatus === "submitted" ? "bg-warning/20 text-warning-foreground" : ""}
              ${costSheetStatus === "approved" ? "bg-success/20 text-success-foreground" : ""}
              ${costSheetStatus === "rejected" ? "bg-destructive/20 text-destructive-foreground" : ""}
            `}>
              {costSheetStatus.charAt(0).toUpperCase() + costSheetStatus.slice(1)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name</Label>
                  <Input
                    id="supplier-name"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <Button onClick={addNewSupplier} className="w-full">Add Supplier</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {userRole === "estimator" && (
            <>
              <Button variant="outline" size="sm" onClick={addNewRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
              <Button variant="outline" size="sm" onClick={saveCostSheet} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save"}
              </Button>
              {costSheetId && costSheetStatus === "draft" && (
                <Button size="sm" onClick={submitForApproval} disabled={loading}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              )}
              {costSheetId && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={deleteCostSheet} 
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Cost Sheet
                </Button>
              )}
            </>
          )}
          {userRole === "admin" && costSheetId && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={deleteCostSheet} 
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Cost Sheet
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Product Supplier</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Supplier Cost (AED)</TableHead>
              <TableHead>Misc Supplier</TableHead>
              <TableHead>Misc Qty</TableHead>
              <TableHead>Misc Cost (AED)</TableHead>
              <TableHead>Misc Type</TableHead>
              <TableHead>Total Cost (AED)</TableHead>
              <TableHead>Markup %</TableHead>
              <TableHead>Markup Amount (AED)</TableHead>
              <TableHead>Gross Margin %</TableHead>
              <TableHead>Quoted Price (AED)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.item_number}</TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateItem(index, "date", e.target.value)}
                    disabled={userRole !== "estimator"}
                    className="w-36"
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    value={item.item}
                    onChange={(e) => updateItem(index, "item", e.target.value)}
                    disabled={userRole !== "estimator"}
                    placeholder="Enter detailed item description..."
                    className="min-w-[300px] min-h-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.supplier_id || ""}
                    onValueChange={(value) => updateItem(index, "supplier_id", value)}
                    disabled={userRole !== "estimator"}
                  >
                    <SelectTrigger className="w-40 bg-popover">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.qty || ""}
                    onChange={(e) => updateItem(index, "qty", parseInt(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-20"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.supplier_cost || ""}
                    onChange={(e) => updateItem(index, "supplier_cost", parseInt(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-28"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.misc_supplier_id || ""}
                    onValueChange={(value) => updateItem(index, "misc_supplier_id", value)}
                    disabled={userRole !== "estimator"}
                  >
                    <SelectTrigger className="w-40 bg-popover">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="">None</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.misc_qty || ""}
                    onChange={(e) => updateItem(index, "misc_qty", parseInt(e.target.value) || 1)}
                    disabled={userRole !== "estimator" || !item.misc_supplier_id}
                    className="w-20"
                    placeholder="1"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.misc_cost || ""}
                    onChange={(e) => updateItem(index, "misc_cost", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator" || !item.misc_supplier_id}
                    className="w-28"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.misc_cost_type}
                    onChange={(e) => updateItem(index, "misc_cost_type", e.target.value)}
                    disabled={userRole !== "estimator" || !item.misc_supplier_id}
                    placeholder="Printing, etc."
                    className="w-32"
                  />
                </TableCell>
                <TableCell className="font-semibold">
                  {item.total_cost.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.rea_margin_percentage || ""}
                    onChange={(e) => updateItem(index, "rea_margin_percentage", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-24"
                    placeholder="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  {item.rea_margin.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold text-success">
                  {(() => {
                    const markupPercent = item.rea_margin_percentage || 0;
                    const grossMargin = markupPercent > 0 ? (markupPercent / (1 + markupPercent / 100)) : 0;
                    return grossMargin.toFixed(2);
                  })()}%
                </TableCell>
                <TableCell className="font-bold text-lg">
                  {item.actual_quoted.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                    ${item.approval_status === "pending" ? "bg-warning/20 text-warning-foreground" : ""}
                    ${item.approval_status === "approved_both" ? "bg-success/20 text-success-foreground" : ""}
                    ${item.approval_status === "rejected" ? "bg-destructive/20 text-destructive-foreground" : ""}
                  `}>
                    {item.approval_status === "approved_both" ? "Approved" : 
                     item.approval_status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {userRole === "estimator" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    {userRole === "admin" && costSheetStatus === "submitted" && item.approval_status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => item.id && approveItem(item.id)}
                          disabled={loading}
                          className="bg-success hover:bg-success/90"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => item.id && rejectItem(item.id)}
                          disabled={loading}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {userRole === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
