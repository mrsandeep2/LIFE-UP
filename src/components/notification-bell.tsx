import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, X, CheckSquare, Flame, Briefcase, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useDismiss,
  relativeTime,
  routeFor,
  type Notification,
  type NotificationCategory,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORY_ICON: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  habit: Flame,
  interview: Briefcase,
  career: Briefcase,
};

const CATEGORY_TINT: Record<NotificationCategory, string> = {
  task: "bg-primary/12 text-primary",
  habit: "bg-warning/15 text-warning",
  interview: "bg-clover/15 text-clover",
  career: "bg-accent/40 text-accent-foreground",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

function NotificationItem({
  n,
  onClick,
  onDismiss,
  onMarkRead,
}: {
  n: Notification;
  onClick: () => void;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const Icon = CATEGORY_ICON[n.category] ?? Bell;
  const unread = !n.read_at;
  return (
    <div
      onClick={() => {
        if (unread) onMarkRead(n.id);
        onClick();
      }}
      className={cn(
        "press group relative flex cursor-pointer gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:bg-muted/60",
        unread && "bg-primary/[0.04] border-primary/15",
      )}
    >
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", CATEGORY_TINT[n.category])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{n.title}</div>
            {n.body && (
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
            )}
          </div>
          {unread && (
            <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[n.priority])} />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="font-semibold">{n.category}</span>
          <span>·</span>
          <span>{relativeTime(n.created_at)}</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(n.id);
        }}
        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PanelBody({ onNavigate }: { onNavigate: () => void }) {
  const { data: items = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const dismiss = useDismiss();
  const unread = items.filter((i) => !i.read_at).length;

  return (
    <div className="flex max-h-[70vh] min-h-[300px] flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-display text-base font-bold">Notifications</div>
          <div className="text-[11px] text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </div>
        </div>
        {unread > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="press text-xs"
            onClick={() => {
              markAll.mutate();
              toast.success("All marked as read");
            }}
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="font-semibold">You're all caught up ✨</div>
            <div className="text-xs text-muted-foreground">
              Reminders for tasks, habits, and interviews show up here.
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onMarkRead={(id) => markRead.mutate(id)}
                onDismiss={(id) => dismiss.mutate(id)}
                onClick={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2">
        <Link
          to="/settings/notifications"
          onClick={onNavigate}
          className="press flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" /> Notification settings
        </Link>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const unread = useUnreadCount();
  const prevUnread = React.useRef(unread);
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    if (unread > prevUnread.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1400);
      return () => clearTimeout(t);
    }
    prevUnread.current = unread;
  }, [unread]);

  const trigger = (
    <Button size="icon" variant="ghost" aria-label="Notifications" className="press relative">
      <Bell className={cn("h-4 w-4", pulse && "animate-pulse text-primary")} />
      {unread > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white gradient-primary ring-2 ring-background",
            pulse && "animate-pulse",
          )}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="press relative rounded-md p-2 text-foreground hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className={cn("h-4 w-4", pulse && "animate-pulse text-primary")} />
          {unread > 0 && (
            <span
              className={cn(
                "absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white gradient-primary ring-2 ring-background",
                pulse && "animate-pulse",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <PanelBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <PanelBody onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
