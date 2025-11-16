-- =====================================================
-- Intern Management System - Database Schema
-- =====================================================
-- This file contains the complete database schema including:
-- - Table definitions
-- - Foreign key relationships
-- - Database triggers
-- - Row Level Security (RLS) policies
-- - Helper functions
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLE: profiles
-- =====================================================
-- User profiles linked to Supabase auth.users
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'intern' CHECK (role IN ('admin', 'intern')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: projects
-- =====================================================
-- Project information and status tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: tasks
-- =====================================================
-- Task assignments with due dates and status
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: task_comments
-- =====================================================
-- Comments on tasks for feedback and communication
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: activity_log
-- =====================================================
-- Activity tracking for audit purposes (optional)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT,
  resource TEXT,
  resource_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);

-- =====================================================
-- FUNCTION: is_admin()
-- =====================================================
-- Security definer function to check if current user is admin
-- Bypasses RLS to prevent infinite recursion
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- =====================================================
-- TRIGGER: handle_new_user
-- =====================================================
-- Automatically creates a profile when a new user signs up
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'intern'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = COALESCE(NEW.raw_user_meta_data->>'role', 'intern'),
    email = NEW.email;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow profile creation (handled by trigger, but needed for direct inserts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- RLS POLICIES: projects
-- =====================================================

-- Admins can view all projects
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects"
  ON public.projects
  FOR SELECT
  USING (public.is_admin());

-- Interns can view projects they have tasks in
DROP POLICY IF EXISTS "Interns can view assigned projects" ON public.projects;
CREATE POLICY "Interns can view assigned projects"
  ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.project_id = projects.id
      AND tasks.assignee_id = auth.uid()
    )
  );

-- Admins can create projects
DROP POLICY IF EXISTS "Admins can create projects" ON public.projects;
CREATE POLICY "Admins can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update projects
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
CREATE POLICY "Admins can update projects"
  ON public.projects
  FOR UPDATE
  USING (public.is_admin());

-- Admins can delete projects
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: tasks
-- =====================================================

-- Admins can view all tasks
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
CREATE POLICY "Admins can view all tasks"
  ON public.tasks
  FOR SELECT
  USING (public.is_admin());

-- Interns can view their assigned tasks
DROP POLICY IF EXISTS "Interns can view assigned tasks" ON public.tasks;
CREATE POLICY "Interns can view assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (assignee_id = auth.uid());

-- Admins can create tasks
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
CREATE POLICY "Admins can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update all tasks
DROP POLICY IF EXISTS "Admins can update all tasks" ON public.tasks;
CREATE POLICY "Admins can update all tasks"
  ON public.tasks
  FOR UPDATE
  USING (public.is_admin());

-- Interns can update status of their assigned tasks
DROP POLICY IF EXISTS "Interns can update their task status" ON public.tasks;
CREATE POLICY "Interns can update their task status"
  ON public.tasks
  FOR UPDATE
  USING (assignee_id = auth.uid())
  WITH CHECK (
    assignee_id = auth.uid() AND
    -- Only allow updating status field
    (OLD.title = NEW.title) AND
    (OLD.description = NEW.description) AND
    (OLD.project_id = NEW.project_id) AND
    (OLD.assignee_id = NEW.assignee_id) AND
    (OLD.due_date = NEW.due_date) AND
    (OLD.created_by = NEW.created_by)
  );

-- Admins can delete tasks
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
  ON public.tasks
  FOR DELETE
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: task_comments
-- =====================================================

-- Admins can view all comments
DROP POLICY IF EXISTS "Admins can view all comments" ON public.task_comments;
CREATE POLICY "Admins can view all comments"
  ON public.task_comments
  FOR SELECT
  USING (public.is_admin());

-- Interns can view comments on their tasks
DROP POLICY IF EXISTS "Interns can view comments on their tasks" ON public.task_comments;
CREATE POLICY "Interns can view comments on their tasks"
  ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.assignee_id = auth.uid()
    )
  );

-- Admins can create comments
DROP POLICY IF EXISTS "Admins can create comments" ON public.task_comments;
CREATE POLICY "Admins can create comments"
  ON public.task_comments
  FOR INSERT
  WITH CHECK (public.is_admin());

-- =====================================================
-- RLS POLICIES: profiles (for comment authors)
-- =====================================================

-- Interns can view profiles of users who commented on their tasks
DROP POLICY IF EXISTS "Interns can view comment author profiles" ON public.profiles;
CREATE POLICY "Interns can view comment author profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.task_comments
      JOIN public.tasks ON tasks.id = task_comments.task_id
      WHERE task_comments.user_id = profiles.id
      AND tasks.assignee_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES: activity_log
-- =====================================================

-- Admins can view all activity logs
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_log;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_log
  FOR SELECT
  USING (public.is_admin());

-- Users can view their own activity logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_log;
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can insert activity logs
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_log;
CREATE POLICY "Admins can insert activity logs"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (public.is_admin());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- To verify the schema was created correctly, you can run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT policy_name, table_name FROM pg_policies WHERE schemaname = 'public';

