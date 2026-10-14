"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Route,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { UserRole } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "supervisor", "factory_manager"],
  },
  {
    name: "Yield Analytics",
    href: "/dashboard/yield",
    icon: BarChart3,
    roles: ["admin", "supervisor", "factory_manager"],
  },
  {
    name: "Quality Distribution",
    href: "/dashboard/quality",
    icon: Sparkles,
    roles: ["admin", "supervisor", "factory_manager", "buyer"],
  },
  {
    name: "Workers Leaderboard",
    href: "/dashboard/workers",
    icon: Users,
    roles: ["admin", "supervisor"],
  },
  {
    name: "Payroll Management",
    href: "/dashboard/payroll",
    icon: DollarSign,
    roles: ["admin"],
  },
  {
    name: "Batch Traceability",
    href: "/dashboard/traceability",
    icon: Route,
    roles: ["admin", "supervisor", "factory_manager", "buyer"],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as UserRole) || "admin";

  const accessibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      {/* Brand & Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
              <Leaf className="h-5 w-5 fill-emerald-100" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 text-lg">
                Tea<span className="text-emerald-700">Vision</span>
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-600">
                AI Supply Chain
              </span>
            </div>
          </Link>

          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 md:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Navigation
          </div>
          {accessibleNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border-l-4 border-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-emerald-700"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {item.href === "/dashboard/payroll" && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User info & Signout */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50/80 p-2.5 border border-slate-200/60">
          <Avatar className="h-9 w-9">
            {session?.user?.image && (
              <AvatarImage src={session.user.image} alt="User" />
            )}
            <AvatarFallback className="bg-emerald-700 text-white font-bold">
              {session?.user?.name
                ? session.user.name.slice(0, 2).toUpperCase()
                : "TV"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-900">
              {session?.user?.name || "Dr. Sarah Perera"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="truncate text-[11px] capitalize text-slate-500">
                {userRole.replace("_", " ")}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            aria-label="Sign out"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
