type WarrantyLike = {
  status?: string | null;
  end_date?: string | null;
  seller_id?: string | null;
  issuer_user_id?: string | null;
  seller_name?: string | null;
  seller_email?: string | null;
};

type ExtensionPolicyLike = {
  source?: string | null;
  status?: string | null;
} | null | undefined;

export type ExtensionEligibilityState =
  | "eligible_seller"
  | "seller_missing"
  | "approval_required"
  | "invalid_dates"
  | "inactive";

export type ExtensionEligibility = {
  state: ExtensionEligibilityState;
  canOpenFlow: boolean;
  canRequestSellerQuote: boolean;
  hasOnPlatformSeller: boolean;
  hasApprovedFallbackProvider: boolean;
};

export function getExtensionEligibility(
  warranty: WarrantyLike | null | undefined,
  policy?: ExtensionPolicyLike
): ExtensionEligibility {
  const hasOnPlatformSeller = Boolean(warranty?.seller_id || warranty?.issuer_user_id);

  const hasApprovedFallbackProvider =
    policy?.status === "approved" &&
    (policy.source === "platform" ||
      policy.source === "third_party" ||
      policy.source === "seller_then_platform");

  if (!warranty || warranty.status !== "active") {
    return {
      state: "inactive",
      canOpenFlow: false,
      canRequestSellerQuote: false,
      hasOnPlatformSeller,
      hasApprovedFallbackProvider,
    };
  }

  if (!warranty.end_date || Number.isNaN(new Date(warranty.end_date).getTime())) {
    return {
      state: "invalid_dates",
      canOpenFlow: false,
      canRequestSellerQuote: false,
      hasOnPlatformSeller,
      hasApprovedFallbackProvider,
    };
  }

  if (hasOnPlatformSeller) {
    return {
      state: "eligible_seller",
      canOpenFlow: true,
      canRequestSellerQuote: true,
      hasOnPlatformSeller,
      hasApprovedFallbackProvider,
    };
  }

  return {
    state: hasApprovedFallbackProvider ? "approval_required" : "seller_missing",
    canOpenFlow: hasApprovedFallbackProvider,
    canRequestSellerQuote: false,
    hasOnPlatformSeller,
    hasApprovedFallbackProvider,
  };
}

export function getExtensionEligibilityMessage(
  eligibility: ExtensionEligibility,
  isRTL: boolean
) {
  switch (eligibility.state) {
    case "seller_missing":
      return isRTL
        ? "لا يوجد بائع نشط على المنصة لهذا المنتج بعد، لذلك التمديد غير متاح حالياً."
        : "There is no active on-platform seller for this product yet, so extension is currently unavailable.";
    case "approval_required":
      return isRTL
        ? "يوجد مسار مزود معتمد لهذا المنتج. يبدأ الدفع فقط بعد إصدار عرض سعر معتمد."
        : "An approved provider path exists for this product. Checkout starts only after an approved priced offer is issued.";
    case "invalid_dates":
      return isRTL
        ? "تعذر فتح التمديد لأن تاريخ انتهاء الضمان غير صالح ويحتاج إلى مراجعة."
        : "Extension is unavailable because the warranty end date is invalid and needs review.";
    case "inactive":
      return isRTL ? "التمديد متاح فقط للضمانات النشطة." : "Extensions are only available for active warranties.";
    default:
      return isRTL
        ? "يمكن متابعة التمديد لهذا الضمان."
        : "This warranty can proceed through the extension flow.";
  }
}
