import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTasks, useToggleTask, useDeleteTask } from "@/lib/data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Check, Trash2, CalendarDays, Clock, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddTask } from "@/components/quick-add-task";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const [openAdd, setOpenAdd] = React.useState(false);
  const [tab, setTab] = React.useState("today");

  const filtered = tasks.filter((t) => {
    if (tab === "completed") return t.completed;
    if (t.completed) return false;
    if (tab === "today") {
      if (!t.due_date) return false;
      return isToday(parseISO(t.due_date));
    }
    if (tab === "week") {
      if (!t.due_date) return true;
      return isThisWeek(parseISO(t.due_date), { weekStartsOn: 1 });
    }
    return true;
  });

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-2 text-sm">Capture it. Ship it. Move on.</p>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="gradient-primary text-white shadow-glow">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} forceMount className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} onAdd={() => setOpenAdd(true)} />
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => <TaskRow key={t.id} task={t} />)}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <QuickAddTask open={openAdd} onOpenChange={setOpenAdd} />
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const priColor =
    task.priority === "high" ? "bg-destructive/15 text-destructive border-destructive/20" :
    task.priority === "medium" ? "bg-warning/15 text-warning border-warning/20" :
    "bg-muted text-muted-foreground border-transparent";

  return (
    <li className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-card hover:border-primary/30 transition-all">
      <button
        onClick={() => toggle.mutate({ id: task.id, completed: !task.completed })}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all",
          task.completed ? "border-primary gradient-primary" : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {task.completed && <Check className="h-3.5 w-3.5 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", task.completed && "line-through text-muted-foreground")}>
          {task.title}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          {task.due_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(task.due_date), "MMM d")}
            </span>
          )}
          {task.est_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.est_minutes < 60 ? `${task.est_minutes}m` : `${(task.est_minutes / 60).toFixed(1)}h`}
            </span>
          )}
        </div>
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border", priColor)}>
        {task.priority}
      </span>
      <button
        onClick={() => del.mutate(task.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState({ tab, onAdd }: { tab: string; onAdd: () => void }) {
  const messages: Record<string, { title: string; hint: string }> = {
    today: { title: "Nothing due today", hint: "A clean today is a gift. Plan ahead or take a breath." },
    week: { title: "Light week ahead", hint: "Add a task to give your week a shape." },
    completed: { title: "No completed tasks yet", hint: "Knock one off — it'll feel great." },
  };
  const m = messages[tab];
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-card border border-border mb-4">
        <Inbox className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-bold">{m.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{m.hint}</p>
      {tab !== "completed" && (
        <Button onClick={onAdd} className="mt-6 gradient-primary text-white shadow-glow">
          <Plus className="h-4 w-4" /> Add task
        </Button>
      )}
    </div>
  );
}
