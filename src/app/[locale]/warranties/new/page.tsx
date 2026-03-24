"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createWarranty } from "@/lib/warranties";
import { Shield, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const t = {
  en: {
    title: "Add New Warranty",
    productName: "Product Name",
    brand: "Brand",
    modelNumber: "Model Number",
    serialNumber: "Serial Number",
    category: "Category",
    purchaseDate: "Purchase Date",
    warrantyStart: "Warranty Start Date",
    warrantyEnd: "Warranty End Date",
    warrantyType: "Warranty Type",
    provider: "Warranty Provider",
    purchasePrice: "Purchase Price (SAR)",
    retailer: "Retailer",
    notes: "Notes",
    save: "Save Warranty",
    saving: "Saving...",
    back: "Back to Warranties",
    success: "Warranty added successfully!",
    selectCategory: "Select category",
    selectType: "Select type",
    categories: ["Electronics", "Appliances", "Automotive", "Furniture", "Jewelry", "Other"],
    types: ["Manufacturer", "Extended", "Third-Party", "Lifetime"],
  },
  ar: {
    title: "\u0625\u0636\u0627\u0641\u0629 \u0636\u0645\u0627\u0646 \u062C\u062F\u064A\u062F",
    productName: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C",
    brand: "\u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629",
    modelNumber: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u062F\u064A\u0644",
    serialNumber: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062A\u0633\u0644\u0633\u0644\u064A",
    category: "\u0627\u0644\u0641\u0626\u0629",
    purchaseDate: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0634\u0631\u0627\u0621",
    warrantyStart: "\u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0636\u0645\u0627\u0646",
    warrantyEnd: "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0636\u0645\u0627\u0646",
    warrantyType: "\u0646\u0648\u0639 \u0627\u0644\u0636\u0645\u0627\u0646",
    provider: "\u0645\u0632\u0648\u062F \u0627\u0644\u0636\u0645\u0627\u0646",
    purchasePrice: "\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (\u0631.\u0633)",
    retailer: "\u0627\u0644\u0628\u0627\u0626\u0639",
    notes: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A",
    save: "\u062D\u0641\u0638 \u0627\u0644\u0636\u0645\u0627\u0646",
    saving: "\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638...",
    back: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062A",
    success: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!",
    selectCategory: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0641\u0626\u0629",
    selectType: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0646\u0648\u0639",
    categories: ["\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A", "\u0623\u062C\u0647\u0632\u0629 \u0645\u0646\u0632\u0644\u064A\u0629", "\u0633\u064A\u0627\u0631\u0627\u062A", "\u0623\u062B\u0627\u062B", "\u0645\u062C\u0648\u0647\u0631\u0627\u062A", "\u0623\u062E\u0631\u0649"],
    types: ["\u0627\u0644\u0645\u0635\u0646\u0639", "\u0645\u0645\u062A\u062F", "\u0637\u0631\u0641 \u062B\u0627\u0644\u062B", "\u0645\u062F\u0649 \u0627\u0644\u062D\u064A\u0627\u0629"],
  },
};

export default function NewWarrantyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const labels = t[locale as keyof typeof t] || t.en;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    product_name: "", brand: "", model_number: "", serial_number: "",
    product_category: "", purchase_date: "", warranty_start_date: "",
    warranty_end_date: "", warranty_type: "", warranty_provider: "",
    purchase_price: "", retailer: "", notes: "",
  });

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createWarranty({
        ...form,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
        currency: "SAR",
      });
      router.push("/" + locale + "/warranties");
    } catch (err: any) {
      setError(err.message || "Failed to save warranty");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none bg-white";

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4169E1]" />
            <span className="text-xl font-bold text-[#1A1A2E]">{labels.title}</span>
          </div>
          <Link href={"/" + locale + "/warranties"} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4169E1]">
            <ArrowLeft className="w-4 h-4" /> {labels.back}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.productName} *</label>
              <input required value={form.product_name} onChange={e => updateField("product_name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.brand}</label>
              <input value={form.brand} onChange={e => updateField("brand", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.category}</label>
              <select value={form.product_category} onChange={e => updateField("product_category", e.target.value)} className={inputClass}>
                <option value="">{labels.selectCategory}</option>
                {labels.categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.modelNumber}</label>
              <input value={form.model_number} onChange={e => updateField("model_number", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.serialNumber}</label>
              <input value={form.serial_number} onChange={e => updateField("serial_number", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.purchaseDate} *</label>
              <input required type="date" value={form.purchase_date} onChange={e => updateField("purchase_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.warrantyStart} *</label>
              <input required type="date" value={form.warranty_start_date} onChange={e => updateField("warranty_start_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.warrantyEnd} *</label>
              <input required type="date" value={form.warranty_end_date} onChange={e => updateField("warranty_end_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.warrantyType}</label>
              <select value={form.warranty_type} onChange={e => updateField("warranty_type", e.target.value)} className={inputClass}>
                <option value="">{labels.selectType}</option>
                {labels.types.map((ty, i) => <option key={i} value={ty}>{ty}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.provider}</label>
              <input value={form.warranty_provider} onChange={e => updateField("warranty_provider", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.purchasePrice}</label>
              <input type="number" step="0.01" value={form.purchase_price} onChange={e => updateField("purchase_price", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.retailer}</label>
              <input value={form.retailer} onChange={e => updateField("retailer", e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{labels.notes}</label>
              <textarea rows={3} value={form.notes} onChange={e => updateField("notes", e.target.value)} className={inputClass} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#4169E1] text-white rounded-xl font-semibold hover:bg-[#3457b5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {loading ? labels.saving : labels.save}
          </button>
        </form>
      </main>
    </div>
  );
}
