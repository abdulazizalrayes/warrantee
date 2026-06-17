export type ExtractedWarrantyFields = {
  confidence: number;
  raw_text: string;
  [field: string]: string | number;
};

function firstMatch(text: string, patterns: RegExp[], maxLength = 100) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length > 1 && value.length <= maxLength) {
      return value;
    }
  }
  return null;
}

export function extractWarrantyFields(text: string) {
  const result: ExtractedWarrantyFields = { confidence: 0, raw_text: text.substring(0, 500) };

  const productName = firstMatch(text, [
    /(?:product|item|device|model|equipment)\s*(?:name|description)?\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:warranty|guarantee)\s+(?:for|of|on)\s+(.+?)(?:\.|\n|$)/i,
    /(?:purchased|bought)\s+(?:a\s+)?(.+?)(?:\s+on|\s+from|\.|\n|$)/i,
    /(?:المنتج|الصنف|الجهاز|الموديل|اسم المنتج|وصف المنتج)\s*[:؛\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:ضمان|كفالة)\s+(?:على|لـ|ل)\s*(.+?)(?:\.|\n|$)/i,
    /^([A-Z][A-Za-z0-9\s\-]+(?:Pro|Plus|Max|Ultra|Mini|Air)?)/m,
  ]);
  if (productName) {
    result.product_name = productName;
    result.confidence += 0.2;
  }

  const serialNumber = firstMatch(text, [
    /(?:serial|s\/n|sn|imei|sku)\s*(?:number|no|#)?\s*[:;\-]?\s*([A-Za-z0-9\-]{4,30})/i,
    /(?:model)\s*(?:number|no|#)?\s*[:;\-]?\s*([A-Za-z0-9\-]{4,30})/i,
    /(?:الرقم التسلسلي|رقم تسلسلي|رقم الجهاز|رقم الموديل|الموديل|السيريال)\s*[:؛\-]?\s*([A-Za-z0-9\-]{4,30})/i,
  ], 30);
  if (serialNumber) {
    result.serial_number = serialNumber;
    result.confidence += 0.15;
  }

  const isoDateRegex = /(\d{4})[\-](\d{2})[\-](\d{2})/g;
  const dateRegex = /(?<!\d{2}-)(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/g;
  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = isoDateRegex.exec(text)) !== null) dates.push(dateMatch[0]);
  while ((dateMatch = dateRegex.exec(text)) !== null) dates.push(dateMatch[0]);

  if (dates.length >= 1) {
    result.start_date = dates[0];
    result.confidence += 0.15;
  }
  if (dates.length >= 2) {
    result.end_date = dates[1];
    result.confidence += 0.15;
  }

  const warrantyDuration = firstMatch(text, [
    /(\d+)\s*(?:year|yr)s?\s*(?:warranty|guarantee|coverage)/i,
    /(?:warranty|guarantee|coverage)\s*(?:period|duration)?\s*[:;]?\s*(\d+\s*(?:year|yr|month|mo)s?)/i,
    /(\d+)\s*(?:month|mo)s?\s*(?:warranty|guarantee|coverage)/i,
    /(?:الضمان|الكفالة|مدة الضمان|فترة الضمان)\s*[:؛]?\s*(\d+\s*(?:سنة|سنوات|شهر|أشهر))/i,
    /(\d+)\s*(?:سنة|سنوات|شهر|أشهر)\s*(?:ضمان|كفالة)/i,
  ], 50);
  if (warrantyDuration) {
    result.warranty_duration = warrantyDuration;
    result.confidence += 0.1;
  }

  const supplier = firstMatch(text, [
    /(?:seller|vendor|supplier|retailer|dealer|sold by|purchased from|store)\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:company|manufacturer|brand)\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:البائع|المورد|المتجر|المحل|الشركة|المصنع|العلامة التجارية)\s*[:؛\-]?\s*(.+?)(?:\n|\r|$)/i,
  ]);
  if (supplier) {
    result.supplier = supplier;
    result.confidence += 0.1;
  }

  const purchasePrice = firstMatch(text, [
    /(?:price|amount|total|cost|paid)\s*[:;\-]?\s*(?:SAR|SR|\$|USD|EUR|\u00a3|\u20ac)?\s*([\d,]+\.?\d*)/i,
    /(?:SAR|SR|\$|USD|EUR)\s*([\d,]+\.?\d*)/i,
    /(?:السعر|المبلغ|الإجمالي|الاجمالي|المدفوع|التكلفة)\s*[:؛\-]?\s*(?:SAR|SR|ر\.س|ريال)?\s*([\d,]+\.?\d*)/i,
    /(?:SAR|SR|ر\.س|ريال)\s*([\d,]+\.?\d*)/i,
  ], 30);
  if (purchasePrice) {
    result.purchase_price = purchasePrice.replace(/,/g, "");
    result.confidence += 0.1;
  }

  const categories: Record<string, string[]> = {
    appliances: ["washer", "dryer", "fridge", "refrigerator", "oven", "microwave", "dishwasher", "ac", "air conditioner", "washing machine", "غسالة", "ثلاجة", "فرن", "مكيف", "ميكروويف"],
    electronics: ["phone", "laptop", "computer", "tv", "television", "tablet", "camera", "headphone", "speaker", "monitor", "iphone", "samsung", "macbook", "ipad", "هاتف", "لابتوب", "حاسب", "كمبيوتر", "تلفزيون", "كاميرا", "سماعة"],
    automotive: ["car", "vehicle", "tire", "battery", "engine", "auto", "toyota", "honda", "bmw", "mercedes", "سيارة", "مركبة", "إطار", "بطارية", "محرك"],
    furniture: ["sofa", "chair", "table", "desk", "bed", "mattress", "wardrobe", "cabinet", "كنبة", "كرسي", "طاولة", "سرير", "خزانة"],
    hvac: ["hvac", "heating", "ventilation", "cooling", "thermostat", "furnace", "تبريد", "تدفئة", "تهوية"],
    machinery: ["generator", "pump", "compressor", "crane", "forklift", "drill", "مولد", "مضخة", "ضاغط", "رافعة"],
    construction: ["cement", "steel", "roofing", "insulation", "plywood", "brick", "أسمنت", "حديد", "عزل", "طوب"],
    software: ["license", "subscription", "software", "saas", "cloud", "رخصة", "اشتراك", "برنامج", "سحابة"],
  };

  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
      result.category = category;
      result.confidence += 0.05;
      break;
    }
  }

  const invoiceReference = firstMatch(text, [
    /(?:رقم الفاتورة|الفاتورة|رقم الطلب|رقم الإيصال|رقم الايصال|مرجع)\s*[:؛\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
    /\b(?:invoice|inv)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
    /\b(?:po|purchase order)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
    /\b(?:receipt|order)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
  ], 30);
  if (invoiceReference) {
    result.invoice_reference = invoiceReference;
    result.confidence += 0.05;
  }

  return result;
}
