import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAddTask } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PRIORITIES: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];

export function QuickAddTask({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useAddTask();
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [due, setDue] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [est, setEst] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) {
      setTitle(""); setPriority("medium"); setDue(format(new Date(), "yyyy-MM-dd")); setEst("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await add.mutateAsync({
        title: title.trim(),
        priority,
        due_date: due || null,
        est_minutes: est ? Number(est) : null,
      });
      toast.success("Task added");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't add task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a task</DialogTitle>
          <DialogDescription>Keep it short. Visibility beats detail.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Apply to internship"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "h-10 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all",
                    priority === p
                      ? p === "high" ? "border-destructive bg-destructive/10 text-destructive"
                      : p === "medium" ? "border-warning bg-warning/10 text-warning"
                      : "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="est">Est. mins</Label>
              <Input id="est" type="number" min={5} step={5} value={est} onChange={(e) => setEst(e.target.value)} placeholder="30" />
            </div>
          </div>
          <Button type="submit" disabled={add.isPending} className="w-full h-11 gradient-primary text-white shadow-glow">
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
