"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  ChevronRight,
  Menu,
  Sparkles,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  onOpenMobileSidebar?: () => void;
}

const ROUTE_NAMES: Record<string, string> = {
  dashboard: "Overview",
  yield: "Yield Analytics",
  quality: "Quality Distribution",
  workers: "Workers Leaderboard",
  payroll: "Payroll Management",
  traceability: "Batch Traceability",
};

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Create breadcrumb segments
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-8 backdrop-blur-xs">
      {/* Left: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Link
            href="/dashboard"
            className="font-medium text-slate-600 hover:text-emerald-700 transition-colors"
          >
            TeaVision
          </Link>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const href = `/${segments.slice(0, index + 1).join("/")}`;
            const label = ROUTE_NAMES[segment] || segment;

            return (
              <React.Fragment key={href}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                {isLast ? (
                  <span className="font-semibold text-slate-900 capitalize">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="hover:text-emerald-700 capitalize transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Live Status, Notifications & User Dropdown */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* ML Inference System Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
          </span>
          <span className="font-semibold">AI Leaf Grader v1.0: Active</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
        </button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-1 ring-slate-200"
              aria-label="Open user menu"
            >
              <Avatar className="h-9 w-9">
                {session?.user?.image && (
                  <AvatarImage src={session.user.image} alt="User" />
                )}
                <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                  {session?.user?.name
                    ? session.user.name.slice(0, 2).toUpperCase()
                    : "AD"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-slate-900">
                  {session?.user?.name || "Dr. Sarah Perera"}
                </p>
                <p className="text-xs leading-none text-slate-500 truncate">
                  {session?.user?.email || "admin@teavision.io"}
                </p>
                <div className="pt-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 border-emerald-300">
                    {session?.user?.role || "admin"}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">
                <Sparkles className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Dashboard Overview</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/traceability" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-slate-500" />
                <span>Batch Traceability</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
