
# Phase 6 — Notification & Reminder System

A 3-channel, hybrid-scheduled, context-aware notification engine. Built on top of existing data — minimal new schema (3 small tables), maximum behavior change.

---

## 1. Architecture overview

```
┌────────────────────────────────────────────────────────────────┐
│  EVENT SOURCES                                                  │
│  tasks (due_date)  habits  interview_events (NEW)  applications │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
┌──────────────────┐      ┌────────────────────┐
│ CLIENT SCHEDULER │      │ SERVER SCHEDULER   │
│ (live, in-app)   │      │ (pg_cron / 5 min)  │
│ — runs every     │      │ — writes rows to   │
│   30s while open │      │   notifications    │
│ — instant deltas │      │ — fires push+email │
└────────┬─────────┘      └─────────┬──────────┘
         │                          │
         └────────────┬─────────────┘
                      ▼
          ┌────────────────────────┐
          │ notifications table    │
          │ (single source truth)  │
          └───────────┬────────────┘
                      │ Realtime
                      ▼
          ┌────────────────────────┐
          │ Bell icon + dropdown   │
          │ (unread count, list)   │
          └────────────────────────┘
```

**Why hybrid:** Client computes instant in-app reminders for the live session (zero latency, zero server load). Server cron handles missed/follow-up + push + email when the app is closed. Both write to the same `notifications` table — UI is one source of truth, deduped by `dedup_key`.

---

## 2. New database schema (3 tables + 1 alter)

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid | RLS |
| `type` | text | `task_pre`, `task_due`, `task_missed`, `task_followup`, `habit_reminder`, `habit_eod`, `interview_pre_day`, `interview_pre_hour`, `interview_pre_10`, `application_followup` |
| `category` | text | `task` / `habit` / `interview` / `career` |
| `priority` | text | `low` / `medium` / `high` |
| `title` | text | |
| `body` | text | |
| `related_id` | uuid | task / habit / interview / application id |
| `related_kind` | text | `task` / `habit` / `interview_event` / `application` |
| `trigger_at` | timestamptz | scheduled fire time |
| `delivered_at` | timestamptz nullable | when shown in UI |
| `read_at` | timestamptz nullable | |
| `dismissed_at` | timestamptz nullable | |
| `channels_sent` | text[] | `['inapp']`, `['inapp','push']`, `['inapp','email']` |
| `dedup_key` | text unique per user | e.g. `task_pre:<task_id>` — prevents duplicates |
| `meta` | jsonb | extra payload |
| `created_at` | timestamptz | |

Unique index on `(user_id, dedup_key)`.

### `notification_prefs` (one row per user)
| Column | Type | Default |
|---|---|---|
| `user_id` | uuid pk | |
| `enabled` | boolean | true |
| `tasks_enabled` | boolean | true |
| `habits_enabled` | boolean | true |
| `interviews_enabled` | boolean | true |
| `career_enabled` | boolean | true |
| `habit_reminder_time` | time | `09:00` |
| `push_enabled` | boolean | false |
| `push_subscription` | jsonb nullable | web push subscription object |
| `email_enabled` | boolean | false |
| `quiet_hours_start` | time nullable | |
| `quiet_hours_end` | time nullable | |
| `timezone` | text | `'UTC'` (set from browser on first save) |

### `interview_events` (NEW — multiple per application)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid | RLS |
| `application_id` | uuid | FK to applications |
| `kind` | text | `phone_screen` / `technical` / `onsite` / `final` / `other` |
| `title` | text | e.g. "Technical round 1" |
| `scheduled_at` | timestamptz | |
| `duration_minutes` | int default 60 | |
| `location` | text nullable | "Google Meet link" / "Onsite NYC" |
| `notes` | text nullable | |
| `outcome` | text nullable | `pending` / `passed` / `failed` / `cancelled` / `no_show` |
| `created_at`, `updated_at` | | |

All 3 tables: RLS `auth.uid() = user_id`.

---

## 3. Notification timing rules

| Type | When fired | Source |
|---|---|---|
| `task_pre` | T-1h before `due_date` (only if `due_date` has time, not all-day) | client + server |
| `task_due` | At `due_date` time | client + server |
| `task_missed` | T+2h after `due_date` if `!completed` | server only |
| `task_followup` | T+1d after missed if still incomplete + high priority | server only |
| `habit_reminder` | Daily at `habit_reminder_time` if not completed today | client + server |
| `habit_eod` | At 21:00 if any habit not completed (one bundled notification) | server only |
| `interview_pre_day` | T-24h before `scheduled_at` | server only |
| `interview_pre_hour` | T-1h before | client + server |
| `interview_pre_10` | T-10min before | client (server fallback) |
| `application_followup` | 7 days after `applied_on` if status still `applied` | server only |

