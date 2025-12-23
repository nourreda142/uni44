export type UserRole = 'admin' | 'staff' | 'student';

export interface User {
  id: string;
  email: string;
  userCode: string;
  fullName: string;
  role: UserRole;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Group {
  id: string;
  name: string;
  departmentId: string;
}

export interface Section {
  id: string;
  name: string;
  groupId: string;
  group?: Group;
}

export interface Instructor {
  id: string;
  userId?: string;
  fullName: string;
  title: string;
  departmentId?: string;
  instructorType: 'doctor' | 'teaching_assistant';
}

export interface Course {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  doctorId?: string;
  taId?: string;
  doctor?: Instructor;
  ta?: Instructor;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  roomType: 'lecture_hall' | 'lab' | 'seminar_room';
}

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotOrder: number;
}

export interface Student {
  id: string;
  userId: string;
  sectionId?: string;
  groupId?: string;
  departmentId?: string;
  section?: Section;
  group?: Group;
}

export interface Constraint {
  id: string;
  name: string;
  constraintType: 'hard' | 'soft';
  description?: string;
  weight: number;
  isActive: boolean;
}

export interface Timetable {
  id: string;
  name: string;
  departmentId: string;
  fitnessScore?: number;
  generationCount: number;
  isApproved: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  timetableId: string;
  courseId: string;
  instructorId?: string;
  sectionId: string;
  roomId?: string;
  timeSlotId?: string;
  course?: Course;
  instructor?: Instructor;
  section?: Section;
  room?: Room;
  timeSlot?: TimeSlot;
}

// Genetic Algorithm Types
export interface Gene {
  courseId: string;
  instructorId: string;
  sectionId: string;
  roomId: string;
  timeSlotId: string;
}

export interface Chromosome {
  genes: Gene[];
  fitness: number;
}

export interface GAConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
}

export interface ConflictInfo {
  type: 'instructor' | 'room' | 'section';
  description: string;
  genes: [Gene, Gene];
}
