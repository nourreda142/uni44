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
import { Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { TimeSlot } from '@/lib/types';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

interface TimeSlotFormData {
  day: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
}

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState<TimeSlotFormData>({
    day: 'Saturday',
    startTime: '09:00',
    endTime: '11:00',
    slotOrder: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('slot_order')
        .order('day');

      if (error) throw error;

      setTimeSlots(data?.map(ts => ({
        id: ts.id,
        day: ts.day,
        startTime: ts.start_time,
        endTime: ts.end_time,
        slotOrder: ts.slot_order,
      })) || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time slots',
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
      const slotData = {
        day: formData.day,
        start_time: formData.startTime,
        end_time: formData.endTime,
        slot_order: formData.slotOrder,
      };

      if (editingSlot) {
        const { error } = await supabase
          .from('time_slots')
          .update(slotData)
          .eq('id', editingSlot.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Time slot updated successfully' });
      } else {
        const { error } = await supabase
          .from('time_slots')
          .insert(slotData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Time slot created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchTimeSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save time slot',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slot: TimeSlot) => {
    if (!confirm(`Are you sure you want to delete this time slot?`)) return;

    try {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', slot.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Time slot deleted successfully' });
      fetchTimeSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete time slot',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      day: slot.day,
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      slotOrder: slot.slotOrder,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSlot(null);
    setFormData({
      day: 'Saturday',
      startTime: '09:00',
      endTime: '11:00',
      slotOrder: 1,
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayBadgeVariant = (day: string) => {
    const index = DAYS.indexOf(day);
    if (index === 0 || index === 5) return 'secondary';
    return 'default';
  };

  // Group time slots by slot order
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (!acc[key]) {
      acc[key] = { slots: [], startTime: slot.startTime, endTime: slot.endTime, slotOrder: slot.slotOrder };
    }
    acc[key].slots.push(slot);
    return acc;
  }, {} as Record<string, { slots: TimeSlot[], startTime: string, endTime: string, slotOrder: number }>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Time Slots</h1>
            <p className="text-muted-foreground">Manage available lecture time slots</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
                </DialogTitle>
                <DialogDescription>
                  {editingSlot ? 'Update time slot details' : 'Create a new time slot for scheduling'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <Select
                    value={formData.day}
                    onValueChange={(value) => setFormData({ ...formData, day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slotOrder">Slot Order</Label>
                  <Input
                    id="slotOrder"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.slotOrder}
                    onChange={(e) => setFormData({ ...formData, slotOrder: parseInt(e.target.value) || 1 })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Order determines the position in the schedule (1 = first slot)
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
                    {editingSlot ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              All Time Slots
            </CardTitle>
            <CardDescription>
              {timeSlots.length} time slots configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time slots found. Add your first time slot to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Slot Order</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          <Badge variant={getDayBadgeVariant(slot.day)}>
                            {slot.day}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                            {slot.slotOrder}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(slot)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(slot)}
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
