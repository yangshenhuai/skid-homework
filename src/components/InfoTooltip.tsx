import { type ReactNode, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function InfoTooltip({
  content,
  className,
  ariaLabel,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const openTooltip = () => {
    clearCloseTimeout();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpen(false), 120);
  };

  const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    if (
      event.relatedTarget &&
      event.currentTarget.contains(event.relatedTarget as Node)
    ) {
      return;
    }
    setOpen(false);
  };

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={openTooltip}
      onMouseLeave={scheduleClose}
      onFocusCapture={openTooltip}
      onBlurCapture={handleBlur}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={
          ariaLabel ?? (typeof content === "string" ? content : undefined)
        }
        aria-expanded={open}
        aria-describedby={tooltipId}
        onFocus={openTooltip}
        onBlur={scheduleClose}
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className={cn(
          "absolute left-1/2 top-full z-20 w-64 -translate-x-1/2 translate-y-2 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleClose}
      >
        {content}
      </div>
    </span>
  );
}
