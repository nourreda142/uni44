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
import { Building2, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { Room } from '@/lib/types';

interface RoomFormData {
  name: string;
  capacity: number;
  roomType: 'lecture_hall' | 'lab' | 'seminar_room';
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    capacity: 50,
    roomType: 'lecture_hall',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) throw error;

      setRooms(data?.map(r => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        roomType: r.room_type as 'lecture_hall' | 'lab' | 'seminar_room',
      })) || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rooms',
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
      const roomData = {
        name: formData.name,
        capacity: formData.capacity,
        room_type: formData.roomType,
      };

      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', editingRoom.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Room updated successfully' });
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert(roomData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Room created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save room',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Room deleted successfully' });
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete room',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity,
      roomType: room.roomType,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      capacity: 50,
      roomType: 'lecture_hall',
    });
  };

  const getRoomTypeBadge = (type: string) => {
    switch (type) {
      case 'lecture_hall':
        return <Badge>Lecture Hall</Badge>;
      case 'lab':
        return <Badge variant="secondary">Lab</Badge>;
      case 'seminar_room':
        return <Badge variant="outline">Seminar Room</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Rooms</h1>
            <p className="text-muted-foreground">Manage lecture halls and classrooms</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </DialogTitle>
                <DialogDescription>
                  {editingRoom ? 'Update room details' : 'Add a new room for scheduling'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Room Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Hall A1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      max={500}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 50 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Room Type</Label>
                    <Select
                      value={formData.roomType}
                      onValueChange={(value: 'lecture_hall' | 'lab' | 'seminar_room') => 
                        setFormData({ ...formData, roomType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecture_hall">Lecture Hall</SelectItem>
                        <SelectItem value="lab">Lab</SelectItem>
                        <SelectItem value="seminar_room">Seminar Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    {editingRoom ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              All Rooms
            </CardTitle>
            <CardDescription>
              {rooms.length} rooms available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rooms found. Add your first room to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>{getRoomTypeBadge(room.roomType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {room.capacity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(room)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(room)}
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
