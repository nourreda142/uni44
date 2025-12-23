import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Plus,
  MoreVertical,
  Eye,
  Check,
  Trash2,
  Loader2,
  FileDown,
  Target,
  Clock,
} from 'lucide-react';
import { Timetable, Department } from '@/lib/types';

interface TimetableWithDept extends Timetable {
  department?: Department;
}

export default function TimetablesPage() {
  const [timetables, setTimetables] = useState<TimetableWithDept[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [timetablesRes, deptsRes] = await Promise.all([
        supabase.from('timetables').select('*').order('created_at', { ascending: false }),
        supabase.from('departments').select('*'),
      ]);

      if (deptsRes.data) {
        setDepartments(deptsRes.data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
      }

      if (timetablesRes.data) {
        setTimetables(timetablesRes.data.map(t => ({
          id: t.id,
          name: t.name,
          departmentId: t.department_id,
          fitnessScore: t.fitness_score ? parseFloat(String(t.fitness_score)) : undefined,
          generationCount: t.generation_count || 0,
          isApproved: t.is_approved || false,
          createdBy: t.created_by,
          createdAt: t.created_at,
          department: deptsRes.data?.find(d => d.id === t.department_id) 
            ? { id: t.department_id, name: deptsRes.data.find(d => d.id === t.department_id)!.name, code: deptsRes.data.find(d => d.id === t.department_id)!.code }
            : undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timetables',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (timetable: TimetableWithDept) => {
    try {
      const { error } = await supabase
        .from('timetables')
        .update({ is_approved: true })
        .eq('id', timetable.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Timetable approved successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve timetable',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (timetable: TimetableWithDept) => {
    if (!confirm(`Are you sure you want to delete "${timetable.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('timetables')
        .delete()
        .eq('id', timetable.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Timetable deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete timetable',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Timetables</h1>
            <p className="text-muted-foreground">View and manage generated timetables</p>
          </div>
          <Button asChild variant="hero">
            <Link to="/admin/generate">
              <Plus className="w-4 h-4 mr-2" />
              Generate New
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              All Timetables
            </CardTitle>
            <CardDescription>
              {timetables.length} timetables generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : timetables.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No timetables yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first timetable using the Genetic Algorithm
                </p>
                <Button asChild variant="hero">
                  <Link to="/admin/generate">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Timetable
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Fitness</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetables.map((timetable) => (
                      <TableRow key={timetable.id}>
                        <TableCell className="font-medium">
                          {timetable.name}
                        </TableCell>
                        <TableCell>
                          {timetable.department?.name || 
                            <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className={
                              (timetable.fitnessScore || 0) >= 900 
                                ? 'text-success font-medium' 
                                : 'text-muted-foreground'
                            }>
                              {timetable.fitnessScore?.toFixed(2) || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {timetable.isApproved ? (
                            <Badge variant="default" className="bg-success">
                              <Check className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(timetable.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/timetables/${timetable.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {!timetable.isApproved && (
                                <DropdownMenuItem onClick={() => handleApprove(timetable)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDelete(timetable)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
