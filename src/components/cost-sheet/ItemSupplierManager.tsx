import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
}

export interface ItemSupplierOption {
  id?: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_type: 'product' | 'misc';
  unit_cost: number;
  qty: number;
  description?: string;
  selected_by_admin: boolean;
  markup_percentage: number;
  markup_amount: number;
  quoted_price: number;
  approval_status?: string;
}

interface ItemSupplierManagerProps {
  suppliers: Supplier[];
  supplierOptions: ItemSupplierOption[];
  onSuppliersChange: (suppliers: ItemSupplierOption[]) => void;
  isAdmin: boolean;
  isReadOnly: boolean;
}

export const ItemSupplierManager = ({
  suppliers,
  supplierOptions,
  onSuppliersChange,
  isAdmin,
  isReadOnly,
}: ItemSupplierManagerProps) => {
  const addSupplier = (type: 'product' | 'misc') => {
    const newSupplier: ItemSupplierOption = {
      supplier_id: suppliers[0]?.id || "",
      supplier_type: type,
      unit_cost: 0,
      qty: 1,
      description: "",
      selected_by_admin: false,
      markup_percentage: 0,
      markup_amount: 0,
      quoted_price: 0,
    };
    onSuppliersChange([...supplierOptions, newSupplier]);
  };

  const updateSupplier = (index: number, field: keyof ItemSupplierOption, value: any) => {
    const updated = [...supplierOptions];
    const supplier = { ...updated[index], [field]: value };
    
    // Calculate subtotal for this supplier
    const subtotal = supplier.unit_cost * supplier.qty;
    
    if (field === 'markup_percentage') {
      // User entered markup% - calculate markup amount and quoted price
      const markupPct = parseFloat(value) || 0;
      supplier.markup_percentage = markupPct;
      supplier.markup_amount = subtotal * (markupPct / 100);
      supplier.quoted_price = subtotal + supplier.markup_amount;
    } else if (field === 'markup_amount') {
      // User entered markup amount - calculate markup% and quoted price
      const markupAmt = parseFloat(value) || 0;
      supplier.markup_amount = markupAmt;
      supplier.markup_percentage = subtotal > 0 ? (markupAmt / subtotal) * 100 : 0;
      supplier.quoted_price = subtotal + markupAmt;
    } else if (field === 'unit_cost' || field === 'qty') {
      // Cost changed - recalculate based on existing markup
      if (supplier.markup_percentage > 0) {
        supplier.markup_amount = subtotal * (supplier.markup_percentage / 100);
        supplier.quoted_price = subtotal + supplier.markup_amount;
      } else if (supplier.markup_amount > 0) {
        supplier.markup_percentage = subtotal > 0 ? (supplier.markup_amount / subtotal) * 100 : 0;
        supplier.quoted_price = subtotal + supplier.markup_amount;
      } else {
        supplier.quoted_price = subtotal;
      }
    }
    
    updated[index] = supplier;
    onSuppliersChange(updated);
  };

  const removeSupplier = (index: number) => {
    const updated = supplierOptions.filter((_, i) => i !== index);
    onSuppliersChange(updated);
  };

  const toggleSelection = (index: number) => {
    if (!isAdmin) return;
    const updated = [...supplierOptions];
    updated[index] = { ...updated[index], selected_by_admin: !updated[index].selected_by_admin };
    onSuppliersChange(updated);
  };

  const productSuppliers = supplierOptions.filter(s => s.supplier_type === 'product');
  const miscSuppliers = supplierOptions.filter(s => s.supplier_type === 'misc');

  return (
    <div className="w-full bg-muted/20 rounded-lg border p-3">
      <div className="space-y-4">
          {/* Product Suppliers */}
          <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">Product Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('product')}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {productSuppliers.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2 text-center">No product suppliers</p>
          )}
          {productSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            const subtotal = supplier.unit_cost * supplier.qty;
            return (
                <div
                key={globalIndex}
                className={`p-2 rounded border ${
                  supplier.selected_by_admin 
                    ? 'bg-success/10 border-success' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant={supplier.selected_by_admin ? "default" : "outline"}
                        onClick={() => toggleSelection(globalIndex)}
                        className="h-8 w-8 p-0 shrink-0"
                        title={supplier.selected_by_admin ? "Selected" : "Select"}
                      >
                        {supplier.selected_by_admin && <Check className="h-4 w-4" />}
                      </Button>
                    )}
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Select
                        value={supplier.supplier_id}
                        onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        value={supplier.qty || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-8 text-xs"
                        disabled={isReadOnly}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Unit Price"
                        value={supplier.unit_cost || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-8 text-xs"
                        disabled={isReadOnly}
                      />
                      <div className="text-xs font-semibold flex items-center">
                        Subtotal: {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSupplier(globalIndex)}
                        className="h-8 w-8 p-0 text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="bg-muted/30 p-2 rounded flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Markup %:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.markup_percentage || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'markup_percentage', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="h-7 w-16 text-xs"
                      disabled={isReadOnly}
                    />
                    <span className="text-muted-foreground">AED:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.markup_amount || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'markup_amount', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="h-7 w-20 text-xs"
                      disabled={isReadOnly}
                    />
                    <div className="ml-auto font-bold text-success">
                      Quoted: {supplier.quoted_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>

          {/* Misc Suppliers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-primary">Misc Suppliers</h4>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addSupplier('misc')}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {miscSuppliers.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2 text-center">No misc suppliers</p>
              )}
              {miscSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            const subtotal = supplier.unit_cost * supplier.qty;
            return (
              <div
                key={globalIndex}
                className={`p-2 rounded border ${
                  supplier.selected_by_admin 
                    ? 'bg-success/10 border-success' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant={supplier.selected_by_admin ? "default" : "outline"}
                        onClick={() => toggleSelection(globalIndex)}
                        className="h-8 w-8 p-0 shrink-0"
                        title={supplier.selected_by_admin ? "Selected" : "Select"}
                      >
                        {supplier.selected_by_admin && <Check className="h-4 w-4" />}
                      </Button>
                    )}
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Select
                        value={supplier.supplier_id}
                        onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        value={supplier.qty || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-8 text-xs"
                        disabled={isReadOnly}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Unit Price"
                        value={supplier.unit_cost || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-8 text-xs"
                        disabled={isReadOnly}
                      />
                      <div className="text-xs font-semibold flex items-center">
                        Subtotal: {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSupplier(globalIndex)}
                        className="h-8 w-8 p-0 text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder="Description..."
                    value={supplier.description || ""}
                    onChange={(e) => updateSupplier(globalIndex, 'description', e.target.value)}
                    className="min-h-[50px] text-xs"
                    disabled={isReadOnly}
                  />
                  <div className="bg-muted/30 p-2 rounded flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Markup %:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.markup_percentage || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'markup_percentage', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="h-7 w-16 text-xs"
                      disabled={isReadOnly}
                    />
                    <span className="text-muted-foreground">AED:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.markup_amount || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'markup_amount', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="h-7 w-20 text-xs"
                      disabled={isReadOnly}
                    />
                    <div className="ml-auto font-bold text-success">
                      Quoted: {supplier.quoted_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>
      </div>
    </div>
  );
};
