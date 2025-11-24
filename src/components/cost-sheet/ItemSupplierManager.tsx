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
  approval_status?: string;
}

interface ItemSupplierManagerProps {
  suppliers: Supplier[];
  supplierOptions: ItemSupplierOption[];
  onSuppliersChange: (suppliers: ItemSupplierOption[]) => void;
  isAdmin: boolean;
  isReadOnly: boolean;
  markupPercentage: number;
  markupAmount: number;
  onMarkupChange: (field: 'percentage' | 'amount', value: number) => void;
}

export const ItemSupplierManager = ({
  suppliers,
  supplierOptions,
  onSuppliersChange,
  isAdmin,
  isReadOnly,
  markupPercentage,
  markupAmount,
  onMarkupChange,
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
  
  // Calculate subtotals
  const productSubtotal = productSuppliers.reduce((sum, s) => sum + (s.unit_cost * s.qty), 0);
  const miscSubtotal = miscSuppliers.reduce((sum, s) => sum + (s.unit_cost * s.qty), 0);
  const totalSubtotal = productSubtotal + miscSubtotal;
  
  // Calculate quoted price
  const quotedPrice = totalSubtotal + markupAmount;

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
            return (
                <div
                key={globalIndex}
                className={`p-2 rounded border ${
                  supplier.selected_by_admin 
                    ? 'bg-success/10 border-success' 
                    : 'bg-background border-border'
                }`}
              >
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
                      {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              </div>
            );
          })}
          {productSuppliers.length > 0 && (
            <div className="flex justify-end text-sm font-semibold text-primary pt-1">
              Product Subtotal: AED {productSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
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
                        {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                </div>
              </div>
            );
          })}
          {miscSuppliers.length > 0 && (
            <div className="flex justify-end text-sm font-semibold text-primary pt-1">
              Misc Subtotal: AED {miscSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="pt-2 border-t">
            <div className="bg-primary/5 p-2 rounded flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Total:</span>
                <span className="font-bold text-primary">AED {totalSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="h-4 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Markup %:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={markupPercentage || ""}
                  onChange={(e) => onMarkupChange('percentage', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="h-7 w-16 text-xs"
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Markup AED:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={markupAmount || ""}
                  onChange={(e) => onMarkupChange('amount', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="h-7 w-20 text-xs"
                  disabled={isReadOnly}
                />
              </div>
              <div className="h-4 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Quoted:</span>
                <span className="font-bold text-success">AED {quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
