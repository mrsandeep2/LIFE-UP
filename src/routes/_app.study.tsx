import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSubjects,
  useTopics,
  useStudySessions,
  useAddSubject,
  useDeleteSubject,
  useAddTopic,
  useUpdateTopic,
  useDeleteTopic,
  useLogStudySession,
  type Subject,
  type Topic,
  type TopicStatus,
} from "@/lib/data-phase2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, BookOpen, Calendar, Clock, Trash2, Check, Circle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/study")({
  component: StudyPage,
});

const COLOR_TOKENS = ["violet", "flame", "clover", "warning", "primary"] as const;

function StudyPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: topics = [] } = useTopics();
  const { data: sessions = [] } = useStudySessions();
  const addSubject = useAddSubject();
  const [open, setOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [active, setActive] = React.useState<Subject | null>(null);
  const [form, setForm] = React.useState({ name: "", exam_date: "", target_hours: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await addSubject.mutateAsync({
        name: form.name.trim(),
        exam_date: form.exam_date || null,
        target_hours: form.target_hours ? Number(form.target_hours) : null,
      });
      toast.success("Subject added");
      setForm({ name: "", exam_date: "", target_hours: "" });
      setOpen(false);
    } catch {
      toast.error("Couldn't add subject");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Subjects → topics → measurable progress.</p>
        </div>
        <div className="flex gap-2">
          {subjects.length > 0 && (
            <Button variant="outline" onClick={() => setLogOpen(true)}>
              <Timer className="h-4 w-4" /> Log study
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white shadow-glow">
                <Plus className="h-4 w-4" /> New subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New subject</DialogTitle>
                <DialogDescription>Break it down into topics next.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Exam date (optional)</Label>
                    <Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Target hours</Label>
                    <Input type="number" min="0" value={form.target_hours} onChange={(e) => setForm({ ...form, target_hours: e.target.value })} placeholder="40" />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary text-white">Create subject</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptySubjects onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, i) => {
            const subjectTopics = topics.filter((t) => t.subject_id === s.id);
            const subjectSessions = sessions.filter((ss) => ss.subject_id === s.id);
            const colorToken = COLOR_TOKENS[i % COLOR_TOKENS.length];
            return (
              <SubjectCard
                key={s.id}
                subject={s}
                topics={subjectTopics}
                hours={subjectSessions.reduce((sum, ss) => sum + ss.minutes, 0) / 60}
                colorToken={colorToken}
                onClick={() => setActive(s)}
              />
            );
          })}
        </div>
      )}

      <SubjectDrawer subject={active} onClose={() => setActive(null)} />
      <LogSessionDialog open={logOpen} onOpenChange={setLogOpen} subjects={subjects} topics={topics} />
    </div>
  );
}

function EmptySubjects({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center space-y-3">
      <div className="inline-grid place-items-center h-14 w-14 rounded-2xl gradient-primary mx-auto">
        <BookOpen className="h-7 w-7 text-white" />
      </div>
      <h3 className="font-display text-xl font-bold">No subjects yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Start with one subject. Break it into topics. That's how vague "I studied" becomes a measurable %.
      </p>
      <Button onClick={onAdd} className="gradient-primary text-white"><Plus className="h-4 w-4" /> Add first subject</Button>
    </div>
  );
}

