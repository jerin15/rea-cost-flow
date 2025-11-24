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

export interface MiscSupplierOption {
  id?: string;
  supplier_id: string;
  supplier_name?: string;
  unit_cost: number;
  qty: number;
  description?: string;
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
  misc_suppliers?: MiscSupplierOption[];
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
    if (type === 'product') {
      const newSupplier: ItemSupplierOption = {
        supplier_id: suppliers[0]?.id || "",
        supplier_type: 'product',
        unit_cost: 0,
        qty: 1,
        description: "",
        selected_by_admin: false,
        markup_percentage: 0,
        markup_amount: 0,
        quoted_price: 0,
        misc_suppliers: [],
      };
      onSuppliersChange([...supplierOptions, newSupplier]);
    }
  };

  const addMiscSupplier = (productSupplierIndex: number) => {
    const updated = [...supplierOptions];
    const newMisc: MiscSupplierOption = {
      supplier_id: suppliers[0]?.id || "",
      unit_cost: 0,
      qty: 1,
      description: "",
    };
    if (!updated[productSupplierIndex].misc_suppliers) {
      updated[productSupplierIndex].misc_suppliers = [];
    }
    updated[productSupplierIndex].misc_suppliers!.push(newMisc);
    onSuppliersChange(updated);
  };

  const removeMiscSupplier = (productSupplierIndex: number, miscIndex: number) => {
    const updated = [...supplierOptions];
    updated[productSupplierIndex].misc_suppliers?.splice(miscIndex, 1);
    onSuppliersChange(updated);
  };

  const updateMiscSupplier = (productSupplierIndex: number, miscIndex: number, field: keyof MiscSupplierOption, value: any) => {
    const updated = [...supplierOptions];
    const misc = updated[productSupplierIndex].misc_suppliers![miscIndex];
    updated[productSupplierIndex].misc_suppliers![miscIndex] = { ...misc, [field]: value };
    
    // Recalculate product supplier subtotal and pricing
    recalculateSupplier(updated, productSupplierIndex);
    onSuppliersChange(updated);
  };

  const recalculateSupplier = (updated: ItemSupplierOption[], index: number) => {
    const supplier = updated[index];
    
    // Calculate subtotal: product cost + all misc costs
    const productCost = supplier.unit_cost * supplier.qty;
    const miscCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + (misc.unit_cost * misc.qty), 0);
    const subtotal = productCost + miscCost;
    
    // Recalculate quoted price based on existing markup
    if (supplier.markup_percentage > 0) {
      supplier.markup_amount = subtotal * (supplier.markup_percentage / 100);
      supplier.quoted_price = subtotal + supplier.markup_amount;
    } else if (supplier.markup_amount > 0) {
      supplier.markup_percentage = subtotal > 0 ? (supplier.markup_amount / subtotal) * 100 : 0;
      supplier.quoted_price = subtotal + supplier.markup_amount;
    } else {
      supplier.quoted_price = subtotal;
    }
  };

  const updateSupplier = (index: number, field: keyof ItemSupplierOption, value: any) => {
    const updated = [...supplierOptions];
    const supplier = { ...updated[index], [field]: value };
    
    // Calculate subtotal for this supplier (product + misc)
    const productCost = supplier.unit_cost * supplier.qty;
    const miscCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + (misc.unit_cost * misc.qty), 0);
    const subtotal = productCost + miscCost;
    
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

  return (
    <div className="w-full bg-muted/20 rounded-lg border p-3">
      <div className="space-y-4">
          {/* Product Suppliers */}
          <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">Suppliers</h4>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addSupplier('product')}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Supplier
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {productSuppliers.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2 text-center">No suppliers added</p>
          )}
          {productSuppliers.map((supplier, idx) => {
            const globalIndex = supplierOptions.findIndex(s => s === supplier);
            const productCost = supplier.unit_cost * supplier.qty;
            const miscCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + (misc.unit_cost * misc.qty), 0);
            const subtotal = productCost + miscCost;
            
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
                  {/* Product Supplier Row */}
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
                        Product: {productCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  
                  {/* Misc Suppliers Section */}
                  <div className="ml-10 space-y-2 bg-muted/30 p-2 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Misc Items (Optional)</span>
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addMiscSupplier(globalIndex)}
                          className="h-6 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Misc
                        </Button>
                      )}
                    </div>
                    {(supplier.misc_suppliers || []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-1">No misc items</p>
                    )}
                    {(supplier.misc_suppliers || []).map((misc, miscIdx) => (
                      <div key={miscIdx} className="flex gap-2 items-center">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <Select
                            value={misc.supplier_id}
                            onValueChange={(value) => updateMiscSupplier(globalIndex, miscIdx, 'supplier_id', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className="h-7 text-xs">
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
                            value={misc.qty || ""}
                            onChange={(e) => updateMiscSupplier(globalIndex, miscIdx, 'qty', e.target.value ? parseFloat(e.target.value) : 0)}
                            className="h-7 text-xs"
                            disabled={isReadOnly}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Unit Price"
                            value={misc.unit_cost || ""}
                            onChange={(e) => updateMiscSupplier(globalIndex, miscIdx, 'unit_cost', e.target.value ? parseFloat(e.target.value) : 0)}
                            className="h-7 text-xs"
                            disabled={isReadOnly}
                          />
                          <div className="text-xs flex items-center">
                            {((misc.unit_cost || 0) * (misc.qty || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMiscSupplier(globalIndex, miscIdx)}
                            className="h-7 w-7 p-0 text-destructive shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {miscCost > 0 && (
                      <div className="text-xs font-semibold text-right text-muted-foreground pt-1">
                        Misc Total: {miscCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  {/* Subtotal and Pricing */}
                  <div className="bg-primary/5 p-2 rounded space-y-2">
                    <div className="text-xs font-bold text-primary">
                      Subtotal: AED {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
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
              </div>
            );
          })}
            </div>
          </div>
      </div>
    </div>
  );
};
