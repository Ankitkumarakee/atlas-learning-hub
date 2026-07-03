import {
  type AdminDashboard,
  type ContentType,
  type ModerationStatus,
  type ModerationTarget,
  type UserManagementItem,
  type UserRole__1 as UserRoleType,
  UserRole__1,
  UserStatus,
} from "@/backend";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import {
  useActivateUser,
  useAdminDashboard,
  useApproveContent,
  useAssignRole,
  useDeleteContent,
  useHideContent,
  useSuspendUser,
} from "@/hooks/useQueries";
import type { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Check,
  EyeOff,
  FileText,
  Flag,
  Power,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const contentTypeRoute: Record<ContentType, string> = {
  blog: "/blogs",
  note: "/notes",
  video: "/videos",
};

const contentTypeLabel: Record<ContentType, string> = {
  blog: "Blog",
  note: "Note",
  video: "Video",
};

const roleLabel: Record<UserRoleType, string> = {
  admin: "Admin",
  creator: "Creator",
  user: "User",
};

const statusVariant: Record<
  UserStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  suspended: "destructive",
};

const moderationStatusVariant: Record<
  ModerationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  approved: "default",
  flagged: "destructive",
  hidden: "outline",
};

const ROLE_OPTIONS: Array<{ value: UserRoleType; label: string }> = [
  { value: UserRole__1.admin, label: "Admin" },
  { value: UserRole__1.creator, label: "Creator" },
  { value: UserRole__1.user, label: "User" },
];

function formatDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ConfirmAction =
  | {
      kind: "suspend";
      userId: Principal;
      userName: string;
    }
  | {
      kind: "activate";
      userId: Principal;
      userName: string;
    };

