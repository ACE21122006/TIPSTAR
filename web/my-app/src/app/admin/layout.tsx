"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  Wallet, 
  LogOut, 
  Sparkles, 
  User, 
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Users
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminEmail(user.email || "System Admin");
      } else {
        const isBypassed = document.cookie.includes("admin_bypass=true");
        if (isBypassed) {
          setAdminEmail("Bypass Admin (Demo)");
        }
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  // Sync active tab from URL search parameters on path or search change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get("tab") || "analytics");
    }
  }, [pathname]);

  const handleSignOut = async () => {
    document.cookie = "admin_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  // If loading or we are on the login page, don't render the sidebar layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#070b13] font-sans text-neutral-200 antialiased">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-[150px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 w-64 border-r border-neutral-800 bg-[#0b1220]/60 p-6 flex flex-col justify-between backdrop-blur-xl">
        <div className="space-y-8">
          {/* Brand/Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-neutral-800 text-blue-400 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Tipstar</h1>
              <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Admin Console</span>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 rounded-2xl bg-white/5 border border-neutral-800 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-neutral-800 flex items-center justify-center text-blue-300">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{adminEmail || "Admin User"}</p>
              <span className="text-[10px] text-neutral-400 font-medium">Administrator</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-3 mb-2.5">
                Core Analytics
              </div>
              <div className="space-y-1">
                <a
                  href="/admin?tab=analytics"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("analytics");
                    router.push("/admin?tab=analytics");
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition duration-200 border ${
                    activeTab === "analytics" 
                      ? "bg-blue-600/15 border-neutral-700 text-blue-400 font-semibold shadow-sm" 
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border-transparent"
                  }`}
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                  Overview Dashboard
                </a>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-3 mb-2.5">
                Financial Control
              </div>
              <div className="space-y-1">
                <a
                  href="/admin?tab=ledger"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("ledger");
                    router.push("/admin?tab=ledger");
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition duration-200 border ${
                    activeTab === "ledger" 
                      ? "bg-blue-600/15 border-neutral-700 text-blue-400 font-semibold shadow-sm" 
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border-transparent"
                  }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  Commission Ledger
                </a>
                <a
                  href="/admin?tab=payouts"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("payouts");
                    router.push("/admin?tab=payouts");
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition duration-200 border ${
                    activeTab === "payouts" 
                      ? "bg-blue-600/15 border-neutral-700 text-blue-400 font-semibold shadow-sm" 
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border-transparent"
                  }`}
                >
                  <Wallet className="h-4.5 w-4.5" />
                  Withdrawal Payouts
                </a>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-3 mb-2.5">
                Communications
              </div>
              <div className="space-y-1">
                <a
                  href="/admin?tab=tipsters"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("tipsters");
                    router.push("/admin?tab=tipsters");
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition duration-200 border ${
                    activeTab === "tipsters" 
                      ? "bg-blue-600/15 border-neutral-700 text-blue-400 font-semibold shadow-sm" 
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border-transparent"
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  Tipster Directory
                </a>
              </div>
            </div>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400 transition duration-200 hover:bg-red-500/5"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-800 bg-[#070b13]/80 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Workspace</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-300">Main Server</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-neutral-400 font-medium">Database Connected</span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
