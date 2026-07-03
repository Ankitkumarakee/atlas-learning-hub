import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DisplayRole } from "@/types";
import { EyeOff, PenTool, Shield, User } from "lucide-react";

const roleConfig: Record<
  DisplayRole,
  { label: string; icon: typeof Shield; className: string }
> = {
  admin: {
    label: "Admin",
    icon: Shield,
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  creator: {
    label: "Creator",
    icon: PenTool,
    className: "border-accent/40 bg-accent/10 text-accent",
  },
  user: {
    label: "Member",
    icon: User,
    className: "border-border bg-secondary text-secondary-foreground",
  },
  guest: {
    label: "Guest",
    icon: EyeOff,
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function RoleBadge({
  role,
  className,
}: {
  role: DisplayRole;
  className?: string;
}) {
  const config = roleConfig[role];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", config.className, className)}
    >
      <Icon className="size-3" aria-hidden />
      {config.label}
    </Badge>
  );
}
