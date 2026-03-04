import { cn } from "@/lib/utils.ts";
import { Globe } from "lucide-react";

interface OnlineSearchToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function OnlineSearchToggle({
  checked,
  onCheckedChange,
  label,
}: OnlineSearchToggleProps) {
  return (
    <label className="relative flex-1 cursor-pointer group">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <div
        className={cn(
          "flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md border transition-all duration-300 ease-in-out",
          // Unchecked
          "bg-gradient-to-b from-muted/50 to-muted border-border text-muted-foreground",
          "hover:border-blue-600/50 hover:text-foreground hover:shadow-sm",
          // Checked
          "peer-checked:from-blue-900 peer-checked:to-blue-950 peer-checked:border-blue-800 peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-blue-900/20",
          "peer-checked:-translate-y-0.5",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
          "w-full",
        )}
      >
        <Globe
          className={cn(
            "h-4 w-4 transition-transform duration-500",
            checked && "rotate-180 text-white",
          )}
        />
        <span className="font-medium text-sm truncate select-none">
          {label}
        </span>

        <div
          className={cn(
            "absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 bg-white/40 rounded-full transition-all duration-300",
            checked ? "w-4 opacity-100" : "w-0 opacity-0",
          )}
        />
      </div>
    </label>
  );
}
