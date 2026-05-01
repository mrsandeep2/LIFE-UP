import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  useInterviewQuestions,
  useAddInterviewQuestion,
  useUpdateInterviewQuestion,
  useDeleteInterviewQuestion,
  uploadImage,
  QUESTION_CATEGORY_SUGGESTIONS,
  type InterviewQuestion,
} from "@/lib/data-phase4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Plus, Search, Trash2, Pencil, ChevronDown, ImageIcon, X, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/interview")({
  component: InterviewPage,
});

function InterviewPage() {
  const { data: questions = [], isLoading } = useInterviewQuestions();
  const [search, setSearch] = React.useState("");
  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<InterviewQuestion | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) if (q.category) set.add(q.category);
    return Array.from(set).sort();
  }, [questions]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((it) => {
      if (activeCat && it.category !== activeCat) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.answer.toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      );
    });
  }, [questions, search, activeCat]);

  const openAdd = () => {
    setEditing(null);
    setOpenForm(true);
  };
  const openEdit = (q: InterviewQuestion) => {
    setEditing(q);
    setOpenForm(true);
  };

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> Interview Questions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Your personal prep deck. Add, search, revisit.</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-white shadow-glow">
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, answers, categories…"
            className="pl-9"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <CategoryChip label="All" active={activeCat === null} onClick={() => setActiveCat(null)} />
            {categories.map((c) => (
              <CategoryChip key={c} label={c} active={activeCat === c} onClick={() => setActiveCat(c)} />
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
      ) : questions.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          No questions match your search.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              expanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onEdit={() => openEdit(q)}
            />
          ))}
        </div>
      )}

      <QuestionFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
      />
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold border transition-all",
        active
          ? "gradient-primary text-white border-transparent shadow-glow"
          : "border-border bg-background hover:bg-muted text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center space-y-4">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-primary shadow-glow">
        <BookOpen className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold">No questions yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Build a deck you can revisit before every interview.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {["DSA", "System Design", "Behavioral"].map((c) => (
          <span key={c} className="text-[10px] uppercase tracking-wider rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
            {c}
          </span>
        ))}
      </div>
      <Button onClick={onAdd} className="gradient-primary text-white">
        <Plus className="h-4 w-4" /> Add your first question
      </Button>
    </div>
  );
}

function QuestionCard({
  question,
  expanded,
  onToggle,
  onEdit,
}: {
  question: InterviewQuestion;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const del = useDeleteInterviewQuestion();
  const preview = question.answer.length > 80 ? question.answer.slice(0, 80).trimEnd() + "…" : question.answer;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-shadow",
        expanded && "shadow-glow border-primary/40",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        {question.image_url && (
          <img
            src={question.image_url}
            alt=""
            className="h-12 w-12 rounded-lg object-cover shrink-0 border border-border"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug">{question.title}</div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview || "No answer yet."}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {question.category && (
              <span className="text-[10px] font-semibold uppercase rounded-full bg-primary/10 text-primary px-2 py-0.5">
                {question.category}
              </span>
            )}
            {question.image_url && !expanded && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" /> image
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-4">
              {question.image_url && (
                <img
                  src={question.image_url}
                  alt=""
                  className="w-full rounded-xl border border-border max-h-96 object-contain bg-muted/30"
                />
              )}
              {question.answer ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {question.answer}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No answer recorded yet.</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => {
                    if (confirm("Delete this question?")) {
                      del.mutate(question.id);
                      toast.success("Question deleted");
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QuestionFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: InterviewQuestion | null;
}) {
  const { user } = useAuth();
  const add = useAddInterviewQuestion();
  const update = useUpdateInterviewQuestion();

  const [title, setTitle] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setAnswer(editing?.answer ?? "");
      setCategory(editing?.category ?? "");
      setImageUrl(editing?.image_url ?? null);
    }
  }, [open, editing]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage({ file, userId: user.id, folder: "interview" });
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
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          patch: {
            title: title.trim(),
            answer,
            category: category.trim() || null,
            image_url: imageUrl,
          },
        });
        toast.success("Question updated");
      } else {
        await add.mutateAsync({
          title: title.trim(),
          answer,
          category: category.trim() || null,
          image_url: imageUrl,
        });
        toast.success("Question added");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>Save it, search it later, never re-google the same thing twice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is event loop in JavaScript?"
              autoFocus
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="DSA, Behavioral, System Design…"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {QUESTION_CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Answer / notes</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Plain text. Line breaks are kept."
              rows={8}
              className="font-mono text-[13px]"
            />
          </div>
          <div>
            <Label>Image (optional)</Label>
            {imageUrl ? (
              <div className="mt-2 relative inline-block">
                <img src={imageUrl} alt="" className="max-h-40 rounded-lg border border-border" />
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
              <label className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Click to upload an image"}
                <input type="file" accept="image/*" onChange={onPickFile} className="sr-only" disabled={uploading} />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-white" disabled={uploading}>
              {editing ? "Save changes" : "Add question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
