"use client";

import { useParams } from "next/navigation";
import {
  Shield,
  AlertCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  Download,
  Eye,
  Share2,
  Calendar,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export default function DashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  // Mock data
  const stats = [
    {
      label: dict.dashboard.active_warranties,
      value: "12",
      icon: Shield,
      color: "from-green-50 to-emerald-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
    },
    {
      label: dict.dashboard.expiring_soon,
      value: "3",
      icon: Clock,
      color: "from-yellow-50 to-amber-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
    },
    {
      label: dict.dashboard.pending_approval,
      value: "5",
      icon: AlertCircle,
      color: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
    },
    {
      label: dict.dashboard.total_managed,
      value: "42",
      icon: TrendingUp,
      color: "from-purple-50 to-violet-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      action: isRTL ? "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0636\u0645\u0627\u0646 \u062C\u062F\u064A\u062F" : "New warranty created",
      product: "iPhone 15 Pro",
      timestamp: isRTL ? "\u0645\u0646\u0630 \u0633\u0627\u0639\u0629" : "1 hour ago",
      type: "created",
    },
    {
      id: 2,
      action: isRTL ? "\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646" : "Warranty approved",
      product: "Samsung TV 55\\"",
      timestamp: isRTL ? "\u0645\u0646\u0630 3 \u0633\u0627\u0639\u0627\u062A" : "3 hours ago",
      type: "approved",
    },
    {
      id: 3,
      action: isRTL ? "\u062A\u0645 \u0631\u0641\u0639 \u0645\u0633\u062A\u0646\u062F \u062C\u062F\u064A\u062F" : "Document uploaded",
      product: "MacBook Pro",
      timestamp: isRTL ? "\u0645\u0646\u0630 \u064A\u0648\u0645 \u0648\u0627\u062D\u062F" : "1 day ago",
      type: "uploaded",
    },
    {
      id: 4,
      action: isRTL ? "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0637\u0627\u0644\u0628\u0629" : "Claim submitted",
      product: "iPad Air",
      timestamp: isRTL ? "\u0645\u0646\u0630 \u064A\u0648\u0645\u064A\u0646" : "2 days ago",
      type: "claimed",
    },
  ];

  const expiringWarranties = [
    {
      id: 1,
      product: "Sony Headphones",
      expiryDate: "2026-04-15",
      daysLeft: 23,
      seller: isRTL ? "\u0645\u062A\u062C\u0631 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" : "Electronics Store",
    },
    {
      id: 2,
      product: "Dell Monitor",
      expiryDate: "2026-04-22",
      daysLeft: 30,
      seller: isRTL ? "\u0645\u062A\u062C\u0631 \u0627\u0644\u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A\u0627" : "Tech Shop",
    },
    {
      id: 3,
      product: "Logitech Keyboard",
      expiryDate: "2026-05-05",
      daysLeft: 43,
      seller: isRTL ? "\u0623\u0645\u0627\u0632\u0648\u0646" : "Amazon",
    },
  ];

  const quickActions = [
    {
      title: isRTL ? "\u0625\u0636\u0627\u0641\u0629 \u0636\u0645\u0627\u0646" : "Add Warranty",
      href: "/warranties/new",
      icon: Plus,
      color: "bg-gold hover:bg-yellow-500 text-navy",
    },
    {
      title: isRTL ? "\u0639\u0631\u0636 \u062C\u0645\u064A\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A" : "View All Warranties",
      href: "/warranties",
      icon: Eye,
      color: "bg-navy hover:bg-navy-dark text-white",
    },
    {
      title: isRTL ? "\u062F\u0639\u0648\u0629 \u0627\u0644\u0628\u0627\u0626\u0639" : "Invite Seller",
      href: "/settings/team",
      icon: Share2,
      color: "bg-gray-600 hover:bg-gray-700 text-white",
    },
  ];

  const getDaysLeftColor = (daysLeft: number) => {
    if (daysLeft <= 7) return "text-red-600 bg-red-50";
    if (daysLeft <= 14) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div dir={direction} className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-2">
          {dict.dashboard.welcome},{" "}
          <span className="text-gold">{isRTL ? "\u0645\u062D\u0645\u062F" : "Muhammad"}</span>!
        </h1>
        <p className="text-gray-600">
          {isRTL
            ? "\u0625\u0644\u064A\u0643 \u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0636\u0645\u0627\u0646\u0627\u062A\u0643"
            : "Here's an overview of all your warranties"}
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={\`bg-gradient-to-br \${stat.color} border \${stat.borderColor} rounded-lg p-6 shadow-sm hover:shadow-md transition\`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={\`p-3 rounded-lg bg-white/50 \${stat.textColor}\`}>
                  <Icon size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">
                {stat.label}
              </h3>
              <p className="text-3xl font-bold text-navy">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <a
              key={index}
              href={\`/\${locale}\${action.href}\`}
              className={\`\${action.color} flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105\`}
            >
              <Icon size={18} />
              <span>{action.title}</span>
            </a>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy">
                {dict.dashboard.recent_activity}
              </h2>
              <a
                href={\`/\${locale}/dashboard\`}
                className="text-gold hover:text-yellow-600 font-semibold text-sm flex items-center gap-1 transition"
              >
                {dict.dashboard.view_all}
                <ArrowRight size={16} />
              </a>
            </div>

            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div
                    className={\`w-3 h-3 rounded-full \${
                      activity.type === "created"
                        ? "bg-blue-500"
                        : activity.type === "approved"
                          ? "bg-green-500"
                          : activity.type === "uploaded"
                            ? "bg-purple-500"
                            : "bg-orange-500"
                    }\`}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium text-navy">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.product}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {activity.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-navy mb-6">
              {dict.dashboard.expiring_soon}
            </h2>

            <div className="space-y-4">
              {expiringWarranties.map((warranty) => (
                <div
                  key={warranty.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-navy text-sm">
                      {warranty.product}
                    </h3>
                    <span
                      className={\`text-xs font-bold px-2 py-1 rounded \${getDaysLeftColor(warranty.daysLeft)}\`}
                    >
                      {warranty.daysLeft}{isRTL ? " \u064A\u0648\u0645" : " days"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{warranty.seller}</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-600">
                      {new Date(warranty.expiryDate).toLocaleDateString(
                        locale === "ar" ? "ar-SA" : "en-US"
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <a
              href={\`/\${locale}/warranties\`}
              className="block mt-6 w-full text-center bg-gray-100 hover:bg-gray-200 text-navy font-semibold py-2 rounded-lg transition"
            >
              {dict.dashboard.view_all}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
