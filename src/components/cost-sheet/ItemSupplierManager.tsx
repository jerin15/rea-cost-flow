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
  unit_cost: number; // Per-unit cost (uses product qty)
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
  markup_on: 'unit' | 'total'; // Whether markup applies to unit cost or total cost
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
        markup_on: 'total',
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
      description: "",
    };
    if (!updated[productSupplierIndex].misc_suppliers) {
      updated[productSupplierIndex].misc_suppliers = [];
    }
    updated[productSupplierIndex].misc_suppliers!.push(newMisc);
    // Recalculate
    recalculateSupplier(updated, productSupplierIndex);
    onSuppliersChange(updated);
  };

  const removeMiscSupplier = (productSupplierIndex: number, miscIndex: number) => {
    const updated = [...supplierOptions];
    updated[productSupplierIndex].misc_suppliers?.splice(miscIndex, 1);
    // Recalculate after removal
    recalculateSupplier(updated, productSupplierIndex);
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
    const qty = supplier.qty || 1;
    const markupOn = supplier.markup_on || 'total';
    
    const productUnitCost = supplier.unit_cost;
    const miscUnitCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + misc.unit_cost, 0);
    const combinedUnitCost = productUnitCost + miscUnitCost;
    const subtotal = combinedUnitCost * qty;
    
    // Base for markup depends on markup_on setting
    const markupBase = markupOn === 'unit' ? combinedUnitCost : subtotal;
    
    if (supplier.markup_percentage > 0) {
      supplier.markup_amount = markupBase * (supplier.markup_percentage / 100);
      supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
    } else if (supplier.markup_amount > 0) {
      supplier.markup_percentage = markupBase > 0 ? (supplier.markup_amount / markupBase) * 100 : 0;
      supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
    } else {
      supplier.quoted_price = subtotal;
    }
  };

  const updateSupplier = (index: number, field: keyof ItemSupplierOption, value: any) => {
    const updated = [...supplierOptions];
    const supplier = { ...updated[index], [field]: value };
    const qty = supplier.qty || 1;
    const markupOn = supplier.markup_on || 'total';
    
    const productUnitCost = supplier.unit_cost;
    const miscUnitCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + misc.unit_cost, 0);
    const combinedUnitCost = productUnitCost + miscUnitCost;
    const subtotal = combinedUnitCost * qty;
    
    // Base for markup depends on markup_on setting
    const markupBase = markupOn === 'unit' ? combinedUnitCost : subtotal;
    
    if (field === 'markup_on') {
      // Switched markup basis - recalculate using existing markup percentage
      if (supplier.markup_percentage > 0) {
        supplier.markup_amount = markupBase * (supplier.markup_percentage / 100);
        supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
      }
    } else if (field === 'markup_percentage') {
      const markupPct = parseFloat(value) || 0;
      supplier.markup_percentage = markupPct;
      supplier.markup_amount = markupBase * (markupPct / 100);
      supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
    } else if (field === 'markup_amount') {
      const markupAmt = parseFloat(value) || 0;
      supplier.markup_amount = markupAmt;
      supplier.markup_percentage = markupBase > 0 ? (markupAmt / markupBase) * 100 : 0;
      supplier.quoted_price = subtotal + (markupOn === 'unit' ? markupAmt * qty : markupAmt);
    } else if (field === 'quoted_price') {
      const quotedPrice = parseFloat(value) || 0;
      supplier.quoted_price = quotedPrice;
      const totalMarkup = quotedPrice - subtotal;
      // Derive markup_amount based on basis
      supplier.markup_amount = markupOn === 'unit' ? (qty > 0 ? totalMarkup / qty : 0) : totalMarkup;
      const base = markupOn === 'unit' ? combinedUnitCost : subtotal;
      supplier.markup_percentage = base > 0 ? (supplier.markup_amount / base) * 100 : 0;
    } else if (field === 'unit_cost' || field === 'qty') {
      if (supplier.markup_percentage > 0) {
        supplier.markup_amount = markupBase * (supplier.markup_percentage / 100);
        supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
      } else if (supplier.markup_amount > 0) {
        supplier.markup_percentage = markupBase > 0 ? (supplier.markup_amount / markupBase) * 100 : 0;
        supplier.quoted_price = subtotal + (markupOn === 'unit' ? supplier.markup_amount * qty : supplier.markup_amount);
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
          <div className="space-y-3">
            {productSuppliers.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2 text-center">No suppliers added</p>
            )}
            {productSuppliers.map((supplier, idx) => {
              const globalIndex = supplierOptions.findIndex(s => s === supplier);
              const qty = supplier.qty || 1;
              const productUnitCost = supplier.unit_cost;
              const miscUnitCost = (supplier.misc_suppliers || []).reduce((sum, misc) => sum + misc.unit_cost, 0);
              const combinedUnitCost = productUnitCost + miscUnitCost;
              const subtotal = combinedUnitCost * qty;
              const clientUnitCost = qty > 0 ? supplier.quoted_price / qty : 0;
              
              return (
                <div
                  key={globalIndex}
                  className={`p-3 rounded-lg border ${
                    supplier.selected_by_admin 
                      ? 'bg-success/10 border-success' 
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Product Supplier Row */}
                    <div className="flex gap-2 items-start">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant={supplier.selected_by_admin ? "default" : "outline"}
                          onClick={() => toggleSelection(globalIndex)}
                          className="h-8 w-8 p-0 shrink-0 mt-1"
                          title={supplier.selected_by_admin ? "Selected" : "Select"}
                        >
                          {supplier.selected_by_admin && <Check className="h-4 w-4" />}
                        </Button>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Supplier</Label>
                            <Select
                              value={supplier.supplier_id}
                              onValueChange={(value) => updateSupplier(globalIndex, 'supplier_id', value)}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Supplier" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {suppliers.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Qty</Label>
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              placeholder="Qty"
                              value={supplier.qty || ""}
                              onChange={(e) => updateSupplier(globalIndex, 'qty', e.target.value ? parseFloat(e.target.value) : "")}
                              className="h-9 text-sm"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Supplier Unit Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Unit Cost"
                              value={supplier.unit_cost || ""}
                              onChange={(e) => updateSupplier(globalIndex, 'unit_cost', e.target.value ? parseFloat(e.target.value) : "")}
                              className="h-9 text-sm"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Total</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Total"
                              value={(productUnitCost * qty) || ""}
                              onChange={(e) => {
                                const total = parseFloat(e.target.value) || 0;
                                const newUnitCost = qty > 0 ? total / qty : 0;
                                updateSupplier(globalIndex, 'unit_cost', newUnitCost);
                              }}
                              className="h-9 text-sm"
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        
                        {/* Product Description */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Textarea
                            placeholder="Product details, color, size, branding, etc."
                            value={supplier.description || ""}
                            onChange={(e) => updateSupplier(globalIndex, 'description', e.target.value)}
                            className="min-h-[50px] text-sm resize-none"
                            disabled={isReadOnly}
                          />
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
                    <div className="ml-0 space-y-2 bg-muted/30 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Misc Costs (Printing, etc.) - per unit, Optional</span>
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
                        <p className="text-xs text-muted-foreground italic text-center py-1">No misc costs</p>
                      )}
                      {(supplier.misc_suppliers || []).map((misc, miscIdx) => (
                        <div key={miscIdx} className="space-y-2 p-2 bg-background/50 rounded border border-border/50">
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Misc Supplier</Label>
                                <Select
                                  value={misc.supplier_id}
                                  onValueChange={(value) => updateMiscSupplier(globalIndex, miscIdx, 'supplier_id', value)}
                                  disabled={isReadOnly}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Supplier" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    {suppliers.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Cost/unit"
                                  value={misc.unit_cost || ""}
                                  onChange={(e) => updateMiscSupplier(globalIndex, miscIdx, 'unit_cost', e.target.value ? parseFloat(e.target.value) : 0)}
                                  className="h-8 text-xs"
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Total (×{qty})</Label>
                                <div className="h-8 flex items-center px-2 bg-muted/50 rounded text-xs font-medium">
                                  {(misc.unit_cost * qty).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            {!isReadOnly && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMiscSupplier(globalIndex, miscIdx)}
                                className="h-8 w-8 p-0 text-destructive shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {/* Misc Description */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Misc Description</Label>
                            <Textarea
                              placeholder="Printing type, color printing, etc."
                              value={misc.description || ""}
                              onChange={(e) => updateMiscSupplier(globalIndex, miscIdx, 'description', e.target.value)}
                              className="min-h-[60px] text-xs resize-none"
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                      ))}
                      {miscUnitCost > 0 && (
                        <div className="text-xs font-semibold text-right text-muted-foreground pt-1">
                          Misc Total: {(miscUnitCost * qty).toFixed(2)} ({miscUnitCost.toFixed(2)}/unit × {qty})
                        </div>
                      )}
                    </div>

                    {/* Subtotal and Pricing */}
                    <div className="bg-primary/5 p-3 rounded space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Combined Unit Cost:</span>
                          <span className="ml-2 font-semibold">{combinedUnitCost.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({productUnitCost.toFixed(2)} + {miscUnitCost.toFixed(2)})</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Cost:</span>
                          <span className="ml-2 font-bold text-primary">{subtotal.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({combinedUnitCost.toFixed(2)} × {qty})</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50 mb-2">
                        <Label className="text-xs text-muted-foreground">Markup on:</Label>
                        <Select
                          value={supplier.markup_on || 'total'}
                          onValueChange={(value) => updateSupplier(globalIndex, 'markup_on', value)}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="unit">Unit Cost</SelectItem>
                            <SelectItem value="total">Total Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                          (Base: {(supplier.markup_on === 'unit' ? combinedUnitCost : subtotal).toFixed(2)})
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 items-end">
                        <div>
                          <Label className="text-xs text-muted-foreground">Markup %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={supplier.markup_percentage || ""}
                            onChange={(e) => updateSupplier(globalIndex, 'markup_percentage', e.target.value)}
                            className="h-9 text-sm"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Markup AED{supplier.markup_on === 'unit' ? ' /unit' : ''}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={supplier.markup_amount || ""}
                            onChange={(e) => updateSupplier(globalIndex, 'markup_amount', e.target.value)}
                            className="h-9 text-sm"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Quoted Total</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={supplier.quoted_price || ""}
                            onChange={(e) => updateSupplier(globalIndex, 'quoted_price', e.target.value)}
                            className="h-9 text-sm font-bold"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Client Unit Cost</Label>
                          <div className="h-9 flex items-center px-2 bg-success/20 rounded text-sm font-bold text-success">
                            {clientUnitCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        Margin: AED {(supplier.quoted_price - subtotal).toFixed(2)} ({supplier.quoted_price > 0 ? (((supplier.quoted_price - subtotal) / supplier.quoted_price) * 100).toFixed(1) : 0}%)
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