**Quiet hours:** if `trigger_at` falls inside quiet hours, push/email skipped, in-app delivered silently (no toast, just shows in bell). No-op if no quiet hours set.

---

## 4. Three delivery channels

### A. In-app (always on, instant)
- Bell icon in topbar (between profile avatar and theme toggle).
- Unread badge with count (capped "9+").
- Click → dropdown panel (desktop) / bottom sheet (mobile).
- Realtime subscription to `notifications` table.
- New high-priority notification → toast pop-up via existing sonner.

### B. Browser push (opt-in)
- Add Settings page section "Notifications" with "Enable push" button.
- Uses Web Push API + `serviceworker.js` + VAPID keys.
- VAPID private key stored as Supabase secret; public key as `VITE_VAPID_PUBLIC_KEY`.
- Server function `send-push-notification` posts to push endpoint.
- Server cron picks up notifications where `channels_sent` doesn't include `'push'` and user has `push_enabled` → sends.

### C. Email (opt-in, high-priority only)
- Email is **only** sent for: `task_missed` (high priority), `interview_pre_day`, `interview_pre_hour`, `application_followup`.
- Requires verified email domain.
- **The user has no email domain configured yet** — I'll prompt them to set one up at the bottom of this plan. If they skip it, in-app + push still work; email is gracefully disabled.

---

## 5. Scheduler implementation

### Client scheduler (`src/lib/notification-scheduler.ts`)
- Runs in `_app.tsx` via `useEffect` — `setInterval(check, 30_000)`.
- Reads tasks, habits, interview_events from existing data hooks (cached).
- For each upcoming item, computes if any timing rule fires within next 30s.
- If yes → upserts row to `notifications` (idempotent via `dedup_key`).
- Realtime listener picks it up → toast + bell update.

### Server scheduler (`process-notifications` server route)
- TanStack server route at `/api/public/hooks/process-notifications`.
- Triggered by `pg_cron` every **5 minutes**.
- Iterates all users with `enabled = true`:
  1. Find tasks due in next 5 min → upsert `task_due` rows.
  2. Find tasks past due_date by 2h+ and not completed → upsert `task_missed` rows.
  3. Find habits not completed today + past `habit_reminder_time` → upsert `habit_reminder`.
  4. Find interview_events upcoming → upsert pre-day/pre-hour as applicable.
  5. Find applications applied 7d ago, status `applied` → `application_followup`.
  6. For all new rows where push/email enabled and channel not yet sent → dispatch + update `channels_sent`.

Auth: protected by anon-key bearer (matches existing scheduled-job pattern).

### Why 5 min cron + 30s client poll
- Cron at 1 min would be wasteful (most users have no events firing).
- 5-min server cadence is fine for missed/email/push (these are not second-precise).
- 30s client cadence keeps in-app reminders snappy (within 30s of trigger time when app is open).

---

## 6. UI components

### Bell icon + panel — `src/components/notification-bell.tsx`
- Replaces existing static bell in topbar.
- Badge showing unread count (capped 9+) with pulse animation when new arrives.
- Desktop: shadcn Popover, ~380px wide, max-h ~520px scrollable.
- Mobile: Sheet from bottom, ~75% screen.
- Each item shows: icon (per category), title, body, relative time ("2 min ago"), category chip, priority dot.
- Actions per item: tap to navigate to source (task → /tasks, habit → /habits, interview → /interview), swipe/X to dismiss, "Mark all read" header button.
- Empty state: "You're all caught up ✨"
- Footer: "Notification settings" link → `/settings/notifications`.

### Settings page — `src/routes/_app.settings.tsx` (new layout) + `_app.settings.notifications.tsx`
- Master toggle: Enable notifications.
- Per-category toggles: Tasks / Habits / Interviews / Career.
- Habit daily reminder time picker.
- Quiet hours (optional from–to time).
- Push notifications: button → request permission → save subscription. Status indicator.
- Email notifications: toggle (disabled with hint if no email domain configured).
- "Test notification" button to verify setup.

### Interview events UI — extends `_app.career.tsx` (existing page)
- New "Schedule interview" button on each application card.
- Dialog to add interview_event: kind dropdown, title, datetime picker, duration, location, notes.
- Shows upcoming interviews list under each application with countdown.
- Mark outcome after interview (passed/failed/etc.) → cancels future reminders.

---

## 7. Edge cases

