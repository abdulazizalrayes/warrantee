import type { Locale } from "./i18n";

// Locale types
export type { Locale } from "./i18n";

// User types
export type UserRole = "owner" | "admin" | "manager" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  company_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  brand_color?: string;
  industry?: string;
  country?: string;
  subscription_plan: "free" | "pro" | "enterprise";
  subscription_status: "active" | "trial" | "cancelled";
  warranty_limit: number;
  created_at: string;
  updated_at: string;
}

// Warranty types
export type WarrantyStatus =
  | "draft"
  | "pending"
  | "active"
  | "claimed"
  | "expired"
  | "cancelled";

export type CoverageType =
  | "standard"
  | "extended"
  | "accidental"
  | "theft"
  | "water_damage"
  | "customized";

export interface Warranty {
  id: string;
  company_id: string;
  product_name: string;
  description?: string;
  serial_number: string;
  purchase_date: string;
  warranty_start_date: string;
  warranty_end_date: string;
  coverage_type: CoverageType;
  coverage_amount: number;
  currency: string;
  covered_items: string[];
  terms_conditions: string;
  status: WarrantyStatus;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  certificate_number?: string;
  certificate_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  claim_number: string;
  status: "submitted" | "under_review" | "approved" | "rejected" | "resolved";
  claim_date: string;
  claimed_amount: number;
  description: string;
  supporting_documents: string[];
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WarrantyExtension {
  id: string;
  warranty_id: string;
  extension_months: number;
  new_end_date: string;
  extension_cost?: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
}

export interface WarrantyChain {
  id: string;
  warranty_id: string;
  from_user_id: string;
  to_user_id: string;
  transfer_date: string;
  reason?: string;
  created_at: string;
}

// Certificate types
export interface Certificate {
  id: string;
  warranty_id: string;
  certificate_number: string;
  language: Locale;
  file_url: string;
  generated_at: string;
  valid_until: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "warranty_expiring"
    | "claim_approved"
    | "claim_rejected"
    | "approval_needed"
    | "transfer_received"
    | "certificate_ready";
  title: string;
  message: string;
  warranty_id?: string;
  claim_id?: string;
  read: boolean;
  created_at: string;
}

// Document types
export interface Document {
  id: string;
  warranty_id: string;
  name: string;
  type: "original" | "certificate" | "claim_support" | "other";
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// Dashboard types
export interface DashboardStats {
  total_warranties: number;
  active_warranties: number;
  expiring_soon: number;
  pending_approval: number;
  claimed_warranties: number;
  total_claim_amount: number;
  claims_this_month: number;
  approval_rate: number;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  action:
    | "warranty_created"
    | "warranty_approved"
    | "warranty_claimed"
    | "document_uploaded"
    | "certificate_generated"
    | "warranty_extended";
  entity_type: "warranty" | "claim" | "document" | "certificate";
  entity_id: string;
  description: string;
  created_at: string;
}

// Form types
export interface CreateWarrantyInput {
  product_name: string;
  serial_number: string;
  purchase_date: string;
  warranty_start_date: string;
  warranty_end_date: string;
  coverage_type: CoverageType;
  coverage_amount: number;
  currency: string;
  covered_items: string[];
  terms_conditions: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  description?: string;
  documents?: File[];
}

export interface SubmitClaimInput {
  warranty_id: string;
  description: string;
  claimed_amount: number;
  supporting_documents: File[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  locale: Locale;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}
