"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Leaf,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("admin@teavision.io");
  const [password, setPassword] = useState("Admin@1234");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMsg("Invalid credentials. Please verify your email and password.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMsg("An unexpected error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSelectDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Admin@1234");
    setErrorMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-500/20">
            <Leaf className="h-8 w-8 fill-emerald-200" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            Tea<span className="text-emerald-400">Vision</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            AI-Powered Tea Harvest & Supply Chain Platform
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-slate-800 bg-white/95 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your credentials to access operations & analytics
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@teavision.io"
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-emerald-700 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-all mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Quick Demo Role Selector */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Demo Fast Login
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("admin@teavision.io")}
                  className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-colors ${
                    email === "admin@teavision.io"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    Admin
                    {email === "admin@teavision.io" && <Check className="h-3 w-3 text-emerald-600" />}
                  </span>
                  <span className="text-[10px] text-slate-500">Dr. Sarah Perera</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("supervisor@teavision.io")}
                  className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-colors ${
                    email === "supervisor@teavision.io"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    Supervisor
                    {email === "supervisor@teavision.io" && <Check className="h-3 w-3 text-emerald-600" />}
                  </span>
                  <span className="text-[10px] text-slate-500">Kamal (Field)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("factory@teavision.io")}
                  className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-colors ${
                    email === "factory@teavision.io"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    Factory Mgr
                    {email === "factory@teavision.io" && <Check className="h-3 w-3 text-emerald-600" />}
                  </span>
                  <span className="text-[10px] text-slate-500">Anil Gunaratne</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemoUser("buyer@teavision.io")}
                  className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-colors ${
                    email === "buyer@teavision.io"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    Buyer
                    {email === "buyer@teavision.io" && <Check className="h-3 w-3 text-emerald-600" />}
                  </span>
                  <span className="text-[10px] text-slate-500">Twinings London</span>
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-3 text-center">
            <p className="w-full text-[11px] text-slate-500">
              Secured with JWT & Role-Based Access Control
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
