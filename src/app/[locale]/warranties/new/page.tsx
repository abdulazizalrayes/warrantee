"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  Upload,
  X,
  CheckCircle,
  FileIcon,
  Calendar,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Step = 1 | 2 | 3;

interface FormData {
  productName: string;
  sku: string;
  quantity: number;
  category: string;
  startDate: string;
  endDate: string;
  terms: string;
  referenceNumber: string;
  counterpartyEmail: string;
  documents: File[];
}

export default function NewWarrantyPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const router = useRouter();
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    productName: "",
    sku: "",
    quantity: 1,
    category: "standard",
    startDate: "",
    endDate: "",
    terms: "",
    referenceNumber: "",
    counterpartyEmail: "",
    documents: [],
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: "standard", label: isRTL ? "معياري" : "Standard" },
    { value: "extended", label: isRTL ? "ممتد" : "Extended" },
    { value: "accidental", label: isRTL ? "عرضي" : "Accidental" },
    { value: "theft", label: isRTL ? "السرقة" : "Theft" },
    { value: "water_damage", label: isRTL ? "تلف المياه" : "Water Damage" },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files],
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files],
    }));
  };

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const isStep1Valid =
    formData.productName.trim() &&
    formData.sku.trim() &&
    formData.quantity > 0 &&
    formData.category;

  const isStep2Valid =
    formData.startDate &&
    formData.endDate &&
    formData.terms.trim() &&
    formData.referenceNumber.trim() &&
    formData.counterpartyEmail.trim();

  const handleNext = () => {
    if (currentStep === 1 && !isStep1Valid) return;
    if (currentStep === 2 && !isStep2Valid) return;
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setCurrentStep(3);
      // In production, redirect after success
      // router.push(`/${locale}/warranties`);
    }, 1500);
  };

  const handleSaveDraft = () => {
    console.log("Saving as draft...", formData);
    // In production, call API to save draft
  };

  return (
    <div dir={direction} className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-2">
          {dict.warranty.create}
        </h1>
        <p className="text-gray-600">
          {isRTL
            ? "أكمل النموذج لإنشاء ضمان جديد"
            : "Complete the form to create a new warranty"}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <button
              onClick={() => {
                if (step < currentStep) setCurrentStep(step as Step);
              }}
              className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition ${
                step === currentStep
                  ? "bg-gold text-navy scale-110"
                  : step < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {step < currentStep ? (
                <CheckCircle size={24} />
              ) : (
                step
              )}
            </button>

            {step < 3 && (
              <div
                className={`flex-1 h-1 ${
                  step < currentStep ? "bg-green-500" : "bg-gray-300"
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-sm font-medium">
        <span className={currentStep >= 1 ? "text-navy" : "text-gray-500"}>
          {isRTL ? "المعلومات الأساسية" : "Basic Info"}
        </span>
        <span className={currentStep >= 2 ? "text-navy" : "text-gray-500"}>
          {isRTL ? "الشروط" : "Terms"}
        </span>
        <span className={currentStep >= 3 ? "text-navy" : "text-gray-500"}>
          {isRTL ? "المستندات" : "Documents"}
        </span>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {dict.warranty.fields.product_name}
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder={isRTL ? "مثال: iPhone 15 Pro" : "e.g., iPhone 15 Pro"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {isRTL ? "SKU / الرقم التسلسلي" : "SKU / Serial Number"}
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="ABC123XYZ"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {isRTL ? "الكمية" : "Quantity"}
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {dict.warranty.fields.coverage_type}
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Terms */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {dict.warranty.fields.start_date}
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {dict.warranty.fields.warranty_end_date}
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                {dict.warranty.fields.terms_conditions}
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                placeholder={isRTL ? "أدخل الشروط والأحكام..." : "Enter terms and conditions..."}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {isRTL ? "رقم المرجع (PO/Invoice)" : "Reference Number (PO/Invoice)"}
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleInputChange}
                  placeholder="INV-2024-001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  {dict.warranty.fields.customer_email}
                </label>
                <input
                  type="email"
                  name="counterpartyEmail"
                  value={formData.counterpartyEmail}
                  onChange={handleInputChange}
                  placeholder="counterparty@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Documents & Review */}
        {currentStep === 3 && (
          <div className="space-y-8">
            {/* Upload Area */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-3">
                {isRTL ? "المستندات" : "Documents"}
              </label>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gold hover:bg-gold/5 transition"
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-navy mb-1">
                  {isRTL ? "اسحب الملفات هنا" : "Drag files here"}
                </p>
                <p className="text-sm text-gray-600">
                  {isRTL ? "أو انقر للاختيار" : "or click to select"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Uploaded Files */}
            {formData.documents.length > 0 && (
              <div>
                <h3 className="font-semibold text-navy mb-3">
                  {isRTL ? "الملفات المرفوعة" : "Uploaded Files"}
                </h3>
                <div className="space-y-2">
                  {formData.documents.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon size={20} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-navy text-sm">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1 hover:bg-red-100 rounded transition text-red-600"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-bold text-navy mb-4">
                {isRTL ? "ملخص الضمان" : "Warranty Summary"}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {dict.warranty.fields.product_name}:
                  </span>
                  <span className="font-medium text-navy">
                    {formData.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-medium text-navy">{formData.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {isRTL ? "الكمية:" : "Quantity:"}
                  </span>
                  <span className="font-medium text-navy">
                    {formData.quantity}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-3 font-semibold">
                  <span className="text-gray-700">
                    {isRTL ? "الفترة:" : "Period:"}
                  </span>
                  <span className="text-navy">
                    {formData.startDate && formData.endDate
                      ? `${new Date(formData.startDate).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US"
                        )} - ${new Date(formData.endDate).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US"
                        )}`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="text-navy hover:text-gold font-semibold transition flex items-center gap-2"
        >
          {isRTL ? "حفظ كمسودة" : "Save as Draft"}
        </button>

        <div className="flex gap-4 w-full sm:w-auto">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-navy font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dict.common.back}
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid)
              }
              className="flex-1 sm:flex-none px-6 py-3 bg-gold hover:bg-yellow-500 text-navy font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {dict.common.next}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-3 bg-gold hover:bg-yellow-500 text-navy font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? dict.common.loading : dict.warranty.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}