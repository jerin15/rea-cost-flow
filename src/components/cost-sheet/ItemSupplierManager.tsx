import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      qty: 1,
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
    <div className="space-y-4">
      {/* Product Suppliers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Product Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('product')}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Product Supplier
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {productSuppliers.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No product suppliers added yet</p>
          )}
          {productSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            return (
              <div
                key={globalIndex}
                className={`p-3 rounded-lg border ${
                  supplier.selected_by_admin ? 'bg-success/5 border-success' : 'bg-muted/30'
                }`}
              >
                <div className="grid grid-cols-12 gap-2 items-start">
                  {isAdmin && (
                    <div className="col-span-1 flex items-center justify-center pt-2">
                      <Button
                        size="sm"
                        variant={supplier.selected_by_admin ? "default" : "outline"}
                        onClick={() => toggleSelection(globalIndex)}
                        className="h-8 w-8 p-0"
                        title={supplier.selected_by_admin ? "Selected for quotation" : "Click to select"}
                      >
                        {supplier.selected_by_admin && <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  <div className={isAdmin ? "col-span-4" : "col-span-5"}>
                    <Select
                      value={supplier.supplier_id}
                      onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-8">
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
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={supplier.qty}
                      onChange={(e) => updateSupplier(globalIndex, 'qty', parseFloat(e.target.value) || 0)}
                      className="h-8"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Unit Cost"
                      value={supplier.unit_cost}
                      onChange={(e) => updateSupplier(globalIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="h-8"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className={isAdmin ? "col-span-1" : "col-span-2"}>
                    <div className="text-sm font-semibold text-right pt-1">
                      AED {(supplier.unit_cost * supplier.qty).toLocaleString()}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="col-span-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSupplier(globalIndex)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Misc Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('misc')}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Misc Supplier
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {miscSuppliers.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No misc suppliers added yet</p>
          )}
          {miscSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            return (
              <div
                key={globalIndex}
                className={`p-3 rounded-lg border ${
                  supplier.selected_by_admin ? 'bg-success/5 border-success' : 'bg-muted/30'
                }`}
              >
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    {isAdmin && (
                      <div className="col-span-1 flex items-center justify-center pt-2">
                        <Button
                          size="sm"
                          variant={supplier.selected_by_admin ? "default" : "outline"}
                          onClick={() => toggleSelection(globalIndex)}
                          className="h-8 w-8 p-0"
                          title={supplier.selected_by_admin ? "Selected for quotation" : "Click to select"}
                        >
                          {supplier.selected_by_admin && <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                    <div className={isAdmin ? "col-span-4" : "col-span-5"}>
                      <Select
                        value={supplier.supplier_id}
                        onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-8">
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
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={supplier.qty}
                        onChange={(e) => updateSupplier(globalIndex, 'qty', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Unit Cost"
                        value={supplier.unit_cost}
                        onChange={(e) => updateSupplier(globalIndex, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className={isAdmin ? "col-span-1" : "col-span-2"}>
                      <div className="text-sm font-semibold text-right pt-1">
                        AED {(supplier.unit_cost * supplier.qty).toLocaleString()}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <div className="col-span-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSupplier(globalIndex)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Textarea
                    placeholder="Misc description..."
                    value={supplier.description || ""}
                    onChange={(e) => updateSupplier(globalIndex, 'description', e.target.value)}
                    className="min-h-[60px] text-sm"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
