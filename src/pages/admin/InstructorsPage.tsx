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
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Pencil, Trash2, Loader2, Clock, Calendar } from 'lucide-react';
import { Instructor, Department } from '@/lib/types';

interface StaffUser {
  id: string;
  userId: string;
  userCode: string;
  fullName: string;
}

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
}

interface InstructorFormData {
  fullName: string;
  title: string;
  instructorType: 'doctor' | 'teaching_assistant';
  departmentId: string;
  userId: string;
}

interface AvailabilityMap {
  [timeSlotId: string]: {
    isAvailable: boolean;
    preferenceLevel: number;
  };
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [selectedInstructorForAvailability, setSelectedInstructorForAvailability] = useState<Instructor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [formData, setFormData] = useState<InstructorFormData>({
    fullName: '',
    title: 'Dr.',
    instructorType: 'doctor',
    departmentId: '',
    userId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instructorsRes, departmentsRes, staffRes, timeSlotsRes] = await Promise.all([
        supabase.from('instructors').select('*').order('full_name'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('*').eq('role', 'staff').order('full_name'),
        supabase.from('time_slots').select('*').order('day').order('slot_order'),
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

      if (timeSlotsRes.data) {
        setTimeSlots(timeSlotsRes.data.map(t => ({
          id: t.id,
          day: t.day,
          startTime: t.start_time,
          endTime: t.end_time,
          slotOrder: t.slot_order,
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

  const openAvailabilityDialog = async (instructor: Instructor) => {
    setSelectedInstructorForAvailability(instructor);
    
    // Fetch existing availability
    const { data } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructor.id);

    const availabilityMap: AvailabilityMap = {};
    
    // Initialize all slots as available by default
    timeSlots.forEach(slot => {
      availabilityMap[slot.id] = {
        isAvailable: true,
        preferenceLevel: 1,
      };
    });

    // Override with saved data
    data?.forEach(a => {
      availabilityMap[a.time_slot_id] = {
        isAvailable: a.is_available,
        preferenceLevel: a.preference_level || 1,
      };
    });

    setAvailability(availabilityMap);
    setAvailabilityDialogOpen(true);
  };

  const toggleAvailability = (timeSlotId: string) => {
    setAvailability(prev => ({
      ...prev,
      [timeSlotId]: {
        ...prev[timeSlotId],
        isAvailable: !prev[timeSlotId]?.isAvailable,
      },
    }));
  };

  const setPreference = (timeSlotId: string, level: number) => {
    setAvailability(prev => ({
      ...prev,
      [timeSlotId]: {
        ...prev[timeSlotId],
        preferenceLevel: level,
      },
    }));
  };

  const saveAvailability = async () => {
    if (!selectedInstructorForAvailability) return;

    setSubmitting(true);
    try {
      // Delete existing availability
      await supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', selectedInstructorForAvailability.id);

      // Insert new availability
      const records = Object.entries(availability).map(([timeSlotId, data]) => ({
        instructor_id: selectedInstructorForAvailability.id,
        time_slot_id: timeSlotId,
        is_available: data.isAvailable,
        preference_level: data.preferenceLevel,
      }));

      const { error } = await supabase
        .from('instructor_availability')
        .insert(records);

      if (error) throw error;

      toast({ title: 'Success', description: 'Availability saved successfully' });
      setAvailabilityDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save availability',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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

  // Group time slots by day
  const slotsByDay = days.map(day => ({
    day,
    slots: timeSlots.filter(s => s.day === day).sort((a, b) => a.slotOrder - b.slotOrder),
  }));

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
                    value={formData.userId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, userId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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
                      <TableHead className="w-[150px]">Actions</TableHead>
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
                              onClick={() => openAvailabilityDialog(instructor)}
                              title="Set Availability"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
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

        {/* Availability Dialog */}
        <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Set Availability
              </DialogTitle>
              <DialogDescription>
                {selectedInstructorForAvailability?.title} {selectedInstructorForAvailability?.fullName} - 
                Select available time slots and preferences
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                <p>✓ = Available | ★ = Preferred | ★★ = Highly Preferred</p>
              </div>
              
              {slotsByDay.map(({ day, slots }) => (
                <div key={day} className="space-y-2">
                  <h3 className="font-semibold text-sm">{day}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const slotAvailability = availability[slot.id] || { isAvailable: true, preferenceLevel: 1 };
                      return (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            slotAvailability.isAvailable
                              ? slotAvailability.preferenceLevel === 3
                                ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700'
                                : slotAvailability.preferenceLevel === 2
                                ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                                : 'bg-background border-border'
                              : 'bg-muted/50 border-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={slotAvailability.isAvailable}
                                onCheckedChange={() => toggleAvailability(slot.id)}
                              />
                              <span className="text-sm">
                                {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                              </span>
                            </div>
                            {slotAvailability.isAvailable && (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={slotAvailability.preferenceLevel >= 2 ? 'default' : 'ghost'}
                                  className="w-6 h-6"
                                  onClick={() => setPreference(slot.id, slotAvailability.preferenceLevel === 2 ? 1 : 2)}
                                >
                                  ★
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={slotAvailability.preferenceLevel === 3 ? 'default' : 'ghost'}
                                  className="w-6 h-6"
                                  onClick={() => setPreference(slot.id, slotAvailability.preferenceLevel === 3 ? 1 : 3)}
                                >
                                  ★★
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvailabilityDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveAvailability} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Availability
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}