function SubjectCard({
  subject, topics, hours, colorToken, onClick,
}: {
  subject: Subject; topics: Topic[]; hours: number; colorToken: string; onClick: () => void;
}) {
  const done = topics.filter((t) => t.status === "done").length;
  const pct = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0;
  const daysLeft = subject.exam_date ? differenceInDays(parseISO(subject.exam_date), new Date()) : null;

  return (
    <button onClick={onClick} className="text-left rounded-3xl border border-border bg-card p-5 shadow-card hover:shadow-glow transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold truncate">{subject.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {topics.length === 0 ? "No topics yet" : `${done} / ${topics.length} topics done`}
          </p>
        </div>
        <ProgressRing pct={pct} colorToken={colorToken} />
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="tabular-nums">{hours.toFixed(1)}h logged</span>
        </div>
        {daysLeft !== null && (
          <div className={cn(
            "flex items-center gap-1.5",
            daysLeft < 0 ? "text-muted-foreground" :
            daysLeft <= 7 ? "text-flame font-semibold" : "text-muted-foreground"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{daysLeft < 0 ? "Past" : `${daysLeft}d to exam`}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function ProgressRing({ pct, colorToken }: { pct: number; colorToken: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const strokeColor = `var(--color-${colorToken === "warning" ? "warning" : colorToken === "primary" ? "primary" : colorToken === "flame" ? "flame" : colorToken === "clover" ? "clover" : "primary"})`;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={strokeColor}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">{pct}%</div>
    </div>
  );
}

function SubjectDrawer({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const { data: topics = [] } = useTopics(subject?.id);
  const { data: sessions = [] } = useStudySessions();
  const addTopic = useAddTopic();
  const updateTopic = useUpdateTopic();
  const delTopic = useDeleteTopic();
  const delSubject = useDeleteSubject();
  const [newTopic, setNewTopic] = React.useState("");

  if (!subject) return null;

  const subjectSessions = sessions.filter((s) => s.subject_id === subject.id);
  const totalMin = subjectSessions.reduce((s, ss) => s + ss.minutes, 0);

  return (
    <Sheet open={!!subject} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{subject.name}</SheetTitle>
          {subject.exam_date && (
            <p className="text-sm text-muted-foreground">
              Exam · {format(parseISO(subject.exam_date), "MMM d, yyyy")}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Topics" value={topics.length} />
            <Stat label="Done" value={topics.filter((t) => t.status === "done").length} />
            <Stat label="Hours" value={(totalMin / 60).toFixed(1)} />
          </div>

          {/* Add topic */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTopic.trim()) return;
              addTopic.mutate({ subject_id: subject.id, title: newTopic.trim(), position: topics.length });
              setNewTopic("");
            }}
            className="flex gap-2"
          >
            <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="New topic…" />
            <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
          </form>

          {/* Topics */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Topics</Label>
            <ul className="mt-3 space-y-2">
              {topics.length === 0 && <li className="text-sm text-muted-foreground italic">Break this subject into topics to start tracking.</li>}
              {topics.map((t) => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  onCycle={() => {
                    const next: TopicStatus = t.status === "not_started" ? "in_progress" : t.status === "in_progress" ? "done" : "not_started";
                    updateTopic.mutate({ id: t.id, patch: { status: next } });
                  }}
                  onConfidence={(c) => updateTopic.mutate({ id: t.id, patch: { confidence: c } })}
                  onDelete={() => delTopic.mutate(t.id)}
                />
              ))}
            </ul>
          </div>

          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 w-full"
            onClick={() => {
              if (confirm(`Delete "${subject.name}"? All topics and study sessions will be removed.`)) {
                delSubject.mutate(subject.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete subject
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TopicRow({ topic, onCycle, onConfidence, onDelete }: {
  topic: Topic; onCycle: () => void; onConfidence: (c: number) => void; onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
      <button onClick={onCycle} className="shrink-0">
        {topic.status === "done" ? (
          <div className="grid h-6 w-6 place-items-center rounded-full gradient-primary"><Check className="h-3.5 w-3.5 text-white" /></div>
        ) : topic.status === "in_progress" ? (
          <div className="h-6 w-6 rounded-full border-2 border-warning grid place-items-center"><div className="h-2 w-2 rounded-full bg-warning" /></div>
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/40" />
        )}
      </button>
      <span className={cn("flex-1 text-sm truncate", topic.status === "done" && "line-through text-muted-foreground")}>{topic.title}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onConfidence(n)}
            className={cn("h-1.5 w-3 rounded-full transition-all", n <= topic.confidence ? "bg-clover" : "bg-muted")}
            aria-label={`Confidence ${n}`}
          />
        ))}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function LogSessionDialog({ open, onOpenChange, subjects, topics }: {
  open: boolean; onOpenChange: (o: boolean) => void; subjects: Subject[]; topics: Topic[];
}) {
  const log = useLogStudySession();
  const [subjectId, setSubjectId] = React.useState<string>("");
  const [topicId, setTopicId] = React.useState<string>("");
  const [minutes, setMinutes] = React.useState("30");

  React.useEffect(() => {
    if (open && subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
  }, [open, subjects, subjectId]);

  const filteredTopics = topics.filter((t) => t.subject_id === subjectId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(minutes, 10);
    if (!subjectId || !m || m <= 0) return;
    try {
      await log.mutateAsync({
        subject_id: subjectId,
        topic_id: topicId || null,
        minutes: m,
      });
      toast.success(`${m} minutes logged`);
      setMinutes("30");
      setTopicId("");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't log session");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log study session</DialogTitle>
          <DialogDescription>Takes 5 seconds. Builds your real picture.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filteredTopics.length > 0 && (
            <div>
              <Label>Topic (optional)</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger><SelectValue placeholder="Any topic" /></SelectTrigger>
                <SelectContent>
                  {filteredTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Minutes</Label>
            <div className="flex gap-2 mt-1">
              {[15, 30, 60, 90].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMinutes(String(m))}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-sm font-semibold transition-all",
                    minutes === String(m) ? "border-primary gradient-primary text-white" : "border-border hover:bg-muted",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <Input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-2" />
          </div>
          <Button type="submit" className="w-full gradient-primary text-white">Log session</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
