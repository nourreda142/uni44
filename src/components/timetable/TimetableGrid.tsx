import { useMemo } from 'react';
import { TimetableEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS = [
  { label: '9:00 - 11:00', start: '09:00', end: '11:00' },
  { label: '11:00 - 1:00', start: '11:00', end: '13:00' },
  { label: '1:00 - 3:00', start: '13:00', end: '15:00' },
  { label: '3:00 - 5:00', start: '15:00', end: '17:00' },
];

interface TimetableGridProps {
  entries: TimetableEntry[];
  filterSection?: string;
  filterInstructor?: string;
}

const COLORS = [
  'bg-primary/10 border-primary/30 text-primary',
  'bg-secondary/20 border-secondary/40 text-secondary-foreground',
  'bg-accent/20 border-accent/40 text-accent-foreground',
  'bg-info/20 border-info/40 text-info-foreground',
  'bg-success/20 border-success/40 text-success-foreground',
  'bg-warning/20 border-warning/40 text-warning-foreground',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-pink-100 border-pink-300 text-pink-900',
];

export default function TimetableGrid({ entries, filterSection, filterInstructor }: TimetableGridProps) {
  // Create a map of courseId to color
  const courseColors = useMemo(() => {
    const colors = new Map<string, string>();
    const uniqueCourses = [...new Set(entries.map(e => e.courseId))];
    uniqueCourses.forEach((courseId, index) => {
      colors.set(courseId, COLORS[index % COLORS.length]);
    });
    return colors;
  }, [entries]);

  // Filter entries if needed
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filterSection) {
      result = result.filter(e => e.sectionId === filterSection);
    }
    if (filterInstructor) {
      result = result.filter(e => e.instructorId === filterInstructor);
    }
    return result;
  }, [entries, filterSection, filterInstructor]);

  // Group entries by day and time slot
  const getEntriesForCell = (day: string, timeSlot: typeof TIME_SLOTS[0]) => {
    return filteredEntries.filter(entry => {
      if (!entry.timeSlot) return false;
      const entryStart = entry.timeSlot.startTime.slice(0, 5);
      return entry.timeSlot.day === day && entryStart === timeSlot.start;
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="timetable-grid" style={{ 
          gridTemplateColumns: '100px repeat(6, 1fr)',
        }}>
          {/* Header Row */}
          <div className="timetable-header">Time</div>
          {DAYS.map(day => (
            <div key={day} className="timetable-header">
              {day}
            </div>
          ))}

          {/* Time Slot Rows */}
          {TIME_SLOTS.map((slot) => (
            <>
              <div key={`time-${slot.start}`} className="timetable-time">
                {slot.label}
              </div>
              {DAYS.map(day => {
                const cellEntries = getEntriesForCell(day, slot);
                return (
                  <div 
                    key={`${day}-${slot.start}`} 
                    className="timetable-cell"
                  >
                    {cellEntries.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground/30 text-sm">
                        —
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {cellEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'p-2 rounded-md border text-xs transition-all hover:shadow-md',
                              courseColors.get(entry.courseId)
                            )}
                          >
                            <div className="font-semibold truncate">
                              {entry.course?.code || 'Unknown'}
                            </div>
                            <div className="truncate opacity-80">
                              {entry.course?.name}
                            </div>
                            {entry.instructor && (
                              <div className="truncate text-[10px] mt-1 opacity-70">
                                {entry.instructor.instructorType === 'teaching_assistant' ? '👨‍🏫 TA: ' : '👨‍⚕️ Dr. '}
                                {entry.instructor.title} {entry.instructor.fullName}
                              </div>
                            )}
                            {entry.room && (
                              <div className="truncate text-[10px] opacity-70">
                                📍 {entry.room.name}
                              </div>
                            )}
                            {entry.section && (
                              <div className="truncate text-[10px] opacity-70">
                                👥 {entry.section.group?.name ? `${entry.section.group.name} - ` : ''}{entry.section.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
