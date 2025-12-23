import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Instructor, Department } from '@/lib/types';

interface StaffUser {
  id: string;
  userId: string;
  userCode: string;
  fullName: string;
}

interface InstructorFormData {
  fullName: string;
  title: string;
  instructorType: 'doctor' | 'teaching_assistant';
  departmentId: string;
  userId: string;
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [formData, setFormData] = useState<InstructorFormData>({
    fullName: '',
    title: 'Dr.',
    instructorType: 'doctor',
    departmentId: '',
    userId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instructorsRes, departmentsRes, staffRes] = await Promise.all([
        supabase.from('instructors').select('*').order('full_name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('*').eq('role', 'staff').order('full_name'),
      ]);

      if (instructorsRes.data) {
        setInstructors(instructorsRes.data.map(i => ({
          id: i.id,
          userId: i.user_id,
          fullName: i.full_name,
          title: i.title || 'Dr.',
          departmentId: i.department_id,
          instructorType: i.instructor_type as 'doctor' | 'teaching_assistant',
        })));
      }

      if (departmentsRes.data) {
        setDepartments(departmentsRes.data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
      }

      if (staffRes.data) {
        setStaffUsers(staffRes.data.map(s => ({
          id: s.id,
          userId: s.user_id,
          userCode: s.user_code,
          fullName: s.full_name,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const instructorData = {
        full_name: formData.fullName,
        title: formData.title,
        instructor_type: formData.instructorType,
        department_id: formData.departmentId || null,
        user_id: formData.userId || null,
      };

      if (editingInstructor) {
        const { error } = await supabase
          .from('instructors')
          .update(instructorData)
          .eq('id', editingInstructor.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Instructor updated successfully' });
      } else {
        const { error } = await supabase
          .from('instructors')
          .insert(instructorData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Instructor created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save instructor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (instructor: Instructor) => {
    if (!confirm(`Are you sure you want to delete "${instructor.fullName}"?`)) return;

    try {
      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', instructor.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Instructor deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete instructor',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      fullName: instructor.fullName,
      title: instructor.title,
      instructorType: instructor.instructorType,
      departmentId: instructor.departmentId || '',
      userId: instructor.userId || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingInstructor(null);
    setFormData({
      fullName: '',
      title: 'Dr.',
      instructorType: 'doctor',
      departmentId: departments[0]?.id || '',
      userId: '',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Instructors</h1>
            <p className="text-muted-foreground">Manage faculty members and teaching assistants</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Instructor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>
                  {editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}
                </DialogTitle>
                <DialogDescription>
                  {editingInstructor ? 'Update instructor details' : 'Add a new faculty member or teaching assistant'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g., Heba Hamdy"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Select
                      value={formData.title}
                      onValueChange={(value) => setFormData({ ...formData, title: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                        <SelectItem value="Prof.">Prof.</SelectItem>
                        <SelectItem value="Eng.">Eng.</SelectItem>
                        <SelectItem value="Mr.">Mr.</SelectItem>
                        <SelectItem value="Ms.">Ms.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.instructorType}
                      onValueChange={(value: 'doctor' | 'teaching_assistant') => 
                        setFormData({ ...formData, instructorType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="teaching_assistant">Teaching Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedUser">Link to Staff Account</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {staffUsers.map((staff) => (
                        <SelectItem key={staff.userId} value={staff.userId}>
                          {staff.userCode} - {staff.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this instructor to a staff user account to enable timetable viewing
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingInstructor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              All Instructors
            </CardTitle>
            <CardDescription>
              {instructors.length} instructors registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : instructors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No instructors found. Add your first instructor to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">
                          {instructor.title} {instructor.fullName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={instructor.instructorType === 'doctor' ? 'default' : 'secondary'}>
                            {instructor.instructorType === 'doctor' ? 'Doctor' : 'TA'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {departments.find(d => d.id === instructor.departmentId)?.name || 
                            <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(instructor)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(instructor)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
