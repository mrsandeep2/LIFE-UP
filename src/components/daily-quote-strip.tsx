import * as React from "react";
import { getDailyQuote, formatHindiDate } from "@/lib/quotes";
import { Quote } from "lucide-react";

export function DailyQuoteStrip() {
  // Recompute once per mount. The deterministic logic guarantees the same
  // value for the whole local day.
  const [date] = React.useState(() => new Date());
  const quote = React.useMemo(() => getDailyQuote(date), [date]);
  const dateLabel = React.useMemo(() => formatHindiDate(date), [date]);

  return (
    <div
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 border-l-4 border-l-primary/60"
      style={{ fontFamily: "'Noto Sans Devanagari', 'Noto Serif Devanagari', system-ui, sans-serif" }}
    >
      <div className="text-sm lg:text-base font-semibold tracking-wide text-foreground/90 shrink-0">
        {dateLabel}
      </div>
      <div className="hidden lg:block h-6 w-px bg-border" />
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Quote className="h-4 w-4 text-primary/70 shrink-0 mt-1" />
        <div className="min-w-0">
          <p className="text-sm lg:text-[15px] leading-relaxed text-foreground/85 italic">
            {quote.text}
          </p>
          <p className="text-[11px] lg:text-xs text-muted-foreground mt-1">— {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
