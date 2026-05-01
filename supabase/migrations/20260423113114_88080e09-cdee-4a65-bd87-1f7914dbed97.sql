-- habit_freezes: append-only log of streak protection token usage
CREATE TABLE public.habit_freezes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL,
  used_on DATE NOT NULL DEFAULT CURRENT_DATE,
  week_of DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, used_on)
);

ALTER TABLE public.habit_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own habit_freezes all"
ON public.habit_freezes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_habit_freezes_user_week ON public.habit_freezes(user_id, week_of);
CREATE INDEX idx_habit_freezes_habit ON public.habit_freezes(habit_id);

-- weekly_reviews: one reflection per user per week
CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_of DATE NOT NULL,
  went_well TEXT,
  blockers TEXT,
  change TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_of)
);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weekly_reviews all"
ON public.weekly_reviews
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER weekly_reviews_set_updated_at
BEFORE UPDATE ON public.weekly_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- focus_sessions: deep work timer log
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID,
  topic TEXT,
  planned_minutes INTEGER NOT NULL,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  completed_naturally BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own focus_sessions all"
ON public.focus_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_focus_sessions_user_started ON public.focus_sessions(user_id, started_at DESC);