import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
}

interface ClientSelectorProps {
  selectedClient: string | null;
  onClientSelect: (clientId: string) => void;
}

export const ClientSelector = ({ selectedClient, onClientSelect }: ClientSelectorProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load clients");
      return;
    }

    setClients(data || []);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClientName.trim()) {
      toast.error("Client name cannot be empty");
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("clients")
      .insert([{ name: newClientName.trim(), created_by: userData.user?.id }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A client with this name already exists");
      } else {
        toast.error("Failed to create client");
      }
      return;
    }

    toast.success("Client created successfully");
    setNewClientName("");
    setDialogOpen(false);
    fetchClients();
    
    if (data) {
      onClientSelect(data.id);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <Label htmlFor="client-select" className="mb-2 block">Select Client</Label>
        <Select value={selectedClient || ""} onValueChange={onClientSelect}>
          <SelectTrigger id="client-select" className="w-full">
            <SelectValue placeholder="Choose a client..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-8">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
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
  );
};
