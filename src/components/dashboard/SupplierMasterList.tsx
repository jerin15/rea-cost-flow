import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Supplier {
  id: string;
  name: string;
  created_at: string;
}

export const SupplierMasterList = () => {
  const { userRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, created_at")
      .order("name");

    if (!error && data) setSuppliers(data);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return toast.error("Supplier name cannot be empty");

    setLoading(true);
    // Suppliers need a client_id - we'll use a placeholder approach
    // Since suppliers are global, we need any valid client_id
    const { data: firstClient } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (!firstClient) {
      toast.error("Please create a client first before adding suppliers");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("suppliers")
      .insert([{ name: newSupplierName.trim(), client_id: firstClient.id }]);

    setLoading(false);
    if (error) {
      toast.error("Failed to create supplier");
      return;
    }

    toast.success("Supplier created");
    setNewSupplierName("");
    setDialogOpen(false);
    fetchSuppliers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error("Failed to delete supplier");
    toast.success("Supplier deleted");
    fetchSuppliers();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Suppliers ({suppliers.length})
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Supplier"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <ScrollArea className="h-[250px]">
          <div className="space-y-1">
            {filteredSuppliers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "No matching suppliers" : "No suppliers yet"}
              </p>
            )}
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium truncate">{supplier.name}</span>
                {(userRole === "estimator" || userRole === "admin") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive shrink-0"
                    onClick={() => handleDelete(supplier.id, supplier.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
