export const CONTENT_SIGNAL_POLICY = {
  search: "yes",
  aiInput: "yes",
  aiTrain: "no",
} as const;

export const CONTENT_SIGNAL_HEADER = [
  `search=${CONTENT_SIGNAL_POLICY.search}`,
  `ai-input=${CONTENT_SIGNAL_POLICY.aiInput}`,
  `ai-train=${CONTENT_SIGNAL_POLICY.aiTrain}`,
].join(", ");
