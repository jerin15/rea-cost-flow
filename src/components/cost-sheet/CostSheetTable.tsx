import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Save, Send, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { ItemSupplierManager, ItemSupplierOption } from "./ItemSupplierManager";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  qty: number;
  rea_margin_percentage: number;
  rea_margin: number;
  total_cost: number;
  actual_quoted: number;
  approval_status: ApprovalStatus;
  admin_remarks: string;
  suppliers: ItemSupplierOption[];
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

  const isReadOnly = userRole === "estimator" && costSheetStatus === "submitted";

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
          
          if (newItem.approval_status === 'approved_both') {
            // Play notification sound
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

            toast.success(`✅ Item Approved!`, {
              description: `Price: AED ${newItem.actual_quoted.toLocaleString()}`,
              duration: 8000,
            });

            fetchCostSheetItems();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [costSheetId, userRole]);

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
      // Fetch cost sheet items
      const { data: itemsData, error: itemsError } = await supabase
        .from("cost_sheet_items")
        .select(`
          *,
          cost_sheets!inner(client_id, id, status)
        `)
        .eq("cost_sheets.client_id", clientId)
        .neq("approval_status", "approved_both")
        .order("item_number");

      if (itemsError) {
        console.error("Error fetching cost sheet items:", itemsError);
        setItems([]);
        return;
      }

      if (itemsData && itemsData.length > 0) {
        setCostSheetId(itemsData[0].cost_sheet_id);
        setCostSheetStatus(itemsData[0].cost_sheets.status);

        // Fetch supplier options for all items
        const itemIds = itemsData.map(item => item.id);
        const { data: supplierOptionsData, error: supplierOptionsError } = await supabase
          .from("cost_sheet_item_suppliers")
          .select(`
            *,
            suppliers(name)
          `)
          .in("cost_sheet_item_id", itemIds);

        if (supplierOptionsError) {
          console.error("Error fetching supplier options:", supplierOptionsError);
        }

        // Map items with their supplier options
        const itemsWithSuppliers = itemsData.map(item => {
          const itemSuppliers = supplierOptionsData
            ?.filter(s => s.cost_sheet_item_id === item.id)
            .map(s => ({
              id: s.id,
              supplier_id: s.supplier_id,
              supplier_name: s.suppliers?.name,
              supplier_type: s.supplier_type as 'product' | 'misc',
              unit_cost: s.unit_cost,
              qty: s.qty,
              description: s.description || "",
              selected_by_admin: s.selected_by_admin,
            })) || [];

          return {
            id: item.id,
            item_number: item.item_number,
            date: item.date,
            item: item.item,
            qty: item.qty,
            rea_margin_percentage: item.rea_margin_percentage ?? 0,
            rea_margin: item.rea_margin ?? 0,
            total_cost: item.total_cost ?? 0,
            actual_quoted: item.actual_quoted ?? 0,
            approval_status: item.approval_status,
            admin_remarks: item.admin_remarks || "",
            suppliers: itemSuppliers,
          };
        });

        setItems(itemsWithSuppliers);
      } else {
        setItems([]);
        setCostSheetId(null);
        setCostSheetStatus("draft");
      }
    } catch (err) {
      console.error("Unexpected error in fetchCostSheetItems:", err);
      setItems([]);
    }
  };

  const addNewSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Supplier name cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("suppliers")
      .insert([{ client_id: clientId, name: newSupplierName.trim() }]);

    if (error) {
      toast.error("Failed to add supplier");
      return;
    }

    toast.success("Supplier added successfully");
    setNewSupplierName("");
    setSupplierDialogOpen(false);
    fetchSuppliers();
  };

  const addNewRow = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      let sheetId = costSheetId;

      // Create cost sheet if it doesn't exist
      if (!sheetId) {
        const { data: newSheet, error: sheetError } = await supabase
          .from("cost_sheets")
          .insert([{
            client_id: clientId,
            created_by: user.id,
            status: "draft",
          }])
          .select()
          .single();

        if (sheetError || !newSheet) {
          toast.error("Failed to create cost sheet");
          return;
        }

        sheetId = newSheet.id;
        setCostSheetId(sheetId);
      }

      const nextItemNumber = items.length > 0 ? Math.max(...items.map(i => i.item_number)) + 1 : 1;

      const { data: newItem, error: itemError } = await supabase
        .from("cost_sheet_items")
        .insert([{
          cost_sheet_id: sheetId,
          item_number: nextItemNumber,
          date: new Date().toISOString().split('T')[0],
          item: "",
          qty: 1,
          supplier_cost: 0,
          misc_cost: 0,
          total_cost: 0,
          rea_margin: 0,
          rea_margin_percentage: 0,
          actual_quoted: 0,
          approval_status: "pending",
        }])
        .select()
        .single();

      if (itemError || !newItem) {
        toast.error("Failed to add item");
        return;
      }

      setItems([...items, {
        id: newItem.id,
        item_number: newItem.item_number,
        date: newItem.date,
        item: newItem.item,
        qty: newItem.qty,
        rea_margin_percentage: 0,
        rea_margin: 0,
        total_cost: 0,
        actual_quoted: 0,
        approval_status: "pending",
        admin_remarks: "",
        suppliers: [],
      }]);

      toast.success("New item added");
    } catch (error) {
      console.error("Error adding new row:", error);
      toast.error("An error occurred while adding the item");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof CostSheetItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate costs if needed
    if (field === 'suppliers' || field === 'rea_margin_percentage' || field === 'actual_quoted') {
      const item = updated[index];
      const selectedSuppliers = item.suppliers.filter(s => s.selected_by_admin || userRole === 'estimator');
      const totalCost = selectedSuppliers.reduce((sum, s) => sum + (s.unit_cost * s.qty), 0);
      
      item.total_cost = totalCost;

      if (field === 'actual_quoted') {
        // User entered quoted price directly - calculate markup and margin
        const quotedPrice = parseFloat(value) || 0;
        const markup = quotedPrice - totalCost;
        const markupPercentage = totalCost > 0 ? (markup / totalCost) * 100 : 0;
        
        item.actual_quoted = quotedPrice;
        item.rea_margin = markup;
        item.rea_margin_percentage = markupPercentage;
      } else {
        // User changed markup percentage - calculate quoted price
        item.rea_margin = (totalCost * item.rea_margin_percentage) / 100;
        item.actual_quoted = totalCost + item.rea_margin;
      }
    }

    setItems(updated);
  };

  const saveItem = async (index: number) => {
    const item = items[index];
    if (!item.id) return;

    setLoading(true);

    try {
      // Calculate totals based on selected suppliers
      const selectedSuppliers = item.suppliers.filter(s => s.selected_by_admin || userRole === 'estimator');
      const totalCost = selectedSuppliers.reduce((sum, s) => sum + (s.unit_cost * s.qty), 0);
      const reaMargin = (totalCost * item.rea_margin_percentage) / 100;
      const actualQuoted = totalCost + reaMargin;

      // Update the cost sheet item
      const { error: itemError } = await supabase
        .from("cost_sheet_items")
        .update({
          date: item.date,
          item: item.item,
          qty: item.qty,
          total_cost: totalCost,
          rea_margin: reaMargin,
          rea_margin_percentage: item.rea_margin_percentage,
          actual_quoted: actualQuoted,
          admin_remarks: item.admin_remarks,
        })
        .eq("id", item.id);

      if (itemError) {
        toast.error("Failed to save item");
        return;
      }

      // Delete existing supplier options for this item
      const { error: deleteError } = await supabase
        .from("cost_sheet_item_suppliers")
        .delete()
        .eq("cost_sheet_item_id", item.id);

      if (deleteError) {
        console.error("Error deleting old suppliers:", deleteError);
      }

      // Insert new supplier options
      if (item.suppliers.length > 0) {
        const suppliersToInsert = item.suppliers.map(s => ({
          cost_sheet_item_id: item.id,
          supplier_id: s.supplier_id,
          supplier_type: s.supplier_type,
          unit_cost: s.unit_cost,
          qty: s.qty,
          description: s.description,
          selected_by_admin: s.selected_by_admin,
        }));

        const { error: insertError } = await supabase
          .from("cost_sheet_item_suppliers")
          .insert(suppliersToInsert);

        if (insertError) {
          toast.error("Failed to save supplier options");
          return;
        }
      }

      toast.success("Item saved successfully");
      fetchCostSheetItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("An error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (index: number) => {
    const item = items[index];
    if (!item.id) return;

    if (!confirm("Are you sure you want to delete this item?")) return;

    const { error } = await supabase
      .from("cost_sheet_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    setItems(items.filter((_, i) => i !== index));
    toast.success("Item deleted");
  };

  const submitCostSheet = async () => {
    if (!costSheetId) {
      toast.error("No cost sheet to submit");
      return;
    }

    if (items.length === 0) {
      toast.error("Cannot submit empty cost sheet");
      return;
    }

    // Check if all items have at least one supplier
    const itemsWithoutSuppliers = items.filter(item => item.suppliers.length === 0);
    if (itemsWithoutSuppliers.length > 0) {
      toast.error("All items must have at least one supplier");
      return;
    }

    const { error } = await supabase
      .from("cost_sheets")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", costSheetId);

    if (error) {
      toast.error("Failed to submit cost sheet");
      return;
    }

    toast.success("Cost sheet submitted for approval");
    setCostSheetStatus("submitted");
  };

  const handleApproval = async (index: number, approved: boolean) => {
    const item = items[index];
    if (!item.id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Determine which admin is approving
    const { data: userData } = await supabase
      .from("user_roles")
      .select("email")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdminA = userData?.email === "anand@reaadvertising.com";
    const isAdminB = userData?.email === "reena@reaadvertising.com";

    let newStatus: ApprovalStatus = item.approval_status;
    const updateData: any = {};

    if (approved) {
      if (isAdminA) {
        updateData.approved_by_admin_a = true;
        newStatus = item.approval_status === "approved_admin_b" ? "approved_both" : "approved_admin_a";
      } else if (isAdminB) {
        updateData.approved_by_admin_b = true;
        newStatus = item.approval_status === "approved_admin_a" ? "approved_both" : "approved_admin_b";
      }
      updateData.approval_status = newStatus;
    } else {
      updateData.approval_status = "rejected";
      updateData.approved_by_admin_a = false;
      updateData.approved_by_admin_b = false;
      newStatus = "rejected";
    }

    const { error } = await supabase
      .from("cost_sheet_items")
      .update(updateData)
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to update approval status");
      return;
    }

    toast.success(approved ? "Item approved" : "Item rejected");
    fetchCostSheetItems();
  };

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "approved_both":
        return <Badge className="bg-success">Approved</Badge>;
      case "approved_admin_a":
        return <Badge className="bg-warning">Approved by Admin A</Badge>;
      case "approved_admin_b":
        return <Badge className="bg-warning">Approved by Admin B</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {userRole === "estimator" && (
            <>
              <Button onClick={addNewRow} disabled={loading || isReadOnly}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isReadOnly}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supplier-name">Supplier Name</Label>
                      <Input
                        id="supplier-name"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        placeholder="Enter supplier name"
                      />
                    </div>
                    <Button onClick={addNewSupplier} className="w-full">
                      Add Supplier
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
        {userRole === "estimator" && costSheetStatus === "draft" && items.length > 0 && (
          <Button onClick={submitCostSheet} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="min-w-[200px]">Item</TableHead>
              <TableHead className="min-w-[400px]">Suppliers</TableHead>
              <TableHead className="w-32">Total Cost</TableHead>
              <TableHead className="w-24">Markup %</TableHead>
              <TableHead className="w-32">Markup (AED)</TableHead>
              <TableHead className="w-32">Quoted Price</TableHead>
              <TableHead className="w-24">Margin %</TableHead>
              {userRole === "admin" && (
                <TableHead className="min-w-[200px]">Admin Remarks</TableHead>
              )}
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              // Calculate margin percentage: (Selling Price - Cost) / Selling Price * 100
              const marginPercentage = item.actual_quoted > 0 
                ? ((item.actual_quoted - item.total_cost) / item.actual_quoted) * 100 
                : 0;

              return (
                <TableRow key={item.id || index}>
                  <TableCell>{item.item_number}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(index, 'date', e.target.value)}
                      disabled={isReadOnly}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.item}
                      onChange={(e) => updateItem(index, 'item', e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Item description"
                    />
                  </TableCell>
                  <TableCell>
                    <ItemSupplierManager
                      suppliers={suppliers}
                      supplierOptions={item.suppliers}
                      onSuppliersChange={(suppliers) => updateItem(index, 'suppliers', suppliers)}
                      isAdmin={userRole === "admin"}
                      isReadOnly={isReadOnly}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    AED {item.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={item.rea_margin_percentage || ""}
                      onChange={(e) => updateItem(index, 'rea_margin_percentage', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    AED {item.rea_margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.actual_quoted || ""}
                      onChange={(e) => updateItem(index, 'actual_quoted', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-32 font-bold"
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-success">
                    {marginPercentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </TableCell>
                  {userRole === "admin" && (
                    <TableCell>
                      <Textarea
                        value={item.admin_remarks}
                        onChange={(e) => updateItem(index, 'admin_remarks', e.target.value)}
                        placeholder="Admin remarks..."
                        className="min-h-[60px]"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {getApprovalBadge(item.approval_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          onClick={() => saveItem(index)}
                          disabled={loading}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      )}
                      {userRole === "admin" && item.approval_status !== "approved_both" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproval(index, true)}
                            disabled={loading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproval(index, false)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {userRole === "estimator" && !isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteItem(index)}
                          disabled={loading}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No items yet. Click "Add Item" to start creating your cost sheet.
        </div>
      )}
    </div>
  );
};
