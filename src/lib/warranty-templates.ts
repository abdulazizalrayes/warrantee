export type WarrantyTemplateId =
  | "equipment_service"
  | "contractor_handover"
  | "electronics_retail"
  | "appliance_retail"
  | "manufacturer";

export type WarrantyTemplate = {
  id: WarrantyTemplateId;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  category: string;
  defaultDurationMonths: number;
  suggestedFields: string[];
};

export const WARRANTY_TEMPLATES: readonly WarrantyTemplate[] = [
  {
    id: "equipment_service",
    label: { en: "Equipment dealer or service team", ar: "مورد معدات أو فريق صيانة" },
    description: {
      en: "Track equipment identity, supplier, service evidence, and coverage dates.",
      ar: "تتبّع هوية المعدة والمورد وأدلة الصيانة وتواريخ التغطية.",
    },
    category: "machinery",
    defaultDurationMonths: 12,
    suggestedFields: ["serial_number", "supplier", "invoice_reference", "coverage_dates"],
  },
  {
    id: "contractor_handover",
    label: { en: "Contractor or project handover", ar: "مقاول أو تسليم مشروع" },
    description: {
      en: "Prepare handover warranties with contract, PO, asset, and document references.",
      ar: "جهّز ضمانات التسليم مع مراجع العقد وأمر الشراء والأصل والمستندات.",
    },
    category: "construction",
    defaultDurationMonths: 12,
    suggestedFields: ["contract_reference", "po_reference", "asset_location", "handover_evidence"],
  },
  {
    id: "electronics_retail",
    label: { en: "Electronics retailer", ar: "متجر إلكترونيات" },
    description: {
      en: "Issue buyer-ready records using product, SKU, serial, invoice, and seller details.",
      ar: "أصدر سجلات جاهزة للمشتري ببيانات المنتج والرمز والرقم التسلسلي والفاتورة والبائع.",
    },
    category: "electronics",
    defaultDurationMonths: 12,
    suggestedFields: ["sku", "serial_number", "invoice_reference", "buyer_contact"],
  },
  {
    id: "appliance_retail",
    label: { en: "Appliance retailer", ar: "متجر أجهزة منزلية" },
    description: {
      en: "Capture appliance identity, installation evidence, coverage, and buyer details.",
      ar: "سجّل هوية الجهاز وأدلة التركيب والتغطية وبيانات المشتري.",
    },
    category: "appliances",
    defaultDurationMonths: 24,
    suggestedFields: ["model_number", "serial_number", "installation_date", "buyer_contact"],
  },
  {
    id: "manufacturer",
    label: { en: "Manufacturer", ar: "مصنّع" },
    description: {
      en: "Standardize model, batch, serial, coverage, and downstream seller evidence.",
      ar: "وحّد بيانات الطراز والدفعة والرقم التسلسلي والتغطية وأدلة البائع.",
    },
    category: "other",
    defaultDurationMonths: 12,
    suggestedFields: ["model_number", "serial_number", "batch_reference", "seller_details"],
  },
] as const;

export function getWarrantyTemplate(value: string | null | undefined) {
  return WARRANTY_TEMPLATES.find((template) => template.id === value) || null;
}

export function addMonthsToIsoDate(isoDate: string, months: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
