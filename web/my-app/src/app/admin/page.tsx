"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  RefreshCw, 
  Search, 
  Check, 
  X, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  FileText,
  DollarSign,
  MessageSquare,
  Send,
  Calendar,
  Layers,
  PieChart as PieIcon
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// Interfaces
interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  direction: string;
  metadata: any;
  created_at: string;
}

interface Tipster {
  id: string;
  display_name: string;
  roi: number;
  win_rate: number;
  total_profit: number;
  trust_score: number;
  user_id: string;
  tier?: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    phone_number: string | null;
  };
}

interface Withdrawal {
  id: string;
  user_id: string;
  tipster_id: string;
  amount: number;
  status: string;
  destination: string;
  reference_id: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
}

function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const activeTab = (tabParam === "ledger" || tabParam === "payouts" || tabParam === "tipsters") 
    ? tabParam 
    : "analytics";

  const setActiveTab = (tab: "analytics" | "ledger" | "payouts" | "tipsters") => {
    router.push(`/admin?tab=${tab}`);
  };

  const [timelineFilter, setTimelineFilter] = useState<"all" | "today" | "7days" | "30days">("all");

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminBalance, setAdminBalance] = useState<number>(0);
  const [activeSubsCount, setActiveSubsCount] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerPage, setLedgerPage] = useState(0);
  const ledgerPerPage = 5;

  // User Registry & Tipster Directory States
  const [userRegistryExpanded, setUserRegistryExpanded] = useState(false);
  const [usersPage, setUsersPage] = useState(0);
  const [tipsterSearchQuery, setTipsterSearchQuery] = useState("");

  // Modal Actions (Payouts)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetPayout, setTargetPayout] = useState<{ id: string; action: "COMPLETE" | "FAIL" } | null>(null);
  const [payoutRefId, setPayoutRefId] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Modal Actions (Messaging Tipsters)
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [targetTipster, setTargetTipster] = useState<Tipster | null>(null);
  const [messageTitle, setMessageTitle] = useState("System Announcement");
  const [messageText, setMessageText] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);

  // Fetch Database Data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Admin Wallet Balance (ID: '00000000-0000-0000-0000-000000000000')
      const { data: adminWallet } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      setAdminBalance(adminWallet ? Number(adminWallet.balance) : 0);

      // 2. Fetch Active Subscriptions Count
      const { count: activeSubs } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setActiveSubsCount(activeSubs || 0);

      // 3. Fetch All Wallet Transactions
      const { data: liveTransactions } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      setTransactions(liveTransactions || []);

      // 4. Fetch All Tipsters (with profiles)
      const { data: liveTipsters } = await supabase
        .from("tipsters")
        .select(`
          id, display_name, roi, win_rate, total_profit, trust_score, user_id, tier,
          profiles:user_id ( username, full_name, phone_number )
        `)
        .order("total_profit", { ascending: false });

      const mappedTipsters = (liveTipsters || []).map((t: any) => ({
        ...t,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
      }));
      setTipsters(mappedTipsters);

      // 5. Fetch Withdrawals (with profiles)
      const { data: liveWithdrawals } = await supabase
        .from("withdrawals")
        .select(`
          id, user_id, tipster_id, amount, status, destination, reference_id, created_at,
          profiles:user_id ( full_name, username )
        `)
        .order("created_at", { ascending: false });

      const mappedWithdrawals = (liveWithdrawals || []).map((w: any) => ({
        ...w,
        profiles: Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
      }));
      setWithdrawals(mappedWithdrawals);

      // 6. Fetch All Profiles (Registered App Users)
      const { data: liveProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, phone_number, created_at")
        .order("created_at", { ascending: false });

      setProfiles(liveProfiles || []);

    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter transactions based on selected Timeline
  const timelineFilteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      if (timelineFilter === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return txDate >= startOfDay;
      } else if (timelineFilter === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= sevenDaysAgo;
      } else if (timelineFilter === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return txDate >= thirtyDaysAgo;
      }
      return true; // All Time
    });
  }, [transactions, timelineFilter]);

  // Filter profiles based on selected Timeline (Sign Up Date)
  const timelineFilteredProfiles = useMemo(() => {
    const now = new Date();
    return profiles.filter(p => {
      if (!p.created_at) return true;
      const pDate = new Date(p.created_at);
      if (timelineFilter === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return pDate >= startOfDay;
      } else if (timelineFilter === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return pDate >= sevenDaysAgo;
      } else if (timelineFilter === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return pDate >= thirtyDaysAgo;
      }
      return true; // All Time
    });
  }, [profiles, timelineFilter]);

  // Paginated User profiles
  const usersPerPage = 5;
  const paginatedProfiles = useMemo(() => {
    const start = usersPage * usersPerPage;
    return timelineFilteredProfiles.slice(start, start + usersPerPage);
  }, [timelineFilteredProfiles, usersPage]);

  const totalUsersPages = Math.ceil(timelineFilteredProfiles.length / usersPerPage);

  // Filtered Tipsters list by username and display name
  const filteredTipsters = useMemo(() => {
    return tipsters.filter(t => {
      const nameMatch = t.display_name.toLowerCase().includes(tipsterSearchQuery.toLowerCase());
      const usernameMatch = (t.profiles?.username || "").toLowerCase().includes(tipsterSearchQuery.toLowerCase());
      const phoneMatch = (t.profiles?.phone_number || "").includes(tipsterSearchQuery);
      return nameMatch || usernameMatch || phoneMatch;
    });
  }, [tipsters, tipsterSearchQuery]);

  // Upgrade Tipster Tier in DB
  const handleUpgradeTier = async (tipsterId: string, newTier: string) => {
    try {
      const { error } = await supabase
        .from("tipsters")
        .update({ tier: newTier })
        .eq("id", tipsterId);

      if (error) throw error;
      
      // Update state locally
      setTipsters(prev => prev.map(t => t.id === tipsterId ? { ...t, tier: newTier } : t));
    } catch (err: any) {
      alert("Error upgrading tipster tier: " + err.message);
    }
  };

  // Calculate Key Analytics from Filtered Timeline Data
  const analytics = useMemo(() => {
    // 1. Number of Tips Sold (Purchases)
    const tipsSold = timelineFilteredTransactions.filter(
      tx => tx.type === "PURCHASE" && tx.direction === "DEBIT"
    ).length;

    // 2. Total money accumulated (Gross amount debited from users for purchases and subscriptions)
    const grossAccumulated = timelineFilteredTransactions
      .filter(tx => (tx.type === "PURCHASE" || tx.type === "SUBSCRIPTION") && tx.direction === "DEBIT")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // 3. Platform Revenue (Commissions credited)
    const commissionRevenue = timelineFilteredTransactions
      .filter(tx => tx.type === "COMMISSION" && tx.direction === "CREDIT")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // 4. Breakdown from single tip commission vs subscription commission
    let singleTipCommission = 0;
    let subscriptionCommission = 0;

    timelineFilteredTransactions
      .filter(tx => tx.type === "COMMISSION" && tx.direction === "CREDIT")
      .forEach(tx => {
        const amt = Number(tx.amount);
        // Distinguish based on metadata parameters
        if (tx.metadata && (tx.metadata.tip_id || tx.metadata.buyer_id)) {
          singleTipCommission += amt;
        } else if (tx.metadata && (tx.metadata.subscription_id || tx.metadata.subscriber_id)) {
          subscriptionCommission += amt;
        } else {
          // Fallback guess based on amount size or defaults
          singleTipCommission += amt;
        }
      });

    return {
      tipsSold,
      grossAccumulated,
      commissionRevenue,
      singleTipCommission,
      subscriptionCommission
    };
  }, [timelineFilteredTransactions]);

  // Commission Earnings daily trend for Charting
  const commissionChartData = useMemo(() => {
    const dailyMap = timelineFilteredTransactions
      .filter(tx => tx.type === "COMMISSION" && tx.direction === "CREDIT")
      .reduce((acc: any, tx) => {
        const dateStr = new Date(tx.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
        acc[dateStr] = (acc[dateStr] || 0) + Number(tx.amount);
        return acc;
      }, {});

    const chart = Object.keys(dailyMap).map(date => ({
      date,
      amount: dailyMap[date]
    }));

    // Sort chronologically by date
    return chart.sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineFilteredTransactions]);

  // Pie Chart Data for Breakdown
  const breakdownPieData = useMemo(() => {
    return [
      { name: "Single Tips", value: analytics.singleTipCommission },
      { name: "Subscriptions", value: analytics.subscriptionCommission }
    ];
  }, [analytics]);

  const PIE_COLORS = ["#3b82f6", "#10b981"];

  // Analytics for Payouts Tab
  const payoutAnalytics = useMemo(() => {
    // 1. Highest paidout tipsters (only completed withdrawals)
    const paidoutMap = withdrawals
      .filter(w => w.status === "COMPLETED")
      .reduce((acc: any, w) => {
        const name = w.profiles?.full_name || w.profiles?.username || "Unknown Tipster";
        acc[name] = (acc[name] || 0) + Number(w.amount);
        return acc;
      }, {});

    const topPaidoutTipsters = Object.keys(paidoutMap).map(name => ({
      name,
      amount: paidoutMap[name]
    })).sort((a, b) => b.amount - a.amount);

    // 2. SIM Provider Performance (all completed withdrawals)
    const simMap = withdrawals
      .filter(w => w.status === "COMPLETED")
      .reduce((acc: any, w) => {
        const dest = w.destination || "";
        let provider = "Other/Unknown";
        if (dest.toLowerCase().includes("m-pesa") || dest.toLowerCase().includes("mpesa")) provider = "M-Pesa";
        else if (dest.toLowerCase().includes("tigo")) provider = "Tigo Pesa";
        else if (dest.toLowerCase().includes("airtel")) provider = "Airtel Money";
        else if (dest.toLowerCase().includes("halo")) provider = "Halopesa";
        
        if (!acc[provider]) {
          acc[provider] = { provider, amount: 0, count: 0 };
        }
        acc[provider].amount += Number(w.amount);
        acc[provider].count += 1;
        return acc;
      }, {});

    const simPerformance = Object.values(simMap).sort((a: any, b: any) => b.amount - a.amount);

    return {
      topPaidoutTipsters,
      simPerformance
    };
  }, [withdrawals]);

  // Analytics for Ledger Tab
  const ledgerAnalytics = useMemo(() => {
    // Group commissions by tipster name
    const commissionMap = transactions
      .filter(tx => tx.type === "COMMISSION" && tx.direction === "CREDIT")
      .reduce((acc: any, tx) => {
        const name = tx.metadata?.tipster_name || "Platform";
        acc[name] = (acc[name] || 0) + Number(tx.amount);
        return acc;
      }, {});

    // Match each tipster name with tipster directory to get details
    const topCommissionGenerators = Object.keys(commissionMap)
      .map(name => {
        const tipsterObj = tipsters.find(t => t.display_name === name);
        return {
          name,
          amount: commissionMap[name],
          username: tipsterObj?.profiles?.username || null,
          phone: tipsterObj?.profiles?.phone_number || null,
          tipsterObj: tipsterObj || null
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      topCommissionGenerators
    };
  }, [transactions, tipsters]);

  // Filter & Search Ledger Logs (filtered by search query AND timeline)
  const searchedTransactions = useMemo(() => {
    return timelineFilteredTransactions.filter(tx => {
      const typeMatch = tx.type.toLowerCase().includes(searchQuery.toLowerCase());
      const metadataStr = JSON.stringify(tx.metadata || {}).toLowerCase();
      const metadataMatch = metadataStr.includes(searchQuery.toLowerCase());
      const directionMatch = tx.direction.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch || metadataMatch || directionMatch;
    });
  }, [timelineFilteredTransactions, searchQuery]);

  // Paginated Ledger Data
  const paginatedTransactions = useMemo(() => {
    const start = ledgerPage * ledgerPerPage;
    return searchedTransactions.slice(start, start + ledgerPerPage);
  }, [searchedTransactions, ledgerPage]);

  const totalPages = Math.ceil(searchedTransactions.length / ledgerPerPage);

  // Mark Withdrawal processing in DB
  const handleMarkProcessing = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "PROCESSING" })
        .eq("id", payoutId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Error setting status: " + err.message);
    }
  };

  // Mark Payout Complete or Fail
  const handleOpenActionModal = (payoutId: string, action: "COMPLETE" | "FAIL") => {
    setTargetPayout({ id: payoutId, action });
    setPayoutRefId("");
    setShowConfirmModal(true);
  };

  const handleConfirmPayoutAction = async () => {
    if (!targetPayout) return;
    setPayoutLoading(true);

    try {
      const isSuccess = targetPayout.action === "COMPLETE";
      const { data, error } = await supabase.rpc("confirm_withdrawal", {
        p_withdrawal_id: targetPayout.id,
        p_success: isSuccess,
        p_reference_id: payoutRefId || null
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      fetchData();
      setShowConfirmModal(false);
      setTargetPayout(null);
    } catch (err: any) {
      alert("Error updating withdrawal: " + err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  // Open Message Modal
  const handleOpenMessageModal = (tipster: Tipster) => {
    setTargetTipster(tipster);
    setMessageTitle("System Notification");
    setMessageText("");
    setMsgSuccess(false);
    setShowMsgModal(true);
  };

  // Submit announcement notification to tipster user
  const handleSendNotification = async () => {
    if (!targetTipster) return;
    setMsgLoading(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: targetTipster.user_id,
        type: "admin_message",
        data: {
          title: messageTitle,
          message: messageText,
          sent_by: "System Admin",
          sent_at: new Date().toISOString()
        }
      });

      if (error) throw error;

      setMsgSuccess(true);
      setTimeout(() => {
        setShowMsgModal(false);
        setTargetTipster(null);
      }, 1000);
    } catch (err: any) {
      alert("Error sending notification: " + err.message);
    } finally {
      setMsgLoading(false);
    }
  };

  // Format currencies
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-neutral-400">Loading Live Database Metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Admin Overview
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-800 text-emerald-400">
              Live Database Active
            </span>
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time analytics and management ledger for Platform Escrow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeline Filter */}
          <div className="flex items-center rounded-xl bg-white/5 border border-neutral-800 p-1">
            <button
              onClick={() => { setTimelineFilter("all"); setLedgerPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timelineFilter === "all" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => { setTimelineFilter("today"); setLedgerPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timelineFilter === "today" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => { setTimelineFilter("7days"); setLedgerPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timelineFilter === "7days" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => { setTimelineFilter("30days"); setLedgerPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timelineFilter === "30days" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-neutral-800 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white transition duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Widgets (Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Admin Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Escrow Balance</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-800 flex items-center justify-center text-blue-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-4 tracking-tight">
            {formatCurrency(adminBalance)}
          </p>
          <span className="text-[10px] text-blue-400/70 font-semibold mt-1 block">Live wallet balance</span>
        </div>

        {/* Total Sales Volume (Gross Accumulated) */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Gross Sales Volume</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-4 tracking-tight">
            {formatCurrency(analytics.grossAccumulated)}
          </p>
          <span className="text-[10px] text-indigo-400/70 font-semibold mt-1 block">Accumulated total (100%)</span>
        </div>

        {/* Commission Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Platform Commission</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-4 tracking-tight">
            {formatCurrency(analytics.commissionRevenue)}
          </p>
          <span className="text-[10px] text-emerald-400/70 font-semibold mt-1 block">Commission Revenue (10%)</span>
        </div>

        {/* Number of Tips Sold */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Tips Purchased</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-800 flex items-center justify-center text-purple-400">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-4 tracking-tight">
            {analytics.tipsSold}
          </p>
          <span className="text-[10px] text-purple-400/70 font-semibold mt-1 block">Total tip unlocking count</span>
        </div>
      </div>



      {/* Dynamic Tab Body */}
      <div className="space-y-6">
        {/* Tab 1: Analytics / Recharts */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Commission Trend Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-white">Commission Earnings Trend</h3>
                  <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Timeline Filter Active
                  </span>
                </div>
                <div className="h-80 w-full">
                  {commissionChartData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-neutral-500 text-sm">
                      No commissions recorded in this timeline range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={commissionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0b1220", borderColor: "#262626", borderRadius: "12px" }}
                          labelClassName="text-white font-bold"
                        />
                        <Area type="monotone" dataKey="amount" name="Commission (TZS)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCom)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Revenue Breakdown Pie Chart */}
              <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <PieIcon className="h-4.5 w-4.5 text-blue-400" />
                    Revenue Breakdown
                  </h3>
                  <p className="text-neutral-400 text-xs mb-6">Commission source distribution</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center">
                  {analytics.commissionRevenue === 0 ? (
                    <span className="text-neutral-500 text-xs">No revenue data</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={breakdownPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {breakdownPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-neutral-400">Single Tips</span>
                    </div>
                    <span className="font-semibold text-white">{formatCurrency(analytics.singleTipCommission)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-neutral-400">Subscriptions</span>
                    </div>
                    <span className="font-semibold text-white">{formatCurrency(analytics.subscriptionCommission)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Tipsters Leaderboard */}
            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
                    Top Performing Tipsters
                  </h3>
                  <p className="text-neutral-400 text-xs mt-1">Ranked by total net profit accumulated from their sport tipping channels</p>
                </div>
                <button
                  onClick={() => setActiveTab("tipsters")}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                >
                  View All & Send Messages &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tipsters.slice(0, 4).map((tipster, index) => (
                  <div 
                    key={tipster.id} 
                    className="relative overflow-hidden rounded-xl border border-neutral-800 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-blue-500/30 transition duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Rank #{index + 1}</span>
                        <h4 className="text-sm font-bold text-white mt-1 truncate max-w-[150px]">{tipster.display_name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        tipster.trust_score >= 90 ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {tipster.trust_score}/100 Trust
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Total Profit</span>
                        <span className="font-semibold text-white">{formatCurrency(tipster.total_profit)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Win Rate / ROI</span>
                        <span className="font-semibold text-emerald-400">{tipster.win_rate}% / <span className="text-blue-400">{tipster.roi}%</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Commission Ledger Table */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            {/* Top Commission Generators */}
            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Top Commission Generators & Brand Deals
              </h3>
              <p className="text-neutral-400 text-xs mb-4">
                These tipsters drive the most platform revenue. Contact them directly to negotiate exclusive brand sponsorship deals.
              </p>
              
              {ledgerAnalytics.topCommissionGenerators.length === 0 ? (
                <div className="text-neutral-500 text-xs py-4">No commissions recorded in ledger.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ledgerAnalytics.topCommissionGenerators.slice(0, 3).map((generator, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-xl border border-neutral-800 bg-white/[0.01] p-4 flex flex-col justify-between hover:border-blue-500/30 transition duration-300">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Top #{idx + 1} Partner</span>
                          <h4 className="text-sm font-bold text-white mt-1 truncate max-w-[170px]">{generator.name}</h4>
                        </div>
                        <span className="text-xs font-black text-blue-400">{formatCurrency(generator.amount)}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Telegram/Username</span>
                          <span className="font-semibold text-white">{generator.username ? `@${generator.username}` : "Not set"}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Phone Contact</span>
                          <span className="font-semibold text-white">{generator.phone || "No phone linked"}</span>
                        </div>
                      </div>

                      {generator.tipsterObj && (
                        <button
                          onClick={() => {
                            setTargetTipster(generator.tipsterObj);
                            setMessageTitle("Brand Deal Offer");
                            setMessageText(`Hello ${generator.name},\n\nWe love your tipping performance on Tipstar! We would like to offer you an exclusive brand deal partnership with higher custom commissions. Please reach out to us at admin@tipstar.com or +255 700 000 000.`);
                            setShowMsgModal(true);
                          }}
                          className="w-full mt-4 py-2 text-xs font-semibold rounded-lg bg-blue-600/10 border border-blue-800 text-blue-400 hover:bg-blue-600/20 hover:text-white transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send Brand Deal Invite
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 overflow-hidden backdrop-blur-xl">
              {/* Table Filters */}
              <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-base font-bold text-white">Commission Transaction Ledger</h3>
                
                {/* Search Box */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setLedgerPage(0);
                    }}
                    className="w-full rounded-xl border border-neutral-800 bg-white/5 py-2 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition"
                  />
                </div>
              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/[0.01]">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Platform Share (10%)</th>
                      <th className="py-4 px-6">Direction</th>
                      <th className="py-4 px-6">Details / Info</th>
                      <th className="py-4 px-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                          No transactions found matching your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.01] transition">
                          <td className="py-4 px-6 font-mono text-[11px] text-neutral-400">{tx.id}</td>
                          <td className="py-4 px-6 font-semibold text-white">{tx.type}</td>
                          <td className="py-4 px-6 font-extrabold text-blue-400">{formatCurrency(tx.amount)}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.direction === "CREDIT" 
                                ? "bg-emerald-500/10 border border-emerald-800 text-emerald-400" 
                                : "bg-red-500/10 border border-red-900 text-red-400"
                            }`}>
                              {tx.direction}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-neutral-400 truncate max-w-xs">
                            {tx.metadata?.buyer_name || tx.metadata?.subscriber_name ? (
                              <>
                                User: <span className="text-white font-medium">{tx.metadata.buyer_name || tx.metadata.subscriber_name}</span> → 
                                Tipster: <span className="text-white font-medium">{tx.metadata.tipster_name || "Platform"}</span>
                              </>
                            ) : (
                              JSON.stringify(tx.metadata)
                            )}
                          </td>
                          <td className="py-4 px-6 text-neutral-400">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    Showing page {ledgerPage + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLedgerPage(prev => Math.max(0, prev - 1))}
                      disabled={ledgerPage === 0}
                      className="p-1.5 rounded-lg border border-neutral-800 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setLedgerPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={ledgerPage === totalPages - 1}
                      className="p-1.5 rounded-lg border border-neutral-800 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Payouts/Withdrawals Actions */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Payout Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Leaderboard of highest paidout tipsters */}
              <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Highest Paid-Out Tipsters
                </h3>
                {payoutAnalytics.topPaidoutTipsters.length === 0 ? (
                  <div className="text-neutral-500 text-xs py-4">No completed payouts recorded.</div>
                ) : (
                  <div className="space-y-3">
                    {payoutAnalytics.topPaidoutTipsters.slice(0, 5).map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white/[0.01] border border-neutral-800 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-400">#{idx + 1}</span>
                          <span className="font-semibold text-white">{t.name}</span>
                        </div>
                        <span className="font-extrabold text-white">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SIM/Mobile Money Provider Performance */}
              <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 p-6 backdrop-blur-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-400" />
                  SIM/Mobile Money Provider Performance
                </h3>
                {payoutAnalytics.simPerformance.length === 0 ? (
                  <div className="text-neutral-500 text-xs py-4">No completed payout transaction routing.</div>
                ) : (
                  <div className="space-y-4">
                    {payoutAnalytics.simPerformance.map((sim: any, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${
                              sim.provider === "M-Pesa" ? "bg-red-500" :
                              sim.provider === "Tigo Pesa" ? "bg-blue-500" :
                              sim.provider === "Airtel Money" ? "bg-red-600" : "bg-yellow-500"
                            }`} />
                            {sim.provider}
                          </span>
                          <span className="text-neutral-400">
                            <span className="text-white font-semibold">{formatCurrency(sim.amount)}</span> ({sim.count} txs)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              sim.provider === "M-Pesa" ? "bg-red-500" :
                              sim.provider === "Tigo Pesa" ? "bg-blue-500" :
                              sim.provider === "Airtel Money" ? "bg-red-600" : "bg-yellow-500"
                            }`}
                            style={{ 
                              width: `${Math.min(100, (sim.amount / Math.max(1, payoutAnalytics.simPerformance.reduce((s: number, x: any) => s + Number(x.amount), 0))) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-neutral-800">
                <h3 className="text-base font-bold text-white">Withdrawal Request Payouts</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/[0.01]">
                      <th className="py-4 px-6">Requester</th>
                      <th className="py-4 px-6">Amount Requested</th>
                      <th className="py-4 px-6">Destination</th>
                      <th className="py-4 px-6">Date Requested</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Reference ID</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                          No withdrawal requests found in database.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-white/[0.01] transition">
                          <td className="py-4 px-6">
                            <p className="font-semibold text-white">{w.profiles?.full_name || "Unknown User"}</p>
                            <span className="text-[10px] text-neutral-400">@{w.profiles?.username || "unknown"}</span>
                          </td>
                          <td className="py-4 px-6 font-extrabold text-white">{formatCurrency(w.amount)}</td>
                          <td className="py-4 px-6 font-mono text-neutral-300">{w.destination}</td>
                          <td className="py-4 px-6 text-neutral-400">
                            {new Date(w.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              w.status === "COMPLETED" ? "bg-emerald-500/10 border border-emerald-800 text-emerald-400" :
                              w.status === "PROCESSING" ? "bg-blue-500/10 border border-blue-800 text-blue-400 animate-pulse" :
                              w.status === "FAILED" ? "bg-red-500/10 border border-red-900 text-red-400" :
                              "bg-yellow-500/10 border border-yellow-800 text-yellow-400"
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-[11px] text-neutral-400">
                            {w.reference_id || "-"}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {w.status === "REQUESTED" && (
                              <button
                                onClick={() => handleMarkProcessing(w.id)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-800 text-blue-400 font-semibold hover:bg-blue-600/25 transition inline-flex items-center gap-1.5"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Processing
                              </button>
                            )}

                            {w.status === "PROCESSING" && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenActionModal(w.id, "COMPLETE")}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-805 text-emerald-400 font-semibold hover:bg-emerald-600/25 transition inline-flex items-center gap-1"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleOpenActionModal(w.id, "FAIL")}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600/15 border border-red-900 text-red-400 font-semibold hover:bg-red-600/25 transition inline-flex items-center gap-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Fail
                                </button>
                              </div>
                            )}

                            {(w.status === "COMPLETED" || w.status === "FAILED") && (
                              <span className="text-[10px] uppercase font-bold text-neutral-500 italic">No Action</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Users and Tipsters directory */}
        {activeTab === "tipsters" && (
          <div className="space-y-6">
            {/* User Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-sans">Total Users</span>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-800 flex items-center justify-center text-blue-400">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-white mt-4 tracking-tight font-sans">
                  {profiles.length}
                </p>
                <span className="text-[10px] text-blue-400/70 font-semibold mt-1 block">Total accounts created in app</span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d1527]/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-sans">Sign-Ups (Filtered)</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-800 flex items-center justify-center text-emerald-400">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-white mt-4 tracking-tight font-sans">
                  {timelineFilteredProfiles.length}
                </p>
                <span className="text-[10px] text-emerald-400/70 font-semibold mt-1 block">
                  New users during {timelineFilter === "all" ? "All Time" : timelineFilter === "today" ? "Today" : timelineFilter === "7days" ? "Last 7 Days" : "Last 30 Days"}
                </span>
              </div>
            </div>

            {/* User Directory Table */}
            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white">App User Registry</h3>
                  <p className="text-neutral-400 text-xs mt-1">List of all user profiles registered during the selected period</p>
                </div>
                <button
                  onClick={() => {
                    setUserRegistryExpanded(!userRegistryExpanded);
                    setUsersPage(0);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-800 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white transition"
                >
                  {userRegistryExpanded ? "Collapse Directory" : "Expand Directory"}
                </button>
              </div>

              {userRegistryExpanded && (
                <>
                  <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/[0.01]">
                          <th className="py-4 px-6">Name / Username</th>
                          <th className="py-4 px-6">Phone Contact</th>
                          <th className="py-4 px-6">Account ID</th>
                          <th className="py-4 px-6">Sign-up Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {paginatedProfiles.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-neutral-500">
                              No users registered during this period.
                            </td>
                          </tr>
                        ) : (
                          paginatedProfiles.map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.01] transition">
                              <td className="py-4 px-6">
                                <p className="font-semibold text-white">{p.full_name || "Anonymous User"}</p>
                                <span className="text-[10px] text-neutral-400">{p.username ? `@${p.username}` : "-"}</span>
                              </td>
                              <td className="py-4 px-6 font-semibold text-neutral-200">{p.phone_number || "Not linked"}</td>
                              <td className="py-4 px-6 font-mono text-[11px] text-neutral-400">{p.id}</td>
                              <td className="py-4 px-6 text-neutral-400">
                                {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Users Pagination Controls */}
                  {totalUsersPages > 1 && (
                    <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-white/[0.01]">
                      <span className="text-xs text-neutral-500">
                        Showing page {usersPage + 1} of {totalUsersPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUsersPage(prev => Math.max(0, prev - 1))}
                          disabled={usersPage === 0}
                          className="p-1.5 rounded-lg border border-neutral-800 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setUsersPage(prev => Math.min(totalUsersPages - 1, prev + 1))}
                          disabled={usersPage === totalUsersPages - 1}
                          className="p-1.5 rounded-lg border border-neutral-800 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tipster Directory Table */}
            <div className="rounded-2xl border border-neutral-800 bg-[#0b1220]/40 overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Registered Tipster Channels</h3>
                  <p className="text-neutral-400 text-xs mt-1">List of all sports betting tipster channels. Upgrade tiers (Standard, Pro, Legendary) or send messages.</p>
                </div>
                
                {/* Tipster Search Bar */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search username, name, phone..."
                    value={tipsterSearchQuery}
                    onChange={(e) => setTipsterSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/[0.01]">
                      <th className="py-4 px-6">Channel Name</th>
                      <th className="py-4 px-6">Owner Username / Phone</th>
                      <th className="py-4 px-6">ROI / Win Rate</th>
                      <th className="py-4 px-6">Net Profit</th>
                      <th className="py-4 px-6">Trust Score</th>
                      <th className="py-4 px-6">Current Tier</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredTipsters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                          No registered tipster channels found matching search query.
                        </td>
                      </tr>
                    ) : (
                      filteredTipsters.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.01] transition">
                          <td className="py-4 px-6 font-semibold text-white">{t.display_name}</td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-white">
                              {t.profiles?.username ? `@${t.profiles.username}` : "No username"}
                            </p>
                            <span className="text-[10px] text-neutral-400">
                              {t.profiles?.phone_number || "No phone linked"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-blue-400 font-bold">{t.roi}% / <span className="text-emerald-400">{t.win_rate}%</span></td>
                          <td className="py-4 px-6 font-extrabold text-neutral-200">
                            {formatCurrency(t.total_profit)}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              t.trust_score >= 90 ? "bg-emerald-500/10 border border-emerald-800 text-emerald-400" :
                              "bg-yellow-500/10 border border-yellow-800 text-yellow-400"
                            }`}>
                              {t.trust_score}/100
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={t.tier || "Standard"}
                              onChange={(e) => handleUpgradeTier(t.id, e.target.value)}
                              className="bg-[#070b13] text-xs font-semibold text-white border border-neutral-800 rounded-lg py-1.5 px-3 outline-none focus:border-blue-500/50 transition cursor-pointer"
                            >
                              <option value="Standard">Standard</option>
                              <option value="Pro">Pro</option>
                              <option value="Legendary">Legendary</option>
                            </select>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenMessageModal(t)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-800 text-blue-400 font-semibold hover:bg-blue-600/25 transition inline-flex items-center gap-1.5"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Send Message
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Payout Modal */}
      {showConfirmModal && targetPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#0d1527] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-white mb-4">
              <AlertCircle className={`h-6 w-6 ${targetPayout.action === "COMPLETE" ? "text-emerald-400" : "text-red-400"}`} />
              <h4 className="text-lg font-bold">
                {targetPayout.action === "COMPLETE" ? "Complete Payout Request" : "Fail Payout Request"}
              </h4>
            </div>

            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              {targetPayout.action === "COMPLETE"
                ? "This will update the status of this withdrawal request to COMPLETED, and confirm the release of tipster earnings in public.earnings. Please provide a bank/mobile money reference ID."
                : "This will fail the payout and issue an immediate CREDIT refund back to the user's wallet. This action is irreversible."}
            </p>

            {targetPayout.action === "COMPLETE" && (
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Transaction Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="REF-382941"
                  value={payoutRefId}
                  onChange={(e) => setPayoutRefId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-white/5 py-3 px-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition"
                />
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setTargetPayout(null);
                }}
                disabled={payoutLoading}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-neutral-800 bg-white/5 text-neutral-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayoutAction}
                disabled={payoutLoading}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-lg transition disabled:opacity-50 ${
                  targetPayout.action === "COMPLETE"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10"
                    : "bg-red-600 hover:bg-red-500 shadow-red-500/10"
                }`}
              >
                {payoutLoading ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal (Sending Announcements) */}
      {showMsgModal && targetTipster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-[#0d1527] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-white mb-4">
              <MessageSquare className="h-6 w-6 text-blue-400" />
              <h4 className="text-lg font-bold">Message {targetTipster.display_name}</h4>
            </div>

            <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
              This message will be pushed directly to the tipster's private notifications inbox under the type 'admin_message'.
            </p>

            {msgSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-800 bg-emerald-500/5 p-3 text-center text-xs text-emerald-400">
                Message delivered successfully!
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="System Notification"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-white/5 py-3 px-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Message Body
                </label>
                <textarea
                  placeholder="Enter message text for the tipster..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-neutral-800 bg-white/5 py-3 px-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowMsgModal(false);
                  setTargetTipster(null);
                }}
                disabled={msgLoading || msgSuccess}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-neutral-800 bg-white/5 text-neutral-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={msgLoading || msgSuccess || !messageText}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10 transition disabled:opacity-50 flex items-center gap-2"
              >
                {msgLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Announcement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-neutral-400">Loading Dashboard Context...</p>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
