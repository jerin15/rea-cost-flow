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
  
  // Calculate subtotal from all suppliers
  const subtotal = supplierOptions.reduce((sum, s) => sum + (s.unit_cost * s.qty), 0);
  
  // Calculate quoted price
  const quotedPrice = subtotal + markupAmount;

  return (
    <div className="w-full bg-muted/20 rounded-lg border p-4">
      <div className="space-y-6">
          {/* Product Suppliers */}
          <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-primary">Product Suppliers</h4>
            {isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">Click checkmarks to select one or multiple suppliers for quotation</p>
            )}
          </div>
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
                <div className="grid grid-cols-12 gap-4 items-start">
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
                    <Label className="text-sm font-medium mb-2 block">Supplier</Label>
                    <Select
                      value={supplier.supplier_id}
                      onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-11">
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
                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={supplier.qty || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                      className="h-11 text-base w-full"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <Label className="text-sm font-medium mb-2 block">Unit Price (AED)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={supplier.unit_cost || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                      className="h-11 text-base w-full"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <Label className="text-sm font-medium mb-2 block">Total Cost</Label>
                    <div className="text-base font-semibold text-right pt-3">
                      AED {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className={isAdmin ? "col-span-3" : "col-span-4"}>
                      <div className="flex justify-end pt-9">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSupplier(globalIndex)}
                          className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
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
            <div>
              <h4 className="text-sm font-semibold text-primary">Misc Suppliers</h4>
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">Click checkmarks to select one or multiple suppliers for quotation</p>
              )}
            </div>
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
                  <div className="grid grid-cols-12 gap-4 items-start">
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
                      <Label className="text-sm font-medium mb-2 block">Supplier</Label>
                      <Select
                        value={supplier.supplier_id}
                        onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-11">
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
                    <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                      <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={supplier.qty || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-11 text-base w-full"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                      <Label className="text-sm font-medium mb-2 block">Unit Price (AED)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={supplier.unit_cost || ""}
                        onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-11 text-base w-full"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                      <Label className="text-sm font-medium mb-2 block">Total Cost</Label>
                      <div className="text-base font-semibold text-right pt-3">
                        AED {((supplier.unit_cost || 0) * (supplier.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <div className={isAdmin ? "col-span-3" : "col-span-4"}>
                        <div className="flex justify-end pt-9">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSupplier(globalIndex)}
                            className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Description</Label>
                    <Textarea
                      placeholder="Enter misc details..."
                      value={supplier.description || ""}
                      onChange={(e) => updateSupplier(globalIndex, 'description', e.target.value)}
                      className="min-h-[80px] text-base"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          </div>

          {/* Markup Section */}
          <div className="space-y-3 pt-4 border-t-2">
            <h4 className="text-sm font-semibold text-primary">Pricing</h4>
            <div className="grid grid-cols-4 gap-4 bg-primary/5 p-4 rounded-lg">
              <div>
                <Label className="text-sm font-medium mb-2 block">Subtotal (AED)</Label>
                <div className="text-lg font-bold text-primary pt-2">
                  {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Markup %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={markupPercentage || ""}
                  onChange={(e) => onMarkupChange('percentage', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="h-11 text-base w-full"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Markup (AED)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={markupAmount || ""}
                  onChange={(e) => onMarkupChange('amount', e.target.value ? parseFloat(e.target.value) : 0)}
                  className="h-11 text-base w-full"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Quoted Price (AED)</Label>
                <div className="text-lg font-bold text-success pt-2">
                  {quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
