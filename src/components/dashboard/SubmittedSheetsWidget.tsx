import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Send, FileCheck } from "lucide-react";
import { format } from "date-fns";

interface SubmittedSheet {
  id: string;
  client_name: string;
  submitted_at: string;
  status: string;
  items_count: number;
  approved_count: number;
  pending_count: number;
}

export const SubmittedSheetsWidget = () => {
  const [submittedSheets, setSubmittedSheets] = useState<SubmittedSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmittedSheets();
  }, []);

  const fetchSubmittedSheets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cost_sheets')
        .select(`
          id,
          submitted_at,
          status,
          clients (name),
          cost_sheet_items (
            id,
            approval_status
          )
        `)
        .eq('created_by', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(sheet => {
        const items = sheet.cost_sheet_items || [];
        const approvedCount = items.filter(item => 
          item.approval_status === 'approved_both'
        ).length;
        const pendingCount = items.filter(item => 
          item.approval_status === 'pending' || 
          item.approval_status === 'approved_admin_a' || 
          item.approval_status === 'approved_admin_b'
        ).length;

        return {
          id: sheet.id,
          client_name: sheet.clients?.name || 'Unknown Client',
          submitted_at: sheet.submitted_at || '',
          status: sheet.status,
          items_count: items.length,
          approved_count: approvedCount,
          pending_count: pendingCount
        };
      }) || [];

      setSubmittedSheets(formatted);
    } catch (error) {
      console.error('Error fetching submitted sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (approved: number, pending: number, total: number) => {
    if (approved === total) return "default";
    if (pending === total) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submitted Cost Sheets
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
          <Send className="h-5 w-5" />
          Submitted Cost Sheets
        </CardTitle>
        <CardDescription>Track your submitted cost sheets approval status</CardDescription>
      </CardHeader>
      <CardContent>
        {submittedSheets.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No submitted cost sheets yet</p>
        ) : (
          <div className="space-y-3">
            {submittedSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{sheet.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>Submitted {format(new Date(sheet.submitted_at), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(sheet.approved_count, sheet.pending_count, sheet.items_count)}>
                      {sheet.approved_count}/{sheet.items_count} Approved
                    </Badge>
                    {sheet.pending_count > 0 && (
                      <Badge variant="secondary">
                        {sheet.pending_count} Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/approved-cost-sheets')}
                  className="ml-4"
                >
                  View
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/approved-cost-sheets')}
            >
              View All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