export default function AdminDashboardPage() {
  const { isAdmin, isSignedIn } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminDashboard();
  const qc = useQueryClient();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const assignRole = useAssignRole();
  const approveContent = useApproveContent();
  const hideContent = useHideContent();
  const deleteContent = useDeleteContent();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRoleType>>(
    {},
  );
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  if (!isSignedIn) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Sign in required"
          description="The admin dashboard is restricted. Sign in with Internet Identity to continue."
          actionLabel="Sign in"
          onAction={() => {
            window.location.assign("/");
          }}
          ocid="admin.empty_state"
        />
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="You don't have admin privileges. Contact a platform administrator if you believe this is a mistake."
          actionLabel="Back to home"
          onAction={() => {
            window.location.assign("/");
          }}
          ocid="admin.access_denied"
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <LoadingState variant="card" count={4} ocid="admin.loading_state" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState
          title="Couldn't load the admin dashboard"
          message={
            error instanceof Error
              ? error.message
              : "Please try again in a moment."
          }
          retryLabel="Retry"
          onRetry={() => {
            void refetch();
          }}
          ocid="admin.error_state"
        />
      </section>
    );
  }

  const {
    totals,
    users,
    moderationQueue,
    platformGrowthOverTime,
    contentDistribution,
  } = data;

  const growthData: Array<Record<string, unknown>> = platformGrowthOverTime.map(
    (p) => ({
      date: p.date,
      newUsers: Number(p.newUsers),
      newContent: Number(p.newContent),
    }),
  );

  const distributionData: Array<Record<string, unknown>> = [
    { name: "Blogs", value: Number(contentDistribution.blogs) },
    { name: "Notes", value: Number(contentDistribution.notes) },
    { name: "Videos", value: Number(contentDistribution.videos) },
  ];

  const distributionEmpty = distributionData.every(
    (d) => Number(d.value) === 0,
  );

  const handleConfirm = () => {
    if (!confirm) return;
    const { userId, userName } = confirm;
    if (confirm.kind === "suspend") {
      suspendUser.mutate(userId, {
        onSuccess: () => toast.success(`${userName} suspended`),
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Failed to suspend user",
          ),
      });
    } else {
      activateUser.mutate(userId, {
        onSuccess: () => toast.success(`${userName} activated`),
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Failed to activate user",
          ),
      });
    }
    setConfirm(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Platform moderation, user management, and growth insights.
        </p>
      </header>

      {/* Overview stat cards */}
      <section
        data-ocid="admin.overview.section"
        aria-label="Platform overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={Users}
          label="Total users"
          value={Number(totals.totalUsers)}
          hint="All registered accounts"
          ocid="admin.overview.card.users"
        />
        <StatCard
          icon={UserCog}
          label="Creators"
          value={Number(totals.totalCreators)}
          hint="Active content creators"
          tone="accent"
          ocid="admin.overview.card.creators"
        />
        <StatCard
          icon={FileText}
          label="Content items"
          value={Number(totals.totalContentItems)}
          hint="Blogs, notes, and videos"
          tone="chart"
          ocid="admin.overview.card.content"
        />
        <StatCard
          icon={Flag}
          label="Flagged items"
          value={Number(totals.flaggedItemsCount)}
          hint="Awaiting moderation"
          ocid="admin.overview.card.flagged"
        />
      </section>

      {/* Charts row */}
      <section
        className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2"
        aria-label="Platform analytics charts"
      >
        {isFetching && growthData.length === 0 ? (
          <LoadingState
            variant="card"
            count={1}
            ocid="admin.growth.loading_state"
          />
        ) : growthData.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No growth data yet"
            description="New user and content signups will appear here over time."
            ocid="admin.growth.empty_state"
          />
        ) : (
          <ChartContainer
            title="Platform growth"
            description="New users and content over time"
            type="line"
            data={growthData}
            xKey="date"
            series={[
              { key: "newUsers", name: "New users" },
              { key: "newContent", name: "New content" },
            ]}
            height={260}
            ocid="admin.growth.chart"
          />
        )}

        {isFetching && distributionEmpty ? (
          <LoadingState
            variant="card"
            count={1}
            ocid="admin.distribution.loading_state"
          />
        ) : distributionEmpty ? (
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Once creators publish content, the breakdown will appear here."
            ocid="admin.distribution.empty_state"
          />
        ) : (
          <ChartContainer
            title="Content distribution"
            description="Breakdown by content type"
            type="pie"
            data={distributionData}
            xKey="name"
            valueKey="value"
            labelKey="name"
            series={[{ key: "value", name: "Items" }]}
            height={260}
            ocid="admin.distribution.chart"
          />
        )}
      </section>

      {/* User management table */}
      <UserManagementSection
        users={users}
        roleDrafts={roleDrafts}
        setRoleDrafts={setRoleDrafts}
        onSuspend={(userId, userName) =>
          setConfirm({ kind: "suspend", userId, userName })
        }
        onActivate={(userId, userName) =>
          setConfirm({ kind: "activate", userId, userName })
        }
        onAssignRole={(userId, role, userName) => {
          // Optimistic update: immediately reflect the new role in the cache.
          qc.setQueryData<AdminDashboard>(["admin-dashboard"], (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              users: prev.users.map((u) =>
                u.id.toString() === userId.toString() ? { ...u, role } : u,
              ),
            };
          });
          assignRole.mutate(
            { user: userId, role },
            {
              onSuccess: () => {
                toast.success(`${userName} is now ${roleLabel[role]}`);
                setRoleDrafts((prev) => {
                  const next = { ...prev };
                  delete next[userId.toString()];
                  return next;
                });
              },
              onError: (e) => {
                // Roll back by invalidating to refetch the true state.
                qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
                toast.error(
                  e instanceof Error ? e.message : "Failed to update role",
                );
              },
            },
          );
        }}
        suspendPending={suspendUser.isPending}
        activatePending={activateUser.isPending}
        assignPending={assignRole.isPending}
      />

      {/* Moderation queue */}
      <ModerationSection
        items={moderationQueue}
        onApprove={(target) =>
          approveContent.mutate(target, {
            onSuccess: () => toast.success("Content approved"),
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Failed to approve"),
          })
        }
        onHide={(target) =>
          hideContent.mutate(target, {
            onSuccess: () => toast.success("Content hidden"),
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Failed to hide"),
          })
        }
        onDelete={(target) =>
          deleteContent.mutate(target, {
            onSuccess: () => toast.success("Content deleted"),
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Failed to delete"),
          })
        }
        approvePending={approveContent.isPending}
        hidePending={hideContent.isPending}
        deletePending={deleteContent.isPending}
      />

      {/* Confirmation dialog for suspend / activate */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent data-ocid="admin.confirm.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "suspend" ? "Suspend user?" : "Activate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "suspend"
                ? `${confirm.userName} will lose access to their account until reactivated. This action can be reversed.`
                : `${confirm?.userName ?? ""} will regain full access to their account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="admin.confirm.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="admin.confirm.confirm_button"
              onClick={handleConfirm}
            >
              {confirm?.kind === "suspend" ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* User management section                                             */
/* ------------------------------------------------------------------ */

interface UserManagementSectionProps {
  users: UserManagementItem[];
  roleDrafts: Record<string, UserRoleType>;
  setRoleDrafts: React.Dispatch<
    React.SetStateAction<Record<string, UserRoleType>>
  >;
  onSuspend: (userId: Principal, userName: string) => void;
  onActivate: (userId: Principal, userName: string) => void;
  onAssignRole: (
    userId: Principal,
    role: UserRoleType,
    userName: string,
  ) => void;
  suspendPending: boolean;
  activatePending: boolean;
  assignPending: boolean;
}

function UserManagementSection({
  users,
  roleDrafts,
  setRoleDrafts,
  onSuspend,
  onActivate,
  onAssignRole,
  suspendPending,
  activatePending,
  assignPending,
}: UserManagementSectionProps) {
  return (
    <section data-ocid="admin.users.section" className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          User management
        </h2>
        <Badge variant="secondary">{users.length} users</Badge>
      </div>
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Registered users will appear here for management."
          ocid="admin.users.empty_state"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table aria-label="User management">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Content</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => {
                    const userIdKey = user.id.toString();
                    const isActive = user.status === UserStatus.active;
                    const draftRole = roleDrafts[userIdKey] ?? user.role;
                    return (
                      <TableRow
                        key={userIdKey}
                        data-ocid={`admin.users.row.${index + 1}`}
                      >
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {roleLabel[user.role] ?? user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariant[user.status] ?? "secondary"}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {Number(user.contentCount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {isActive ? (
                              <Button
                                data-ocid={`admin.users.suspend_button.${index + 1}`}
                                variant="outline"
                                size="sm"
                                disabled={suspendPending}
                                aria-label={`Suspend ${user.name}`}
                                onClick={() => onSuspend(user.id, user.name)}
                              >
                                <Ban className="mr-1 h-3.5 w-3.5" />
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                data-ocid={`admin.users.activate_button.${index + 1}`}
                                variant="outline"
                                size="sm"
                                disabled={activatePending}
                                aria-label={`Activate ${user.name}`}
                                onClick={() => onActivate(user.id, user.name)}
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                Activate
                              </Button>
                            )}
                            <Select
                              value={draftRole}
                              onValueChange={(v) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [userIdKey]: v as UserRoleType,
                                }))
                              }
                            >
                              <SelectTrigger
                                data-ocid={`admin.users.role_select.${index + 1}`}
                                className="h-8 w-[110px]"
                                aria-label={`Change role for ${user.name}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              data-ocid={`admin.users.assign_role_button.${index + 1}`}
                              variant="secondary"
                              size="sm"
                              disabled={
                                assignPending || draftRole === user.role
                              }
                              aria-label={`Assign ${roleLabel[draftRole]} role to ${user.name}`}
                              onClick={() =>
                                onAssignRole(user.id, draftRole, user.name)
                              }
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Set
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Moderation queue section                                            */
/* ------------------------------------------------------------------ */

interface ModerationSectionProps {
  items: AdminDashboard["moderationQueue"];
  onApprove: (target: ModerationTarget) => void;
  onHide: (target: ModerationTarget) => void;
  onDelete: (target: ModerationTarget) => void;
  approvePending: boolean;
  hidePending: boolean;
  deletePending: boolean;
}

function ModerationSection({
  items,
  onApprove,
  onHide,
  onDelete,
  approvePending,
  hidePending,
  deletePending,
}: ModerationSectionProps) {
  return (
    <section data-ocid="admin.moderation.section" className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Content moderation queue
        </h2>
        <Badge variant="secondary">{items.length} items</Badge>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Queue is clear"
          description="No flagged content awaiting review. Nice work."
          ocid="admin.moderation.empty_state"
        />
      ) : (
        <ol
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          aria-label="Moderation queue"
        >
          {items.map((item, index) => {
            const base = contentTypeRoute[item.content.contentType] ?? "/blogs";
            const detailPath = `${base}/${item.content.id.toString()}`;
            const target: ModerationTarget = {
              id: item.content.id,
              contentType: item.content.contentType,
            };
            const typeLabel =
              contentTypeLabel[item.content.contentType] ??
              item.content.contentType;
            return (
              <Card
                key={`${item.content.id.toString()}-${index}`}
                data-ocid={`admin.moderation.item.${index + 1}`}
                className="flex flex-col gap-3"
              >
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          moderationStatusVariant[item.status] ?? "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                      <Badge variant="outline">{typeLabel}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.flaggedAt)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={detailPath}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {item.content.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      by {item.content.author.toText()}
                    </p>
                  </div>
                  {item.reason && (
                    <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Reason:{" "}
                      </span>
                      {item.reason}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      data-ocid={`admin.moderation.approve_button.${index + 1}`}
                      variant="default"
                      size="sm"
                      disabled={approvePending}
                      aria-label={`Approve ${item.content.title}`}
                      onClick={() => onApprove(target)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      data-ocid={`admin.moderation.hide_button.${index + 1}`}
                      variant="secondary"
                      size="sm"
                      disabled={hidePending}
                      aria-label={`Hide ${item.content.title}`}
                      onClick={() => onHide(target)}
                    >
                      <EyeOff className="mr-1 h-3.5 w-3.5" />
                      Hide
                    </Button>
                    <Button
                      data-ocid={`admin.moderation.delete_button.${index + 1}`}
                      variant="destructive"
                      size="sm"
                      disabled={deletePending}
                      aria-label={`Delete ${item.content.title}`}
                      onClick={() => onDelete(target)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ol>
      )}
    </section>
  );
}
