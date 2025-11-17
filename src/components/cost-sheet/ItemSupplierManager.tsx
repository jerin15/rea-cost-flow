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
      qty: type === 'product' ? 1 : 1,
      description: "",
      selected_by_admin: false,
    };
    onSuppliersChange([...supplierOptions, newSupplier]);
  };

  const updateSupplier = (index: number, field: keyof ItemSupplierOption, value: any) => {
    const updated = [...supplierOptions];
    updated[index] = { ...updated[index], [field]: value };
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
    <div className="space-y-6 p-4 bg-muted/20 rounded-lg border">
      {/* Product Suppliers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">Product Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('product')}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Product Supplier
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {productSuppliers.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No product suppliers added yet</p>
          )}
          {productSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            return (
              <div
                key={globalIndex}
                className={`p-4 rounded-lg border-2 ${
                  supplier.selected_by_admin 
                    ? 'bg-success/10 border-success shadow-sm' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="grid grid-cols-12 gap-3 items-start">
                  {isAdmin && (
                    <div className="col-span-1 flex items-center justify-center pt-3">
                      <Button
                        size="sm"
                        variant={supplier.selected_by_admin ? "default" : "outline"}
                        onClick={() => toggleSelection(globalIndex)}
                        className="h-10 w-10 p-0"
                        title={supplier.selected_by_admin ? "Selected for quotation" : "Click to select"}
                      >
                        {supplier.selected_by_admin && <Check className="h-5 w-5" />}
                      </Button>
                    </div>
                  )}
                  <div className={isAdmin ? "col-span-3" : "col-span-3"}>
                    <Label className="text-xs text-muted-foreground mb-1 block">Supplier</Label>
                    <Select
                      value={supplier.supplier_id}
                      onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={isAdmin ? "col-span-2" : "col-span-3"}>
                    <Label className="text-xs text-muted-foreground mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.qty || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                      className="h-10 text-base min-w-[100px]"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className={isAdmin ? "col-span-3" : "col-span-3"}>
                    <Label className="text-xs text-muted-foreground mb-1 block">Unit Price (AED)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={supplier.unit_cost || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                      className="h-10 text-base min-w-[120px]"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <Label className="text-xs text-muted-foreground mb-1 block">Total</Label>
                    <div className="text-base font-bold text-right pt-2">
                      AED {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="col-span-1 flex justify-end pt-7">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSupplier(globalIndex)}
                        className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Misc Suppliers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">Misc Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('misc')}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Misc Supplier
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {miscSuppliers.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No misc suppliers added yet</p>
          )}
          {miscSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            return (
              <div
                key={globalIndex}
                className={`p-4 rounded-lg border-2 ${
                  supplier.selected_by_admin 
                    ? 'bg-success/10 border-success shadow-sm' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    {isAdmin && (
                      <div className="col-span-1 flex items-center justify-center pt-3">
                        <Button
                          size="sm"
                          variant={supplier.selected_by_admin ? "default" : "outline"}
                          onClick={() => toggleSelection(globalIndex)}
                          className="h-10 w-10 p-0"
                          title={supplier.selected_by_admin ? "Selected for quotation" : "Click to select"}
                        >
                          {supplier.selected_by_admin && <Check className="h-5 w-5" />}
                        </Button>
                      </div>
                    )}
                    <div className={isAdmin ? "col-span-3" : "col-span-3"}>
                      <Label className="text-xs text-muted-foreground mb-1 block">Supplier</Label>
                      <Select
                        value={supplier.supplier_id}
                        onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={isAdmin ? "col-span-2" : "col-span-3"}>
                      <Label className="text-xs text-muted-foreground mb-1 block">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={supplier.qty || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 text-base min-w-[100px]"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className={isAdmin ? "col-span-3" : "col-span-3"}>
                      <Label className="text-xs text-muted-foreground mb-1 block">Unit Price (AED)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={supplier.unit_cost || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 text-base min-w-[120px]"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                      <Label className="text-xs text-muted-foreground mb-1 block">Total</Label>
                      <div className="text-base font-bold text-right pt-2">
                        AED {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <div className="col-span-1 flex justify-end pt-7">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSupplier(globalIndex)}
                          className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                    <Textarea
                      placeholder="Enter misc details..."
                      value={supplier.description || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'description', e.target.value)}
                      className="min-h-[80px] text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
