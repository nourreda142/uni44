-- Fix instructor_availability table - restrict to instructor themselves and admins only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view availability" ON public.instructor_availability;

-- Create a proper restricted policy for viewing availability
CREATE POLICY "Users can view relevant availability" 
ON public.instructor_availability 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  EXISTS (
    SELECT 1 FROM public.instructors i 
    WHERE i.id = instructor_availability.instructor_id 
    AND i.user_id = auth.uid()
  )
);