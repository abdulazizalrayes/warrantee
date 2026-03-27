"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  totalWarranties: number;
  totalClaims: number;
  pendingClaims: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWarranties: 0,
    totalClaims: 0,
    pendingClaims: 0,
  });
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAdminAndLoadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/en/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || profile.role !== "admin") {
          router.push("/en/dashboard");
          return;
        }

        setIsAdmin(true);

        // Load stats
        const [usersRes, warrantiesRes, claimsRes, pendingRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("warranties")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("claims")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("claims")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
          ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalWarranties: warrantiesRes.count || 0,
          totalClaims: claimsRes.count || 0,
          pendingClaims: pendingRes.count || 0,
        });
      } catch (error) {
        console.error("Admin check failed:", error);
        router.push("/en/dashboard");
      } finally {
        setLoading(false);
      }
    }

    checkAdminAndLoadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Warrantee Management Panel
              </p>
            </div>
            <Link
              href="/en/dashboard"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700">
          {["overview", "users", "ingestion"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalUsers}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Warranties
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalWarranties}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Claims
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalClaims}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pending Claims
              </p>
              <p className="text-3xl font-bold text-orange-500 mt-1">
                {stats.pendingClaims}
              </p>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Management
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              User management features coming soon.
            </p>
          </div>
        )}

        {activeTab === "ingestion" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Document Ingestion
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Manage warranty document ingestion via OCR and email.
            </p>
            <Link
              href="/en/admin/ingestion"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Go to Ingestion Manager
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
