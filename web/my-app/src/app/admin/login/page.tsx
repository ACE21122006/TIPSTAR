"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Attempt standard Sign In
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 2. Auto-Provisioning Admin for easy testing
      if (signInError && email === "admin@tipstar.com") {
        // If login failed, try signing them up as an admin
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "admin",
              full_name: "System Admin",
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        // Successfully signed up! Now try logging in again
        const reLogin = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (reLogin.error) {
          throw new Error(reLogin.error.message);
        }
        data = reLogin.data;
        signInError = null;
      } else if (signInError) {
        throw new Error(signInError.message);
      }

      // 3. Confirm they are admin in front-end
      const user = data?.user;
      const userEmail = user?.email || "";
      const userRole = user?.user_metadata?.role || "";
      const isAdmin = userEmail === "admin@tipstar.com" || userEmail.includes("admin") || userRole === "admin";

      if (!isAdmin) {
        // Sign out if not admin
        await supabase.auth.signOut();
        throw new Error("Access Denied: You do not have admin permissions.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070b13] px-4 font-sans text-neutral-200 antialiased">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at center, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#0d1527]/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-800 text-blue-400 shadow-inner">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in to manage Tipstar commissions & payouts
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-900 bg-red-500/5 p-4 text-sm text-red-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-800 bg-emerald-500/5 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <p>Authentication successful! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tipstar.com"
                className="w-full rounded-2xl border border-neutral-800 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition duration-200 focus:border-blue-500/50 focus:bg-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-neutral-800 bg-white/5 py-3.5 pl-11 pr-11 text-sm text-white placeholder-neutral-500 outline-none transition duration-200 focus:border-blue-500/50 focus:bg-white/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-500 hover:text-neutral-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying Credentials...
              </span>
            ) : (
              "Sign In to Dashboard"
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-neutral-800 pt-6 text-center">
          <p className="text-xs text-neutral-500">
            For local testing, signing in with <span className="text-blue-400 font-semibold">admin@tipstar.com</span> will automatically provision an admin account.
          </p>
        </div>
      </div>
    </div>
  );
}
