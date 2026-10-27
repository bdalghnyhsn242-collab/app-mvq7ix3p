import type React from "react";
import { Link, NavLink, Navigate } from "react-router-dom";
import { Bot, Home, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AUTH_ENABLED } from "@/config/features";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AppLayoutProps = {
  children: React.ReactNode;
};

const navItems = [
  { path: "/", label: "Home", icon: Home },
];

function initials(nameOrEmail: string) {
  const parts = nameOrEmail.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  if (session.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (AUTH_ENABLED && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const userName = session.user?.full_name || session.user?.email || "Guest";
  const userEmail = session.user?.email || "";

  async function handleSignOut() {
    const { error } = await signOut();
    if (!error) {
      toast.success("Signed out");
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-5">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <span className="hidden sm:inline">{import.meta.env.VITE_APP_NAME || "App Base"}</span>
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          isActive && "bg-accent text-foreground",
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={session.user?.avatar_url ?? undefined} alt={userName} />
                      <AvatarFallback>{initials(userName)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-36 truncate text-sm sm:inline">{userName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <span>{userName}</span>
                      {userEmail ? (
                        <span className="truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
                      ) : (
                        <span className="truncate text-xs font-normal text-muted-foreground">Auth disabled</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <UserRound className="mr-2 h-4 w-4" />
                      Account settings
                    </Link>
                  </DropdownMenuItem>
                  {AUTH_ENABLED ? (
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <nav className="flex border-t px-2 py-2 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground",
                      isActive && "bg-accent text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </TooltipProvider>
  );
}
