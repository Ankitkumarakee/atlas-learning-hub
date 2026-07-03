import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Optional trend or sub-label. */
  hint?: string;
  /** Accent color for the icon chip. */
  tone?: "primary" | "accent" | "chart";
  className?: string;
  ocid?: string;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  chart: "bg-chart-1/10 text-chart-1",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  className,
  ocid,
}: StatCardProps) {
  return (
    <Card className={cn("border-border/60", className)} data-ocid={ocid}>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            toneClasses[tone],
          )}
        >
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
