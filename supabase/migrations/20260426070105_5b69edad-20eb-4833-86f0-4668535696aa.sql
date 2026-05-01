-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  body text,
  related_id uuid,
  related_kind text,
  trigger_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  channels_sent text[] NOT NULL DEFAULT ARRAY[]::text[],
  dedup_key text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_user_dedup_idx ON public.notifications (user_id, dedup_key);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, read_at, created_at DESC);
CREATE INDEX notifications_user_trigger_idx ON public.notifications (user_id, trigger_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications all"
  ON public.notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE public.notification_prefs (
  user_id uuid NOT NULL PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  tasks_enabled boolean NOT NULL DEFAULT true,
  habits_enabled boolean NOT NULL DEFAULT true,
  interviews_enabled boolean NOT NULL DEFAULT true,
  career_enabled boolean NOT NULL DEFAULT true,
  habit_reminder_time time NOT NULL DEFAULT '09:00:00',
  push_enabled boolean NOT NULL DEFAULT false,
  push_subscription jsonb,
  email_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs select"
  ON public.notification_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own prefs insert"
  ON public.notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own prefs update"
  ON public.notification_prefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER notification_prefs_updated
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INTERVIEW EVENTS
-- ============================================================
CREATE TABLE public.interview_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  notes text,
  outcome text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX interview_events_user_scheduled_idx ON public.interview_events (user_id, scheduled_at);
CREATE INDEX interview_events_application_idx ON public.interview_events (application_id);

ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own interview_events all"
  ON public.interview_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER interview_events_updated
  BEFORE UPDATE ON public.interview_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AUTO-CLEANUP: delete pending notifications when source row is deleted
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_notifications_for_related()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE related_id = OLD.id
    AND user_id = OLD.user_id
    AND read_at IS NULL;
  RETURN OLD;
END;
$$;

CREATE TRIGGER cleanup_notifications_tasks
  AFTER DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_for_related();

CREATE TRIGGER cleanup_notifications_habits
  AFTER DELETE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_for_related();

CREATE TRIGGER cleanup_notifications_interview_events
  AFTER DELETE ON public.interview_events
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_for_related();

CREATE TRIGGER cleanup_notifications_applications
  AFTER DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_for_related();