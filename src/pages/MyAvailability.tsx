import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, Loader2, Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
}

interface AvailabilityMap {
  [timeSlotId: string]: {
    isAvailable: boolean;
    preferenceLevel: number;
  };
}

export default function MyAvailability() {
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Find instructor linked to this user
      const { data: instructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!instructor) {
        setInstructorId(null);
        setLoading(false);
        return;
      }

      setInstructorId(instructor.id);

      // Fetch time slots
      const { data: timeSlotsData } = await supabase
        .from('time_slots')
        .select('*')
        .order('day')
        .order('slot_order');

      if (timeSlotsData) {
        setTimeSlots(timeSlotsData.map(t => ({
          id: t.id,
          day: t.day,
          startTime: t.start_time,
          endTime: t.end_time,
          slotOrder: t.slot_order,
        })));

        // Initialize availability
        const availabilityMap: AvailabilityMap = {};
        timeSlotsData.forEach(slot => {
          availabilityMap[slot.id] = {
            isAvailable: true,
            preferenceLevel: 1,
          };
        });

        // Fetch existing availability
        const { data: existingAvailability } = await supabase
          .from('instructor_availability')
          .select('*')
          .eq('instructor_id', instructor.id);

        existingAvailability?.forEach(a => {
          availabilityMap[a.time_slot_id] = {
            isAvailable: a.is_available,
            preferenceLevel: a.preference_level || 1,
          };
        });

        setAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load availability data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
    if (!instructorId) return;

    setSaving(true);
    try {
      // Delete existing availability
      await supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', instructorId);

      // Insert new availability
      const records = Object.entries(availability).map(([timeSlotId, data]) => ({
        instructor_id: instructorId,
        time_slot_id: timeSlotId,
        is_available: data.isAvailable,
        preference_level: data.preferenceLevel,
      }));

      const { error } = await supabase
        .from('instructor_availability')
        .insert(records);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your availability has been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save availability',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Group time slots by day
  const slotsByDay = days.map(day => ({
    day,
    slots: timeSlots.filter(s => s.day === day).sort((a, b) => a.slotOrder - b.slotOrder),
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!instructorId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              My Availability
            </h1>
            <p className="text-muted-foreground mt-1">
              Set your preferred teaching times
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your account is not linked to an instructor profile. Please contact the administrator to link your account.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              My Availability
            </h1>
            <p className="text-muted-foreground mt-1">
              Set your preferred teaching times
            </p>
          </div>
          <Button onClick={saveAvailability} disabled={saving} variant="hero">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Availability
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>
              Select the time slots when you are available to teach. Mark your preferences using the star buttons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <p className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Checkbox checked disabled className="w-4 h-4" /> Available
                </span>
                <span className="mx-2">|</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">★</span>
                <span>Preferred</span>
                <span className="mx-2">|</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">★★</span>
                <span>Highly Preferred</span>
              </p>
            </div>

            <div className="space-y-6">
              {slotsByDay.map(({ day, slots }) => (
                <div key={day} className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-2">{day}</h3>
                  {slots.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2">No time slots defined for this day</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const slotAvailability = availability[slot.id] || { isAvailable: true, preferenceLevel: 1 };
                        return (
                          <div
                            key={slot.id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              slotAvailability.isAvailable
                                ? slotAvailability.preferenceLevel === 3
                                  ? 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600'
                                  : slotAvailability.preferenceLevel === 2
                                  ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600'
                                  : 'bg-background border-border hover:border-primary/50'
                                : 'bg-muted/30 border-muted opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={slotAvailability.isAvailable}
                                  onCheckedChange={() => toggleAvailability(slot.id)}
                                  className="w-5 h-5"
                                />
                                <div>
                                  <p className="font-medium">
                                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Slot {slot.slotOrder}
                                  </p>
                                </div>
                              </div>
                              {slotAvailability.isAvailable && (
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={slotAvailability.preferenceLevel >= 2 ? 'default' : 'outline'}
                                    className="w-8 h-8 p-0"
                                    onClick={() => setPreference(slot.id, slotAvailability.preferenceLevel === 2 ? 1 : 2)}
                                    title="Preferred"
                                  >
                                    ★
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={slotAvailability.preferenceLevel === 3 ? 'default' : 'outline'}
                                    className="w-8 h-8 p-0"
                                    onClick={() => setPreference(slot.id, slotAvailability.preferenceLevel === 3 ? 1 : 3)}
                                    title="Highly Preferred"
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
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}