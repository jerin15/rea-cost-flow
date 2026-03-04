import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Client {
  id: string;
  name: string;
  created_at: string;
}

interface ClientMasterListProps {
  onClientSelect?: (clientId: string) => void;
  selectedClient?: string | null;
}

export const ClientMasterList = ({ onClientSelect, selectedClient }: ClientMasterListProps) => {
  const { userRole } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, created_at")
      .order("name");

    if (!error && data) setClients(data);
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q));
  }, [clients, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return toast.error("Client name cannot be empty");

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("clients")
      .insert([{ name: newClientName.trim(), created_by: userData.user?.id }])
      .select()
      .single();

    setLoading(false);
    if (error) {
      toast.error(error.code === "23505" ? "Client already exists" : "Failed to create client");
      return;
    }

    toast.success("Client created");
    setNewClientName("");
    setDialogOpen(false);
    fetchClients();
    if (data && onClientSelect) onClientSelect(data.id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This will also delete all related cost sheets.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error("Failed to delete client");
    toast.success("Client deleted");
    if (selectedClient === id && onClientSelect) onClientSelect("");
    fetchClients();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Clients ({clients.length})
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Client"}
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
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <ScrollArea className="h-[250px]">
          <div className="space-y-1">
            {filteredClients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "No matching clients" : "No clients yet"}
              </p>
            )}
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedClient === client.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onClientSelect?.(client.id)}
              >
                <span className="text-sm font-medium truncate">{client.name}</span>
                {(userRole === "estimator" || userRole === "admin") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client.id, client.name);
                    }}
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
