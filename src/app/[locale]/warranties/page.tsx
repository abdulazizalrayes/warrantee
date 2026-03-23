"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Grid3x3,
  List,
  Badge,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "pending" | "expired" | "claimed" | "draft";

export default function WarrantiesPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode2, setViewMode2] = useState<ViewMode>("grid");

  // Mock warranty data
  const warranties = [
    {
      id: 1,
      product: "iPhone 15 Pro",
      seller: isRTL ? "متجر آبل" : "Apple Store",
      buyer: isRTL ? "محمد أحمد" : "Muhammad Ahmed",
      status: "active" as const,
      expiryDate: "2027-09-15",
      refNumber: "WC-2024-001",
      daysLeft: 532,
    },
    {
      id: 2,
      product: "Samsung 55" TV",
      seller: isRTL ? "متجر سامسونج" : "Samsung Store",
      buyer: isRTL ? "فاطمة علي" : "Fatima Ali",
      status: "pending" as const,
      expiryDate: "2026-12-20",
      refNumber: "WC-2024-002",
      daysLeft: 272,
    },
    {
      id: 3,
      product: "MacBook Pro 16"",
      seller: isRTL ? "متجر آبل" : "Apple Store",
      buyer: isRTL ? "محمد أحمد" : "Muhammad Ahmed",
      status: "active" as const,
      expiryDate: "2027-03-10",
      refNumber: "WC-2024-003",
      daysLeft: 348,
    },
    {
      id: 4,
      product: "Dell Monitor",
      seller: isRTL ? "متجر الإلكترونيات" : "Electronics Store",
      buyer: isRTL ? "أحمد محمود" : "Ahmed Mahmoud",
      status: "expired" as const,
      expiryDate: "2023-06-30",
      refNumber: "WC-2023-004",
      daysLeft: -633,
    },
    {
      id: 5,
      product: "Sony WH-1000XM5",
      seller: isRTL ? "متجر سوني" : "Sony Store",
      buyer: isRTL ? "محمد أحمد" : "Muhammad Ahmed",
      status: "claimed" as const,
      expiryDate: "2026-01-15",
      refNumber: "WC-2024-005",
      daysLeft: 29,
    },
    {
      id: 6,
      product: "iPad Air",
      seller: isRTL ? "متجر آبل" : "Apple Store",
      buyer: isRTL ? "سارة محمد" : "Sarah Mohamed",
      status: "draft" as const,
      expiryDate: "2027-05-20",
      refNumber: "WC-DRAFT-001",
      daysLeft: 419,
    },
  ];

  const statusConfig = {
    active: {
      label: dict.warranty.status.active,
      color: "bg-green-100 text-green-800",
      dotColor: "bg-green-500",
    },
    pending: {
      label: dict.warranty.status.pending,
      color: "bg-yellow-100 text-yellow-800",
      dotColor: "bg-yellow-500",
    },
    expired: {
      label: dict.warranty.status.expired,
      color: "bg-red-100 text-red-800",
      dotColor: "bg-red-500",
    },
    claimed: {
      label: dict.warranty.status.claimed,
      color: "bg-blue-100 text-blue-800",
      dotColor: "bg-blue-500",
    },
    draft: {
      label: dict.warranty.status.draft,
      color: "bg-gray-100 text-gray-800",
      dotColor: "bg-gray-500",
    },
  };

  const filteredWarranties =
    statusFilter === "all"
      ? warranties
      : warranties.filter((w) => w.status === statusFilter);

  const searchedWarranties = filteredWarranties.filter((w) =>
    w.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasWarranties = searchedWarranties.length > 0;

  return (
    <div dir={direction} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-1">
            {dict.nav.warranties}
          </h1>
          <p className="text-gray-600">
            {isRTL ? "إدارة جميع ضماناتك في مكان واحد" : "Manage all your warranties in one place"}
          </p>
        </div>
        <a
          href={`/${locale}/warranties/new`}
          className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-semibold px-6 py-3 rounded-lg transition w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus size={20} />
          {dict.warranty.create}
        </a>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={isRTL ? "ابحث عن منتج..." : "Search product..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition ${
                viewMode === "grid"
                  ? "bg-white text-navy shadow-sm"
                  : "text-gray-600 hover:text-navy"
              }`}
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition ${
                viewMode === "list"
                  ? "bg-white text-navy shadow-sm"
                  : "text-gray-600 hover:text-navy"
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "pending", "expired", "claimed", "draft"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === status
                    ? "bg-gold text-navy"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "all"
                  ? isRTL
                    ? "الكل"
                    : "All"
                  : statusConfig[status].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Warranties Display */}
      {hasWarranties ? (
        <>
          {viewMode === "grid" ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchedWarranties.map((warranty) => (
                <div
                  key={warranty.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-navy text-lg flex-1">
                      {warranty.product}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        statusConfig[warranty.status].color
                      }`}
                    >
                      {statusConfig[warranty.status].label}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        {isRTL ? "البائع" : "Seller"}
                      </p>
                      <p className="font-medium text-navy">{warranty.seller}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">
                        {isRTL ? "المشتري" : "Buyer"}
                      </p>
                      <p className="font-medium text-navy">{warranty.buyer}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <Calendar size={14} className="text-gray-500" />
                      <span className="text-gray-600">
                        {new Date(warranty.expiryDate).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-xs font-mono text-gray-500">
                      {warranty.refNumber}
                    </span>
                    {warranty.daysLeft > 0 && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          warranty.daysLeft <= 30
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {warranty.daysLeft} {isRTL ? "يوم" : "days"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {isRTL ? "المنتج" : "Product"}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {isRTL ? "البائع" : "Seller"}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {dict.warranty.status.active}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {isRTL ? "تاريخ الانتهاء" : "Expiry Date"}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {isRTL ? "المرجع" : "Reference"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {searchedWarranties.map((warranty) => (
                      <tr
                        key={warranty.id}
                        className="hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-navy">
                            {warranty.product}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {warranty.seller}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                              statusConfig[warranty.status].color
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                statusConfig[warranty.status].dotColor
                              }`}
                            ></span>
                            {statusConfig[warranty.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(warranty.expiryDate).toLocaleDateString(
                            locale === "ar" ? "ar-SA" : "en-US"
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                          {warranty.refNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        // Empty State
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Badge size={32} className="text-gray-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-navy mb-2">
            {isRTL ? "لا توجد ضمانات" : "No warranties found"}
          </h3>
          <p className="text-gray-600 mb-6">
            {isRTL
              ? "ابدأ بإنشاء ضمان جديد"
              : "Start by creating your first warranty"}
          </p>
          <a
            href={`/${locale}/warranties/new`}
            className="inline-flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy font-semibold px-6 py-3 rounded-lg transition"
          >
            <Plus size={20} />
            {dict.warranty.create}
          </a>
        </div>
      )}
    </div>
  );
}