- **Duplicates:** `dedup_key` unique per user blocks double-inserts. Both client and server use upsert.
- **User offline:** Notifications stay in DB with `delivered_at = null`. On next app open, realtime fetches all → shows as new.
- **Deleted task/habit/interview:** Cascade delete on `related_id` via trigger that nukes pending notifications for that record.
- **Timezone:** `notification_prefs.timezone` set from browser on first settings save. Server cron compares using user's TZ for habit_reminder_time and habit_eod.
- **Past-due tasks at notification creation time:** if a user sets a task due 5 min from now, scheduler still fires `task_pre` immediately (don't wait for the next cycle).
- **All-day tasks (no time on `due_date`):** treat as 23:59 of that day for `task_due`, skip `task_pre`.
- **Quiet hours overflow midnight:** handled (e.g. 22:00 → 07:00).
- **Push permission denied or revoked:** toggle reverts, prefs.push_enabled = false.
- **Service worker not supported (rare):** push toggle disabled with tooltip.
- **Notification spam:** max 50 unread per user kept; older auto-dismissed.

---

## 8. Security & performance

- All new tables RLS: `auth.uid() = user_id`.
- Server route uses anon-key bearer + `requireSupabaseAuth` for user-context endpoints; cron uses service role inside route after bearer check.
- Realtime: only `notifications` table, filtered by `user_id`.
- Indexes: `notifications(user_id, read_at, created_at desc)`, `notifications(user_id, trigger_at)`, `interview_events(user_id, scheduled_at)`.
- Cron processes batched per user; expected <100ms per user even at 1000 active users.
- Auto-cleanup: notifications older than 30 days deleted by cron.

---

## 9. Files I'll create / edit

**Migrations (one combined)**
- Create `notifications`, `notification_prefs`, `interview_events` tables + RLS + indexes
- Trigger to auto-delete pending notifications when source row is deleted
- Enable Realtime on `notifications`

**Create**
- `src/lib/notifications.ts` — types, helpers (dedup_key builder, format functions)
- `src/lib/notification-scheduler.ts` — client-side scheduler hook `useNotificationScheduler()`
- `src/lib/use-notifications.ts` — hook for live notifications + unread count + actions (mark read, dismiss)
- `src/lib/notification-prefs.tsx` — `NotificationPrefsProvider` + `useNotificationPrefs()`
- `src/components/notification-bell.tsx` — bell icon + popover/sheet panel
- `src/components/interview-event-dialog.tsx` — add/edit interview event
- `src/components/interview-events-list.tsx` — list under each application card
- `src/routes/_app.settings.tsx` — settings layout (Outlet)
- `src/routes/_app.settings.notifications.tsx` — notification preferences page
- `src/routes/api.public.hooks.process-notifications.ts` — server cron route
- `src/lib/push.ts` — web push helper (subscribe, unsubscribe, permission)
- `public/sw.js` — service worker for push display

**Edit**
- `src/routes/_app.tsx` — replace static bell with `<NotificationBell />`, mount scheduler, add settings link to sidebar
- `src/routes/__root.tsx` — wrap with `NotificationPrefsProvider`
- `src/routes/_app.career.tsx` — add interview events UI (button, list, dialog)
- `src/lib/data.ts` (or appropriate phase file) — add interview_events CRUD + notifications CRUD helpers

**SQL (post-migration via insert tool)**
- Schedule pg_cron job calling `/api/public/hooks/process-notifications` every 5 min.

**Settings/secrets**
- `VITE_VAPID_PUBLIC_KEY` (env) and `VAPID_PRIVATE_KEY` (Supabase secret) for push — I'll generate keys and ask you to confirm if you want push, otherwise we ship without it for now.

---

## 10. Out of scope (deferred)

- SMS notifications.
- Custom notification sounds.
- Per-task custom reminder times (uses fixed T-1h rule).
- Snooze/postpone (could add easily later).
- Notification grouping in bell (just chronological list).

---

## 11. Email setup — needs your action

Email reminders for high-priority items need a verified sender domain. You don't have one configured yet. Two options:

**Option A — Set up email domain now** (recommended if you want email reminders): I'll trigger the setup dialog after you approve. Takes ~2 min to enter your domain; DNS verifies in the background. In-app + push work immediately; email starts working once DNS verifies.

**Option B — Skip email for now**: Build everything else (in-app, push, full preferences). Add email later by setting up the domain. The email toggle in settings will be disabled with a tooltip explaining how to enable it.

Tell me which option, and approve the plan. After approval I'll: run the migration, create the cron job, build all UI + scheduler + push + bell + settings + interview events, then (if Option A) walk you through email domain setup.
