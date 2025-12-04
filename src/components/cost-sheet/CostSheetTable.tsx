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

  // Estimators can always edit, admins can always edit
  const isReadOnly = false;

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

        // Map items with their supplier options - rebuild nested structure
        const itemsWithSuppliers = itemsData.map(item => {
          const allSuppliers = supplierOptionsData?.filter(s => s.cost_sheet_item_id === item.id) || [];
          
          // Separate product suppliers (no parent) and misc suppliers (have parent)
          const productSuppliers = allSuppliers.filter(s => !s.parent_supplier_id && s.supplier_type === 'product');
          const miscSuppliers = allSuppliers.filter(s => s.parent_supplier_id || s.supplier_type === 'misc');
          
          // Build nested structure
          const itemSuppliers = productSuppliers.map(s => {
            // Find misc suppliers that belong to this product supplier
            const nestedMisc = miscSuppliers
              .filter(m => m.parent_supplier_id === s.id)
              .map(m => ({
                id: m.id,
                supplier_id: m.supplier_id,
                supplier_name: m.suppliers?.name,
                unit_cost: m.unit_cost,
                qty: m.qty,
                description: m.description || "",
              }));
            
            // Calculate subtotal including misc
            const productCost = s.unit_cost * s.qty;
            const miscCost = nestedMisc.reduce((sum, m) => sum + (m.unit_cost * m.qty), 0);
            const subtotal = productCost + miscCost;
            
            return {
              id: s.id,
              supplier_id: s.supplier_id,
              supplier_name: s.suppliers?.name,
              supplier_type: s.supplier_type as 'product' | 'misc',
              unit_cost: s.unit_cost,
              qty: s.qty,
              description: s.description || "",
              selected_by_admin: s.selected_by_admin,
              markup_percentage: s.markup_percentage || 0,
              markup_amount: subtotal * ((s.markup_percentage || 0) / 100),
              quoted_price: s.quoted_price || 0,
              approval_status: s.approval_status || 'pending',
              misc_suppliers: nestedMisc,
            };
          });

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

    // Recalculate costs if suppliers change
    if (field === 'suppliers') {
      const item = updated[index];
      
      // Sum up all supplier costs (misc uses product qty) and quoted prices
      const totalCost = item.suppliers.reduce((sum, s) => {
        const qty = s.qty || 1;
        const productUnitCost = s.unit_cost;
        const miscUnitCost = (s.misc_suppliers || []).reduce((mSum, misc) => mSum + misc.unit_cost, 0);
        return sum + ((productUnitCost + miscUnitCost) * qty);
      }, 0);
      const totalQuoted = item.suppliers.reduce((sum, s) => sum + (s.quoted_price || 0), 0);
      const totalQty = item.suppliers.reduce((sum, s) => sum + s.qty, 0);
      
      item.total_cost = totalCost;
      item.actual_quoted = totalQuoted;
      item.rea_margin = totalQuoted - totalCost;
      item.rea_margin_percentage = totalQuoted > 0 ? ((totalQuoted - totalCost) / totalQuoted) * 100 : 0;
      item.qty = totalQty;
    }

    setItems(updated);
  };

  const saveItem = async (index: number) => {
    const item = items[index];
    if (!item.id) return;

    setLoading(true);

    try {
      // Validate that at least one supplier has been added
      if (item.suppliers.length === 0) {
        toast.error("Please add at least one supplier before saving");
        setLoading(false);
        return;
      }

      // Calculate totals from all suppliers (misc uses product qty)
      const totalCost = item.suppliers.reduce((sum, s) => {
        const qty = s.qty || 1;
        const productUnitCost = s.unit_cost;
        const miscUnitCost = (s.misc_suppliers || []).reduce((mSum, misc) => mSum + misc.unit_cost, 0);
        return sum + ((productUnitCost + miscUnitCost) * qty);
      }, 0);
      const totalQuoted = item.suppliers.reduce((sum, s) => sum + (s.quoted_price || 0), 0);
      const totalQty = item.suppliers.reduce((sum, s) => sum + s.qty, 0);
      
      const reaMarginAmount = totalQuoted - totalCost;
      const reaMarginPercentage = totalQuoted > 0 ? (reaMarginAmount / totalQuoted) * 100 : 0;

      // Update the cost sheet item
      const { error: itemError } = await supabase
        .from("cost_sheet_items")
        .update({
          date: item.date,
          item: item.item,
          qty: totalQty,
          total_cost: totalCost,
          rea_margin: reaMarginAmount,
          rea_margin_percentage: reaMarginPercentage,
          actual_quoted: totalQuoted,
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

      // Insert new supplier options (including nested misc suppliers)
      if (item.suppliers.length > 0) {
        for (const supplier of item.suppliers) {
          // Insert the main product supplier first
          const { data: insertedSupplier, error: insertError } = await supabase
            .from("cost_sheet_item_suppliers")
            .insert({
              cost_sheet_item_id: item.id,
              supplier_id: supplier.supplier_id,
              supplier_type: supplier.supplier_type,
              unit_cost: supplier.unit_cost,
              qty: supplier.qty,
              description: supplier.description,
              selected_by_admin: supplier.selected_by_admin,
              quoted_price: supplier.quoted_price || 0,
              markup_percentage: supplier.markup_percentage || 0,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting supplier:", insertError);
            toast.error("Failed to save supplier options");
            return;
          }

          // Insert misc suppliers linked to this parent
          if (supplier.misc_suppliers && supplier.misc_suppliers.length > 0) {
            const miscToInsert = supplier.misc_suppliers.map(misc => ({
              cost_sheet_item_id: item.id,
              supplier_id: misc.supplier_id,
              supplier_type: 'misc' as const,
              unit_cost: misc.unit_cost,
              qty: supplier.qty, // Use parent supplier's qty
              description: misc.description,
              selected_by_admin: false,
              quoted_price: 0,
              markup_percentage: 0,
              parent_supplier_id: insertedSupplier.id,
            }));

            const { error: miscInsertError } = await supabase
              .from("cost_sheet_item_suppliers")
              .insert(miscToInsert);

            if (miscInsertError) {
              console.error("Error inserting misc suppliers:", miscInsertError);
              toast.error("Failed to save misc suppliers");
              return;
            }
          }
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

  const handleSupplierApproval = async (supplierId: string, approved: boolean) => {
    if (!supplierId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newStatus = approved ? 'approved' : 'rejected';

    const { error } = await supabase
      .from("cost_sheet_item_suppliers")
      .update({ 
        approval_status: newStatus,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", supplierId);

    if (error) {
      toast.error("Failed to update supplier approval");
      return;
    }

    toast.success(approved ? "Supplier approved" : "Supplier rejected");
    fetchCostSheetItems();
  };

  const getSupplierApprovalBadge = (status: string | undefined) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">✓ Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">✗ Rejected</Badge>;
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
              <Button onClick={addNewRow} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
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

      <div className="w-full overflow-x-auto scrollbar-visible">
        <div style={{ minWidth: '1400px' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead style={{ minWidth: '150px' }}>Date</TableHead>
              <TableHead style={{ minWidth: '250px' }}>Item</TableHead>
              <TableHead style={{ minWidth: '600px' }}>Suppliers</TableHead>
              <TableHead style={{ minWidth: '150px' }}>Total Cost</TableHead>
              <TableHead style={{ minWidth: '150px' }}>Client Unit Cost</TableHead>
              <TableHead style={{ minWidth: '180px' }}>Total Quoted</TableHead>
              <TableHead style={{ minWidth: '150px' }}>REA's Margin (AED)</TableHead>
              <TableHead style={{ minWidth: '130px' }}>REA's Margin %</TableHead>
              <TableHead style={{ minWidth: '120px' }}>Supplier Status</TableHead>
              {userRole === "admin" && (
                <TableHead style={{ minWidth: '250px' }}>Supplier Actions</TableHead>
              )}
              {userRole === "admin" && (
                <TableHead style={{ minWidth: '200px' }}>Admin Remarks</TableHead>
              )}
              <TableHead style={{ minWidth: '200px' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, itemIndex) => {
              // Show one row per supplier
              const suppliersToDisplay = item.suppliers.length > 0 ? item.suppliers : [null];
              
              return suppliersToDisplay.map((supplier, supplierIndex) => {
                const isFirstSupplier = supplierIndex === 0;
                
                // Calculate individual supplier metrics (misc uses product qty)
                const qty = supplier ? (supplier.qty || 1) : 1;
                const productUnitCost = supplier ? supplier.unit_cost : 0;
                const miscUnitCost = supplier ? (supplier.misc_suppliers || []).reduce((sum, misc) => sum + misc.unit_cost, 0) : 0;
                const combinedUnitCost = productUnitCost + miscUnitCost;
                const supplierSubtotal = combinedUnitCost * qty;
                const supplierQuoted = supplier ? supplier.quoted_price : 0;
                const supplierMargin = supplierQuoted - supplierSubtotal;
                const supplierMarginPercentage = supplierQuoted > 0 ? (supplierMargin / supplierQuoted) * 100 : 0;
                const supplierClientUnitCost = supplier && qty > 0 ? supplierQuoted / qty : 0;

                return (
                  <TableRow key={`${item.id || itemIndex}-${supplierIndex}`}>
                    {isFirstSupplier && (
                      <>
                        <TableCell rowSpan={suppliersToDisplay.length}>{item.item_number}</TableCell>
                        <TableCell rowSpan={suppliersToDisplay.length}>
                          <Input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateItem(itemIndex, 'date', e.target.value)}
                            disabled={isReadOnly}
                            className="h-11 text-base"
                            style={{ minWidth: '150px' }}
                          />
                        </TableCell>
                        <TableCell rowSpan={suppliersToDisplay.length}>
                          <Input
                            value={item.item}
                            onChange={(e) => updateItem(itemIndex, 'item', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Item description"
                            className="h-11 text-base"
                            style={{ minWidth: '250px' }}
                          />
                        </TableCell>
                        <TableCell rowSpan={suppliersToDisplay.length} className="align-top" style={{ minWidth: '600px' }}>
                          <ItemSupplierManager
                            suppliers={suppliers}
                            supplierOptions={item.suppliers}
                            onSuppliersChange={(suppliers) => updateItem(itemIndex, 'suppliers', suppliers)}
                            isAdmin={userRole === "admin"}
                            isReadOnly={isReadOnly}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell className="font-semibold">
                      {supplier ? `AED ${supplierSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {supplier ? `AED ${supplierClientUnitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="font-bold text-lg">
                      {supplier ? `AED ${supplierQuoted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      {supplier ? `AED ${supplierMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      {supplier ? `${supplierMarginPercentage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {supplier && getSupplierApprovalBadge(supplier.approval_status)}
                    </TableCell>
                    {userRole === "admin" && (
                      <TableCell>
                        {supplier && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSupplierApproval(supplier.id, true)}
                              disabled={loading || supplier.approval_status === 'approved'}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSupplierApproval(supplier.id, false)}
                              disabled={loading || supplier.approval_status === 'rejected'}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {userRole === "admin" && isFirstSupplier && (
                      <TableCell rowSpan={suppliersToDisplay.length}>
                        <Textarea
                          value={item.admin_remarks}
                          onChange={(e) => updateItem(itemIndex, 'admin_remarks', e.target.value)}
                          placeholder="Admin remarks..."
                          className="min-h-[60px]"
                        />
                      </TableCell>
                    )}
                    {isFirstSupplier && (
                      <TableCell rowSpan={suppliersToDisplay.length}>
                        <div className="flex flex-col gap-2">
                          {!isReadOnly && (
                            <Button
                              size="sm"
                              onClick={() => saveItem(itemIndex)}
                              disabled={loading}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          )}
                          {userRole === "estimator" && !isReadOnly && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItem(itemIndex)}
                              disabled={loading}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No items yet. Click "Add Item" to start creating your cost sheet.
        </div>
      )}
    </div>
  );
};
