export const WARRANTY_LIMIT_ERROR_CODE = "WARRANTY_LIMIT_REACHED";

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

export function isWarrantyLimitError(error: PostgrestLikeError | null | undefined) {
  return Boolean(
    error &&
      (error.message === "warranty_limit_reached" ||
        error.details?.includes("warranty_limit_reached"))
  );
}

export function warrantyLimitResponseBody() {
  return {
    error: "Warranty limit reached for the current plan.",
    code: WARRANTY_LIMIT_ERROR_CODE,
  };
}
