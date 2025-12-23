-- Create instructor availability table
CREATE TABLE public.instructor_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  time_slot_id uuid NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  preference_level integer DEFAULT 1, -- 1 = available, 2 = preferred, 3 = highly preferred
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(instructor_id, time_slot_id)
);

-- Enable RLS
ALTER TABLE public.instructor_availability ENABLE ROW LEVEL SECURITY;

-- Admins can manage availability
CREATE POLICY "Admins can manage instructor availability"
ON public.instructor_availability
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Staff can manage their own availability
CREATE POLICY "Staff can manage their own availability"
ON public.instructor_availability
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM instructors i 
    WHERE i.id = instructor_availability.instructor_id 
    AND i.user_id = auth.uid()
  )
);

-- Authenticated users can view availability
CREATE POLICY "Authenticated users can view availability"
ON public.instructor_availability
FOR SELECT
USING (true);