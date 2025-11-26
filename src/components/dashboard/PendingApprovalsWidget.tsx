import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, FileText } from "lucide-react";
import { format } from "date-fns";

interface PendingCostSheet {
  id: string;
  client_name: string;
  submitted_at: string;
  status: string;
  items_count: number;
}

export const PendingApprovalsWidget = () => {
  const [pendingSheets, setPendingSheets] = useState<PendingCostSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_sheets')
        .select(`
          id,
          submitted_at,
          status,
          clients (name),
          cost_sheet_items (count)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = data?.map(sheet => ({
        id: sheet.id,
        client_name: sheet.clients?.name || 'Unknown Client',
        submitted_at: sheet.submitted_at || '',
        status: sheet.status,
        items_count: sheet.cost_sheet_items?.length || 0
      })) || [];

      setPendingSheets(formatted);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals
        </CardTitle>
        <CardDescription>Cost sheets waiting for your approval</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingSheets.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No pending approvals</p>
        ) : (
          <div className="space-y-3">
            {pendingSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{sheet.client_name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {sheet.items_count} items
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted {format(new Date(sheet.submitted_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/cost-sheet-records')}
                  className="ml-4"
                >
                  Review
                </Button>
              </div>
            ))}
            {pendingSheets.length === 5 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/cost-sheet-records')}
              >
                View All
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
