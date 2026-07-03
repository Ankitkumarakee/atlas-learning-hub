import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  PenSquare,
  Search,
  Sparkles,
  Sun,
  Video,
} from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";

interface NavLink {
  label: string;
  to: string;
  icon: typeof BookOpen;
}

const primaryNav: NavLink[] = [
  { label: "Home", to: "/", icon: BookOpen },
  { label: "Blogs", to: "/blogs", icon: FileText },
  { label: "Notes", to: "/notes", icon: FileText },
  { label: "Videos", to: "/videos", icon: Video },
  { label: "AI Tutor", to: "/tutor", icon: Sparkles },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      data-ocid="theme.toggle"
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden />
      ) : (
        <Moon className="size-5" aria-hidden />
      )}
    </Button>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      className="focus-ring flex items-center gap-2 rounded-md font-display text-lg font-semibold tracking-tight transition-smooth hover:opacity-80"
      data-ocid="nav.logo_link"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <span className="hidden sm:inline">Atlas Learning Hub</span>
      <span className="sm:hidden">Atlas</span>
    </Link>
  );
}

function SearchBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) {
          navigate({
            to: "/search",
            search: { q: q.trim() } as { q: string },
          });
        }
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search content..."
        className="h-9 w-full pl-9"
        aria-label="Search content"
        data-ocid="nav.search_input"
      />
    </form>
  );
}

function DashboardsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-1 px-3"
          data-ocid="nav.dashboards.open_dropdown"
        >
          <LayoutDashboard className="size-4" aria-hidden />
          Dashboards
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        data-ocid="nav.dashboards.dropdown_menu"
      >
        <DropdownMenuLabel>Analytics</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/creator" data-ocid="nav.dashboard_creator_link">
            <PenSquare className="size-4" aria-hidden />
            Creator
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/student" data-ocid="nav.dashboard_student_link">
            <BookOpen className="size-4" aria-hidden />
            Student
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 lg:hidden"
          aria-label="Open navigation menu"
          data-ocid="nav.open_drawer"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0" data-ocid="nav.drawer">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="font-display text-lg">
            Atlas Learning Hub
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {primaryNav.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                data-ocid={`nav.drawer.${link.label.toLowerCase()}_link`}
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                {link.label}
              </Link>
            );
          })}
          <Separator className="my-2" />
          <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboards
          </p>
          <Link
            to="/dashboard/creator"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            data-ocid="nav.drawer.dashboard_creator_link"
          >
            <PenSquare className="size-4 text-muted-foreground" aria-hidden />
            Creator
          </Link>
          <Link
            to="/dashboard/student"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            data-ocid="nav.drawer.dashboard_student_link"
          >
            <BookOpen className="size-4 text-muted-foreground" aria-hidden />
            Student
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card shadow-subtle">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <MobileNav />
          <Logo />
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {primaryNav.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="focus-ring rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                data-ocid={`nav.${link.label.toLowerCase()}_link`}
              >
                {link.label}
              </Link>
            ))}
            <DashboardsMenu />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SearchBar className="hidden w-56 xl:block" />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 bg-background">{children ?? <Outlet />}</main>
      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>&copy; {year}. Built with care by the Atlas Team.</p>
          <p className="text-xs">
            Atlas Learning Hub · Free knowledge for everyone
          </p>
        </div>
      </footer>
    </div>
  );
}
