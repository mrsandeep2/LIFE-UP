import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useApplications,
  useAddApplication,
  useUpdateApplicationStatus,
  useDeleteApplication,
  useApplicationEvents,
  useAddApplicationNote,
  useUpdateApplication,
  APP_STATUSES,
  APP_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/lib/data-phase2";
import { useAuth } from "@/lib/auth";
import { uploadImage, INTERNSHIP_TYPES } from "@/lib/data-phase4";
import {
  useInterviewEvents,
  useAddInterviewEvent,
  useUpdateInterviewEvent,
  useDeleteInterviewEvent,
  INTERVIEW_KIND_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  type InterviewEvent,
  type InterviewEventKind,
  type InterviewEventOutcome,
} from "@/lib/interview-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus, Briefcase, MapPin, ExternalLink, Trash2, Clock, ArrowRight,
  Calendar as CalendarIcon, Upload, X, ImageIcon, Video, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/career")({
  component: CareerPage,
});

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  wishlist: "border-l-muted-foreground/40",
  applied: "border-l-primary",
  interview: "border-l-warning",
  offer: "border-l-clover",
  rejected: "border-l-destructive",
};

function CareerPage() {
  const { data: apps = [] } = useApplications();
  const updateStatus = useUpdateApplicationStatus();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<Application | null>(null);

  // Stats
  const active_count = apps.filter((a) => a.status !== "rejected" && a.status !== "offer").length;
  const interviewsThisWeek = apps.filter((a) => {
    if (a.status !== "interview") return false;
    return differenceInDays(new Date(), new Date(a.updated_at)) <= 7;
  }).length;
  const replied = apps.filter((a) => a.status !== "wishlist" && a.status !== "applied").length;
  const submitted = apps.filter((a) => a.status !== "wishlist").length;
  const responseRate = submitted > 0 ? Math.round((replied / submitted) * 100) : 0;

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" /> Career Pipeline
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Drag cards between columns. Every move is logged.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white shadow-glow">
              <Plus className="h-4 w-4" /> New application
            </Button>
          </DialogTrigger>
          <ApplicationFormDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Active" value={active_count} />
        <StatBox label="Interviews · 7d" value={interviewsThisWeek} />
        <StatBox label="Response rate" value={`${responseRate}%`} />
        <StatBox label="Total tracked" value={apps.length} />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {APP_STATUSES.map((status) => {
          const items = apps.filter((a) => a.status === status);
          return (
            <div
              key={status}
              className="rounded-2xl border border-border bg-card/40 p-3 min-h-[260px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                const app = apps.find((a) => a.id === id);
                if (app && app.status !== status) {
                  updateStatus.mutate({ id, from: app.status, to: status });
                  toast.success(`Moved to ${APP_STATUS_LABELS[status]}`);
                }
              }}
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {APP_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
                    Drop here
                  </div>
                ) : (
                  items.map((a) => (
                    <AppCard key={a.id} app={a} onClick={() => setActive(a)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile status switcher hint */}
      <p className="md:hidden text-xs text-center text-muted-foreground">
        Tip: tap a card to change its status from the detail view.
      </p>

      <ApplicationDrawer app={active} onClose={() => setActive(null)} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-2xl lg:text-3xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function CompanyAvatar({ app, size = "sm" }: { app: Application; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  if (app.image_url) {
    return (
      <img
        src={app.image_url}
        alt={app.company}
        className={cn(dim, "rounded-lg object-cover border border-border shrink-0")}
      />
    );
  }
  return (
    <div className={cn(dim, "rounded-lg grid place-items-center font-bold gradient-primary text-white shrink-0")}>
      {app.company.slice(0, 1).toUpperCase()}
    </div>
  );
}

function AppCard({ app, onClick }: { app: Application; onClick: () => void }) {
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", app.id)}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-l-4 border border-border bg-background/80 p-3 hover:shadow-card transition-all cursor-grab active:cursor-grabbing",
        STATUS_COLORS[app.status],
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyAvatar app={app} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{app.company}</div>
          <div className="text-xs text-muted-foreground truncate">{app.role}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
        {app.location && (
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location}</span>
        )}
        {app.internship_type && (
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">
            {app.internship_type}
          </span>
        )}
        <span className="inline-flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {app.applied_on
            ? format(parseISO(app.applied_on), "d MMM yyyy")
            : format(parseISO(app.updated_at), "d MMM")}
        </span>
      </div>
    </button>
  );
}

function ApplicationFormDialog({
  onClose,
  editing,
}: {
  onClose: () => void;
  editing?: Application | null;
}) {
  const { user } = useAuth();
  const add = useAddApplication();
  const update = useUpdateApplication();

  const [company, setCompany] = React.useState(editing?.company ?? "");
  const [role, setRole] = React.useState(editing?.role ?? "");
  const [location, setLocation] = React.useState(editing?.location ?? "");
  const [link, setLink] = React.useState(editing?.link ?? "");
  const [notes, setNotes] = React.useState(editing?.notes ?? "");
  const [status, setStatus] = React.useState<ApplicationStatus>(editing?.status ?? "wishlist");
  const [internshipType, setInternshipType] = React.useState<string>(editing?.internship_type ?? "");
  const [appliedOn, setAppliedOn] = React.useState<Date | undefined>(
    editing?.applied_on ? parseISO(editing.applied_on) : undefined,
  );
  const [imageUrl, setImageUrl] = React.useState<string | null>(editing?.image_url ?? null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage({ file, userId: user.id, folder: "applications" });
      setImageUrl(url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      toast.error("Company and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const appliedOnStr = appliedOn ? format(appliedOn, "yyyy-MM-dd") : null;
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          patch: {
            company: company.trim(),
            role: role.trim(),
            location: location.trim() || null,
            link: link.trim() || null,
            notes: notes.trim() || null,
            internship_type: internshipType || null,
            applied_on: appliedOnStr,
            image_url: imageUrl,
          },
        });
        toast.success("Application updated");
      } else {
        await add.mutateAsync({
          company: company.trim(),
          role: role.trim(),
          location: location.trim() || null,
          link: link.trim() || null,
          notes: notes.trim() || null,
          internship_type: internshipType || null,
          applied_on: appliedOnStr,
          image_url: imageUrl,
          status,
        });
        toast.success("Application added");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit application" : "New application"}</DialogTitle>
        <DialogDescription>Track where you applied, what kind of role, and what's next.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Company *</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Stripe" autoFocus />
          </div>
          <div>
            <Label>Role *</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Software Engineer Intern" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru / Remote" />
          </div>
          <div>
            <Label>Internship type</Label>
            <Select value={internshipType} onValueChange={setInternshipType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INTERNSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Application date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !appliedOn && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {appliedOn ? format(appliedOn, "d MMMM yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={appliedOn}
                  onSelect={setAppliedOn}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          {!editing && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{APP_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label>Job link</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <Label>Logo / screenshot (optional)</Label>
          {imageUrl ? (
            <div className="mt-2 relative inline-block">
              <img src={imageUrl} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white shadow-card"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload company logo or screenshot"}
              <input type="file" accept="image/*" onChange={onPickFile} className="sr-only" disabled={uploading} />
            </label>
          )}
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Recruiter contact, role details…"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="gradient-primary text-white" disabled={submitting || uploading}>
            {editing ? "Save changes" : "Add application"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ApplicationDrawer({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const { data: events = [] } = useApplicationEvents(app?.id ?? null);
  const updateStatus = useUpdateApplicationStatus();
  const update = useUpdateApplication();
  const addNote = useAddApplicationNote();
  const del = useDeleteApplication();
  const [note, setNote] = React.useState("");
  const [notes, setNotes] = React.useState(app?.notes ?? "");
  const [editOpen, setEditOpen] = React.useState(false);

  React.useEffect(() => {
    setNotes(app?.notes ?? "");
  }, [app?.id]);

  if (!app) return null;

  const saveNotes = () => {
    if (notes !== app.notes) update.mutate({ id: app.id, patch: { notes } });
  };

  return (
    <Sheet open={!!app} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <CompanyAvatar app={app} size="md" />
            <div className="min-w-0">
              <SheetTitle className="font-display text-2xl truncate">{app.company}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">{app.role}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status switcher */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {APP_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s !== app.status) {
                      updateStatus.mutate({ id: app.id, from: app.status, to: s });
                    }
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold border transition-all",
                    app.status === s
                      ? "gradient-primary text-white border-transparent shadow-glow"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {APP_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {app.location && <Meta label="Location" value={app.location} />}
            {app.internship_type && <Meta label="Type" value={app.internship_type} />}
            {app.applied_on && <Meta label="Applied" value={format(parseISO(app.applied_on), "d MMMM yyyy")} />}
            {app.link && (
              <a href={app.link} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center gap-1 text-primary hover:underline text-sm">
                <ExternalLink className="h-3 w-3" /> Open posting
              </a>
            )}
          </div>

          {app.image_url && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Image</Label>
              <img src={app.image_url} alt="" className="mt-2 w-full rounded-xl border border-border max-h-64 object-contain bg-muted/30" />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Recruiter contact, prep notes…"
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Quick log note */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              addNote.mutate({ id: app.id, note: note.trim() });
              setNote("");
              toast.success("Logged");
            }}
            className="flex gap-2"
          >
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Log an event (e.g. Round 1 scheduled)"
            />
            <Button type="submit" size="sm">Log</Button>
          </form>

          {/* Interview events */}
          <InterviewEventsSection applicationId={app.id} />

          {/* Timeline */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Timeline</Label>
            <ol className="mt-3 space-y-2">
              {events.length === 0 && <li className="text-xs text-muted-foreground">No events yet.</li>}
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <div className="pt-1">
                    <div className="h-2 w-2 rounded-full gradient-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(ev.occurred_at), "MMM d · h:mm a")}
                    </div>
                    <div>
                      {ev.event_type === "status_change" && (
                        <span className="inline-flex items-center gap-1">
                          {ev.from_status ? APP_STATUS_LABELS[ev.from_status as ApplicationStatus] : "—"}
                          <ArrowRight className="h-3 w-3" />
                          {ev.to_status ? APP_STATUS_LABELS[ev.to_status as ApplicationStatus] : "—"}
                        </span>
                      )}
                      {ev.event_type === "created" && <span>Created · {APP_STATUS_LABELS[(ev.to_status as ApplicationStatus) ?? "wishlist"]}</span>}
                      {ev.event_type === "note" && <span className="text-muted-foreground italic">"{ev.note}"</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  Edit details
                </Button>
              </DialogTrigger>
              <ApplicationFormDialog editing={app} onClose={() => setEditOpen(false)} />
            </Dialog>
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Delete this application? Its history will be lost.")) {
                  del.mutate(app.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

// ============================================================================
// Interview events
// ============================================================================

const INTERVIEW_KINDS: InterviewEventKind[] = ["phone_screen", "technical", "onsite", "final", "other"];
const INTERVIEW_OUTCOMES: InterviewEventOutcome[] = ["pending", "passed", "failed", "cancelled", "no_show"];

const OUTCOME_TINT: Record<InterviewEventOutcome, string> = {
  pending: "bg-muted text-muted-foreground",
  passed: "bg-clover/15 text-clover",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-warning/15 text-warning",
};

function InterviewEventsSection({ applicationId }: { applicationId: string }) {
  const { data: events = [] } = useInterviewEvents(applicationId);
  const [open, setOpen] = React.useState(false);
  const upcoming = events.filter((e) => !e.outcome || e.outcome === "pending");
  const past = events.filter((e) => e.outcome && e.outcome !== "pending");

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Interviews
        </Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="press hover-lift h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Schedule
            </Button>
          </DialogTrigger>
          <InterviewEventDialog
            applicationId={applicationId}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </div>

      <div className="mt-3 space-y-2">
        {events.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
            No rounds scheduled yet
          </div>
        )}

        {upcoming.map((ev) => (
          <InterviewEventCard key={ev.id} event={ev} upcoming />
        ))}

        {past.length > 0 && upcoming.length > 0 && (
          <div className="pt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Past rounds
          </div>
        )}

        {past.map((ev) => (
          <InterviewEventCard key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
}

function InterviewEventCard({
  event,
  upcoming,
}: {
  event: InterviewEvent;
  upcoming?: boolean;
}) {
  const update = useUpdateInterviewEvent();
  const del = useDeleteInterviewEvent();
  const at = parseISO(event.scheduled_at);
  const isPast = at.getTime() < Date.now();
  const outcome: InterviewEventOutcome = (event.outcome ?? "pending") as InterviewEventOutcome;

  return (
    <div
      className={cn(
        "press hover-lift group relative rounded-xl border bg-background/80 p-3 transition-all",
        upcoming ? "border-l-4 border-l-primary border-border" : "border-border opacity-90",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{event.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {INTERVIEW_KIND_LABELS[event.kind as InterviewEventKind]} · {event.duration_minutes}m
              </div>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", OUTCOME_TINT[outcome])}>
              {INTERVIEW_OUTCOME_LABELS[outcome]}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(at, "MMM d, h:mm a")}</span>
            {upcoming && !isPast && (
              <span className="text-primary font-semibold">
                · in {formatDistanceToNow(at)}
              </span>
            )}
          </div>
          {event.location && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Outcome actions */}
          {(upcoming || outcome === "pending") && isPast && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  update.mutate({ id: event.id, patch: { outcome: "passed" } });
                  toast.success("Marked as passed");
                }}
                className="press inline-flex items-center gap-1 rounded-full bg-clover/15 px-2 py-1 text-[10px] font-semibold text-clover hover:bg-clover/25"
              >
                <CheckCircle2 className="h-3 w-3" /> Passed
              </button>
              <button
                onClick={() => {
                  update.mutate({ id: event.id, patch: { outcome: "failed" } });
                  toast("Logged");
                }}
                className="press inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/25"
              >
                <XCircle className="h-3 w-3" /> Failed
              </button>
              <button
                onClick={() => {
                  update.mutate({ id: event.id, patch: { outcome: "cancelled" } });
                }}
                className="press rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/70"
              >
                Cancelled
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm("Delete this interview round?")) {
              del.mutate(event.id);
              toast.success("Deleted");
            }
          }}
          className="press grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function InterviewEventDialog({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const add = useAddInterviewEvent();
  const [kind, setKind] = React.useState<InterviewEventKind>("technical");
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState("10:00");
  const [duration, setDuration] = React.useState(60);
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }
    const [hh, mm] = time.split(":").map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(hh, mm, 0, 0);

    setSubmitting(true);
    try {
      await add.mutateAsync({
        application_id: applicationId,
        kind,
        title: title.trim(),
        scheduled_at: scheduled.toISOString(),
        duration_minutes: duration,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Interview scheduled");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Schedule interview</DialogTitle>
        <DialogDescription>
          You'll get reminders 24 hours, 1 hour, and 10 minutes before.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as InterviewEventKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{INTERVIEW_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input
              type="number"
              min={15}
              max={480}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
            />
          </div>
        </div>

        <div>
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Technical round 1"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "MMM d, yyyy") : "Pick"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Time *</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Location / link</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Google Meet link or office address"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Interviewers, prep topics…"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="gradient-primary text-white" disabled={submitting}>
            Schedule
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

