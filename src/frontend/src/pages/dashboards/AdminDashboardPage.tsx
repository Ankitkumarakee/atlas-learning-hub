import {
  type ContentType,
  type ModerationStatus,
  type ModerationTarget,
  type UserRole__1 as UserRoleType,
  UserRole__1,
  UserStatus,
} from "@/backend";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
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

export default function AdminDashboardPage() {
  const { isAdmin, isSignedIn } = useAuth();
  const { data, isLoading, isError, error } = useAdminDashboard();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const assignRole = useAssignRole();
  const approveContent = useApproveContent();
  const hideContent = useHideContent();
  const deleteContent = useDeleteContent();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRoleType>>(
    {},
  );

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
        <EmptyState
          icon={ShieldAlert}
          title="Couldn't load the admin dashboard"
          description={
            error instanceof Error
              ? error.message
              : "Please try again in a moment."
          }
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
      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {growthData.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No growth data yet"
            description="New user and content signups will appear here over time."
            ocid="admin.growth.empty_state"
          />
        ) : (
          <ChartContainer
            title="Platform growth"
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

        {distributionEmpty ? (
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Once creators publish content, the breakdown will appear here."
            ocid="admin.distribution.empty_state"
          />
        ) : (
          <ChartContainer
            title="Content distribution"
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
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
                              variant={
                                statusVariant[user.status] ?? "secondary"
                              }
                            >
                              {user.status}
                            </Badge>
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
                                  disabled={suspendUser.isPending}
                                  onClick={() =>
                                    suspendUser.mutate(user.id, {
                                      onSuccess: () =>
                                        toast.success("User suspended"),
                                      onError: (e) =>
                                        toast.error(
                                          e instanceof Error
                                            ? e.message
                                            : "Failed to suspend user",
                                        ),
                                    })
                                  }
                                >
                                  <Ban className="mr-1 h-3.5 w-3.5" />
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  data-ocid={`admin.users.activate_button.${index + 1}`}
                                  variant="outline"
                                  size="sm"
                                  disabled={activateUser.isPending}
                                  onClick={() =>
                                    activateUser.mutate(user.id, {
                                      onSuccess: () =>
                                        toast.success("User activated"),
                                      onError: (e) =>
                                        toast.error(
                                          e instanceof Error
                                            ? e.message
                                            : "Failed to activate user",
                                        ),
                                    })
                                  }
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
                                  size="sm"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
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
                                  assignRole.isPending ||
                                  draftRole === user.role
                                }
                                onClick={() =>
                                  assignRole.mutate(
                                    { user: user.id, role: draftRole },
                                    {
                                      onSuccess: () => {
                                        toast.success("Role updated");
                                        setRoleDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[userIdKey];
                                          return next;
                                        });
                                      },
                                      onError: (e) =>
                                        toast.error(
                                          e instanceof Error
                                            ? e.message
                                            : "Failed to update role",
                                        ),
                                    },
                                  )
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

      {/* Moderation queue */}
      <section data-ocid="admin.moderation.section" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Content moderation queue
          </h2>
          <Badge variant="secondary">{moderationQueue.length} items</Badge>
        </div>
        {moderationQueue.length === 0 ? (
          <EmptyState
            icon={Check}
            title="Queue is clear"
            description="No flagged content awaiting review. Nice work."
            ocid="admin.moderation.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {moderationQueue.map((item, index) => {
              const base =
                contentTypeRoute[item.content.contentType] ?? "/blogs";
              const detailPath = `${base}/${item.content.id.toString()}`;
              const target: ModerationTarget = {
                id: item.content.id,
                contentType: item.content.contentType,
              };
              return (
                <Card
                  key={`${item.content.id.toString()}-${index}`}
                  data-ocid={`admin.moderation.item.${index + 1}`}
                  className="flex flex-col gap-3"
                >
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          moderationStatusVariant[item.status] ?? "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
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
                        by {item.content.author.toText()} ·{" "}
                        {contentTypeLabel[item.content.contentType] ??
                          item.content.contentType}
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
                        disabled={approveContent.isPending}
                        onClick={() =>
                          approveContent.mutate(target, {
                            onSuccess: () => toast.success("Content approved"),
                            onError: (e) =>
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Failed to approve",
                              ),
                          })
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        data-ocid={`admin.moderation.hide_button.${index + 1}`}
                        variant="secondary"
                        size="sm"
                        disabled={hideContent.isPending}
                        onClick={() =>
                          hideContent.mutate(target, {
                            onSuccess: () => toast.success("Content hidden"),
                            onError: (e) =>
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Failed to hide",
                              ),
                          })
                        }
                      >
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        Hide
                      </Button>
                      <Button
                        data-ocid={`admin.moderation.delete_button.${index + 1}`}
                        variant="destructive"
                        size="sm"
                        disabled={deleteContent.isPending}
                        onClick={() =>
                          deleteContent.mutate(target, {
                            onSuccess: () => toast.success("Content deleted"),
                            onError: (e) =>
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Failed to delete",
                              ),
                          })
                        }
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
