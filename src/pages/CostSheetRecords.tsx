import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SupplierRecord {
  id: string;
  item_number: number;
  date: string;
  item_description: string;
  client_name: string;
  supplier_name: string;
  qty: number;
  unit_cost: number;
  misc_unit_cost: number;
  supplier_unit_cost: number;
  total_cost: number;
  markup_percentage: number;
  markup_amount: number;
  quoted_price: number;
  client_unit_cost: number;
  margin_percentage: number;
  approval_status: string;
  created_at: string;
  revision_number: number;
}

const CostSheetRecords = () => {
  const [records, setRecords] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("cost_sheet_item_suppliers")
      .select(`
        *,
        suppliers(name),
        cost_sheet_items!inner(
          item_number, date, item, approval_status, created_at,
          cost_sheets!inner(client_id, quotation_no, clients(name))
        )
      `)
      .eq("supplier_type", "product")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching records:", error);
      setLoading(false);
      return;
    }

    if (!data) {
      setLoading(false);
      return;
    }

    const productIds = data.map(d => d.id);
    let miscData: any[] = [];
    if (productIds.length > 0) {
      const { data: misc } = await supabase
        .from("cost_sheet_item_suppliers")
        .select("*, suppliers(name)")
        .in("parent_supplier_id", productIds);
      miscData = misc || [];
    }

    const mapped: SupplierRecord[] = data.map(row => {
      const rawItem = row.cost_sheet_items as any;
      const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
      if (!item) return null;

      const rawSheet = item.cost_sheets;
      const sheet = Array.isArray(rawSheet) ? rawSheet[0] : rawSheet;

      const qty = Number(row.qty) || 1;
      const productUnitCost = Number(row.unit_cost) || 0;

      const relatedMisc = miscData.filter(m => m.parent_supplier_id === row.id);
      const miscUnitCost = relatedMisc.reduce((sum: number, m: any) => sum + (Number(m.unit_cost) || 0), 0);

      const supplierUnitCost = productUnitCost + miscUnitCost;
      const totalCost = supplierUnitCost * qty;
      const quotedPrice = Number(row.quoted_price) || 0;
      const markupPercentage = Number(row.markup_percentage) || 0;
      const markupAmount = quotedPrice - totalCost;
      const clientUnitCost = qty > 0 ? quotedPrice / qty : 0;
      const marginPercentage = quotedPrice > 0 ? ((quotedPrice - totalCost) / quotedPrice) * 100 : 0;

      return {
        id: row.id,
        item_number: item.item_number ?? 0,
        date: item.date || new Date().toISOString(),
        item_description: item.item || "",
        client_name: sheet?.clients?.name || "N/A",
        supplier_name: row.suppliers?.name || "N/A",
        qty,
        unit_cost: productUnitCost,
        misc_unit_cost: miscUnitCost,
        supplier_unit_cost: supplierUnitCost,
        total_cost: totalCost,
        markup_percentage: markupPercentage,
        markup_amount: markupAmount,
        quoted_price: quotedPrice,
        client_unit_cost: clientUnitCost,
        margin_percentage: marginPercentage,
        approval_status: row.approval_status || item.approval_status || "pending",
        created_at: item.created_at || row.created_at,
        revision_number: row.revision_number || 1,
      };
    }).filter(Boolean) as SupplierRecord[];

    setRecords(mapped);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved_both":
        return <Badge className="bg-success/20 text-success-foreground">Approved</Badge>;
      case "approved_admin_a":
        return <Badge className="bg-warning/20 text-warning-foreground">Admin A Approved</Badge>;
      case "approved_admin_b":
        return <Badge className="bg-warning/20 text-warning-foreground">Admin B Approved</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const groupedByClient = useMemo(() => {
    let filtered = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = records.filter(r =>
        r.client_name.toLowerCase().includes(q) ||
        r.item_description.toLowerCase().includes(q) ||
        r.supplier_name.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        r.quoted_price.toString().includes(q) ||
        r.supplier_unit_cost.toString().includes(q) ||
        r.approval_status.toLowerCase().includes(q)
      );
    }

    const groups: Record<string, SupplierRecord[]> = {};
    filtered.forEach(r => {
      if (!groups[r.client_name]) groups[r.client_name] = [];
      groups[r.client_name].push(r);
    });

    // Sort items within each group
    Object.values(groups).forEach(items => {
      items.sort((a, b) => a.item_number - b.item_number || a.supplier_name.localeCompare(b.supplier_name));
    });

    // Sort groups by client name
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [records, searchQuery]);

  const totalEntries = groupedByClient.reduce((sum, [, items]) => sum + items.length, 0);

  const toggleClient = (clientName: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedClients(new Set(groupedByClient.map(([name]) => name)));
  };

  const collapseAll = () => {
    setExpandedClients(new Set());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">📊 Cost Sheet Records</CardTitle>
            <CardDescription>Click on a client to expand and view their cost sheet items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, item, supplier, price..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-xs text-primary hover:underline">Expand All</button>
                <span className="text-muted-foreground">|</span>
                <button onClick={collapseAll} className="text-xs text-primary hover:underline">Collapse All</button>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-xl font-bold">{groupedByClient.length}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Entries</p>
                <p className="text-xl font-bold">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : groupedByClient.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {searchQuery ? "No matching records found" : "No cost sheet items found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedByClient.map(([clientName, items]) => {
              const isOpen = expandedClients.has(clientName);
              const totalQuoted = items.reduce((s, r) => s + r.quoted_price, 0);
              return (
                <Collapsible key={clientName} open={isOpen} onOpenChange={() => toggleClient(clientName)}>
                  <Card>
                    <CollapsibleTrigger className="w-full text-left">
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors rounded-t-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-lg">{clientName}</span>
                          <Badge variant="secondary" className="ml-2">{items.length} items</Badge>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Total Quoted: <span className="text-foreground font-bold">AED {totalQuoted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <ScrollArea className="w-full">
                          <div className="min-w-[1400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead className="w-28">Date</TableHead>
                                  <TableHead className="min-w-[180px]">Item</TableHead>
                                  <TableHead className="w-36">Supplier</TableHead>
                                  <TableHead className="w-16">Qty</TableHead>
                                  <TableHead className="w-28">Unit Cost</TableHead>
                                  <TableHead className="w-28">Total Cost</TableHead>
                                  <TableHead className="w-28">Client Unit</TableHead>
                                  <TableHead className="w-20">Markup %</TableHead>
                                  <TableHead className="w-28">Markup</TableHead>
                                  <TableHead className="w-28">Quoted</TableHead>
                                  <TableHead className="w-20">Margin %</TableHead>
                                  <TableHead className="w-28">Status</TableHead>
                                  <TableHead className="w-16">Rev</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-medium">{record.item_number}</TableCell>
                                    <TableCell className="whitespace-nowrap">{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{record.item_description}</TableCell>
                                    <TableCell>{record.supplier_name}</TableCell>
                                    <TableCell>{record.qty}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      AED {record.supplier_unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      AED {record.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-primary font-semibold">
                                      AED {record.client_unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>{record.markup_percentage.toFixed(2)}%</TableCell>
                                    <TableCell className="text-primary">
                                      AED {record.markup_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="font-bold text-success">
                                      AED {record.quoted_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-success">{record.margin_percentage.toFixed(2)}%</TableCell>
                                    <TableCell>{getStatusBadge(record.approval_status)}</TableCell>
                                    <TableCell>
                                      {record.revision_number > 1 ? (
                                        <Badge className="bg-accent text-accent-foreground">Rev {record.revision_number}</Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Original</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CostSheetRecords;
