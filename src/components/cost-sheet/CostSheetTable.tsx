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
  qty: number;
  supplier_cost: number;
  misc_cost: number;
  misc_cost_type: string;
  total_cost: number;
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

  useEffect(() => {
    if (clientId) {
      fetchSuppliers();
      fetchCostSheetItems();
    }
  }, [clientId]);

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
    const { data, error } = await supabase
      .from("cost_sheet_items")
      .select(`
        *,
        cost_sheets!inner(client_id)
      `)
      .eq("cost_sheets.client_id", clientId)
      .order("item_number");

    if (!error && data) {
      setItems(data);
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
      qty: 1,
      supplier_cost: 0,
      misc_cost: 0,
      misc_cost_type: "",
      total_cost: 0,
      rea_margin: 0,
      actual_quoted: 0,
      approval_status: "pending",
      admin_remarks: "",
    };
    setItems([...items, newItem]);
  };

  const calculateTotals = (item: CostSheetItem) => {
    const totalCost = (item.supplier_cost * item.qty) + (item.misc_cost || 0);
    const reaMargin = item.rea_margin || (item.supplier_cost * 0.40);
    const actualQuoted = item.actual_quoted || (totalCost + reaMargin);
    
    return { totalCost, reaMargin, actualQuoted };
  };

  const updateItem = (index: number, field: keyof CostSheetItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate
    const { totalCost, reaMargin, actualQuoted } = calculateTotals(updatedItems[index]);
    updatedItems[index].total_cost = totalCost;
    updatedItems[index].rea_margin = reaMargin;
    updatedItems[index].actual_quoted = actualQuoted;
    
    setItems(updatedItems);
  };

  const deleteItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const saveCostSheet = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setLoading(true);

    // Create or get cost sheet
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

    // Insert items
    const itemsToInsert = items.map(item => ({
      ...item,
      cost_sheet_id: costSheet.id,
    }));

    const { error: itemsError } = await supabase
      .from("cost_sheet_items")
      .insert(itemsToInsert);

    setLoading(false);

    if (itemsError) {
      toast.error("Failed to save cost sheet items");
      return;
    }

    toast.success("Cost sheet saved successfully");
    fetchCostSheetItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Cost Sheet</h2>
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
              <Button size="sm" onClick={saveCostSheet} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save"}
              </Button>
            </>
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
              <TableHead>Supplier</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Supplier Cost (AED)</TableHead>
              <TableHead>Misc Cost (AED)</TableHead>
              <TableHead>Misc Type</TableHead>
              <TableHead>Total Cost (AED)</TableHead>
              <TableHead>REA Margin (AED)</TableHead>
              <TableHead>Actual Quoted (AED)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Remarks</TableHead>
              {userRole === "estimator" && <TableHead>Actions</TableHead>}
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
                  <Input
                    value={item.item}
                    onChange={(e) => updateItem(index, "item", e.target.value)}
                    disabled={userRole !== "estimator"}
                    placeholder="Item description"
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
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.supplier_cost}
                    onChange={(e) => updateItem(index, "supplier_cost", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.misc_cost}
                    onChange={(e) => updateItem(index, "misc_cost", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.misc_cost_type}
                    onChange={(e) => updateItem(index, "misc_cost_type", e.target.value)}
                    disabled={userRole !== "estimator"}
                    placeholder="Type"
                    className="w-28"
                  />
                </TableCell>
                <TableCell className="font-semibold">{item.total_cost.toFixed(2)}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.rea_margin}
                    onChange={(e) => updateItem(index, "rea_margin", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.actual_quoted}
                    onChange={(e) => updateItem(index, "actual_quoted", parseFloat(e.target.value) || 0)}
                    disabled={userRole !== "estimator"}
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                    ${item.approval_status === "pending" ? "bg-warning/20 text-warning-foreground" : ""}
                    ${item.approval_status.includes("approved") ? "bg-success/20 text-success-foreground" : ""}
                    ${item.approval_status === "rejected" ? "bg-destructive/20 text-destructive-foreground" : ""}
                  `}>
                    {item.approval_status}
                  </span>
                </TableCell>
                <TableCell>
                  {userRole === "admin" ? (
                    <Textarea
                      value={item.admin_remarks}
                      onChange={(e) => updateItem(index, "admin_remarks", e.target.value)}
                      placeholder="Add remarks..."
                      className="w-48"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">{item.admin_remarks || "—"}</span>
                  )}
                </TableCell>
                {userRole === "estimator" && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
