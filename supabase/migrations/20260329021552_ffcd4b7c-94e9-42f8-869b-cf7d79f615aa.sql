-- Fix 1: Change instructor_availability policies from public to authenticated role
DROP POLICY "Admins can manage instructor availability" ON public.instructor_availability;
CREATE POLICY "Admins can manage instructor availability"
  ON public.instructor_availability FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY "Staff can manage their own availability" ON public.instructor_availability;
CREATE POLICY "Staff can manage their own availability"
  ON public.instructor_availability FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM instructors i WHERE i.id = instructor_availability.instructor_id AND i.user_id = auth.uid()));

DROP POLICY "Users can view relevant availability" ON public.instructor_availability;
CREATE POLICY "Users can view relevant availability"
  ON public.instructor_availability FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR EXISTS (SELECT 1 FROM instructors i WHERE i.id = instructor_availability.instructor_id AND i.user_id = auth.uid()));

-- Fix 2: Prevent privilege escalation on user_roles - recreate the ALL policy with WITH CHECK
DROP POLICY "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));