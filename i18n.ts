export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";

export const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export interface Dictionary {
  nav: { home: string; features: string; pricing: string; login: string; signup: string; dashboard: string; warranties: string; contact: string; };
  hero: { title: string; subtitle: string; cta_demo: string; cta_start: string; };
  features: { title: string; items: Array<{ id: string; title: string; description: string; }>; };
  how_it_works: { title: string; steps: Array<{ id: string; title: string; description: string; }>; };
  pricing: { title: string; subtitle: string; plans: Array<{ id: string; name: string; price: string; description: string; features: string[]; cta: string; }>; };
  footer: { company: string; product: string; legal: string; contact: string; };
  auth: { login: string; signup: string; magic_link: string; google: string; apple: string; password: string; email: string; remember_me: string; forgot_password: string; sign_in: string; create_account: string; no_account: string; have_account: string; };
  dashboard: { welcome: string; active_warranties: string; expiring_soon: string; pending_approval: string; recent_activity: string; view_all: string; create_new: string; total_managed: string; this_month: string; };
  warranty: { create: string; status: { draft: string; pending: string; active: string; claimed: string; expired: string; cancelled: string; }; fields: { product_name: string; serial_number: string; purchase_date: string; warranty_end_date: string; coverage_type: string; coverage_amount: string; covered_items: string; terms_conditions: string; start_date: string; customer_name: string; customer_email: string; }; actions: { approve: string; reject: string; claim: string; extend: string; cancel: string; download: string; share: string; edit: string; delete: string; }; };
  common: { loading: string; error: string; success: string; cancel: string; save: string; delete: string; edit: string; back: string; next: string; previous: string; more_info: string; help: string; settings: string; logout: string; language: string; english: string; arabic: string; retry: string; all: string; };
    claims: { title: string; new_claim: string; status: string; warranty: string; description: string; date: string; no_claims: string; submit: string; evidence: string; statuses: { pending: string; approved: string; rejected: string; in_review: string; }; };
    billing: { title: string; current_plan: string; upgrade: string; manage: string; invoices: string; invoice_date: string; amount: string; status: string; download: string; free_plan: string; pro_plan: string; enterprise_plan: string; per_month: string; usage: string; warranties_used: string; };
}

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: { home: "Home", features: "Features", pricing: "Pricing", login: "Log In", signup: "Sign Up", dashboard: "Dashboard", warranties: "Warranties", contact: "Contact" },
    hero: {
      title: "Trust the Terms.\nTrack Every Warranty.",
      subtitle: "Warrantee is the warranty management platform built for businesses. Approve, track, and claim warranties with confidence.",
      cta_demo: "Request a Demo",
      cta_start: "Get Started Free",
    },
    features: {
      title: "Everything You Need",
      items: [
        { id: "approval_workflow", title: "Smart Approval Workflow", description: "Set custom approval rules, route warranties to the right teams, and automate multi-level approvals." },
        { id: "expiry_reminders", title: "Expiry Reminders", description: "Never miss a warranty deadline. Get proactive alerts for upcoming expirations and critical dates." },
        { id: "bilingual_certs", title: "Bilingual Certificates", description: "Generate professional warranty certificates in Arabic and English. Fully customizable with your branding." },
        { id: "dashboard", title: "Real-Time Dashboard", description: "View all warranties at a glance. Track status, expiration dates, and claim history in one central hub." },
        { id: "email_to_warranty", title: "Email-to-Warranty", description: "Forward emails to create warranty records automatically. Supporting documents included instantly." },
        { id: "chain_tracking", title: "Chain Tracking", description: "Track warranty chains and transfers. Maintain complete audit trails of ownership and approvals." },
      ],
    },
    how_it_works: {
      title: "How Warrantee Works",
      steps: [
        { id: "register", title: "Register Your Company", description: "Sign up and set up your company profile in minutes." },
        { id: "create_warranty", title: "Create Warranties", description: "Add warranties manually or via email. Attach documents automatically." },
        { id: "approve", title: "Approve & Track", description: "Route to approvers, collect signatures, and activate warranties." },
        { id: "track", title: "Monitor & Claim", description: "Track status in real-time and process claims with full documentation." },
      ],
    },
    pricing: {
      title: "Simple, Transparent Pricing",
      subtitle: "Start free. Scale as you grow.",
      plans: [
        {
          id: "free",
          name: "Free",
          price: "$0",
          description: "For individuals and small teams",
          features: [
            "Up to 50 warranties",
            "Basic dashboard",
            "Email support",
            "Up to 2 team members",
            "90-day history",
            "Warranty tracking & alerts",
          ],
          cta: "Get Started Free",
        },
        {
          id: "business",
          name: "Business",
          price: "$1",
          description: "Unlimited warranties. First year free.",
          features: [
            "Unlimited warranties",
            "Advanced dashboard & analytics",
            "Priority email & chat support",
            "Up to 15 team members",
            "Unlimited history",
            "Custom approval workflows",
            "Bilingual certificates",
            "Chain tracking & assignments",
            "8% commission on extensions",
          ],
          cta: "Start Free Year",
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: "Custom",
          description: "For large organizations",
          features: [
            "Everything in Business",
            "Unlimited team members",
            "Dedicated account manager",
            "Custom integrations & API",
            "Advanced security & SSO",
            "SLA guarantee",
            "Custom commission rates",
            "White-label certificates",
          ],
          cta: "Contact Sales",
        },
      ],
    },
    footer: { company: "Company", product: "Product", legal: "Legal", contact: "Contact" },
    auth: { login: "Log In", signup: "Sign Up", magic_link: "Send Magic Link", google: "Continue with Google", apple: "Continue with Apple", password: "Password", email: "Email Address", remember_me: "Remember me", forgot_password: "Forgot your password?", sign_in: "Sign In", create_account: "Create Account", no_account: "Don\u2019t have an account?", have_account: "Already have an account?" },
    dashboard: { welcome: "Welcome back", active_warranties: "Active Warranties", expiring_soon: "Expiring Soon", pending_approval: "Pending Approval", recent_activity: "Recent Activity", view_all: "View All", create_new: "Create New", total_managed: "Total Warranties Managed", this_month: "This Month" },
    warranty: { create: "Create Warranty", status: { draft: "Draft", pending: "Pending Approval", active: "Active", claimed: "Claimed", expired: "Expired", cancelled: "Cancelled" }, fields: { product_name: "Product Name", serial_number: "Serial Number", purchase_date: "Purchase Date", warranty_end_date: "Warranty End Date", coverage_type: "Coverage Type", coverage_amount: "Coverage Amount", covered_items: "Covered Items", terms_conditions: "Terms & Conditions", start_date: "Start Date", customer_name: "Customer Name", customer_email: "Customer Email" }, actions: { approve: "Approve", reject: "Reject", claim: "Claim Warranty", extend: "Extend Warranty", cancel: "Cancel", download: "Download", share: "Share", edit: "Edit", delete: "Delete" } },
    common: { loading: "Loading...", error: "Error", success: "Success", cancel: "Cancel", save: "Save", delete: "Delete", edit: "Edit", back: "Back", next: "Next", previous: "Previous", more_info: "More Information", help: "Help", settings: "Settings", logout: "Log Out", language: "Language", english: "English", arabic: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", retry: "Retry", all: "All" },
    claims: { title: "Claims", new_claim: "New Claim", status: "Status", warranty: "Warranty", description: "Description", date: "Date", no_claims: "No claims yet", submit: "Submit Claim", evidence: "Evidence", statuses: { pending: "Pending", approved: "Approved", rejected: "Rejected", in_review: "In Review" } },
    billing: { title: "Billing", current_plan: "Current Plan", upgrade: "Upgrade Plan", manage: "Manage Subscription", invoices: "Invoices", invoice_date: "Date", amount: "Amount", status: "Status", download: "Download", free_plan: "Free", pro_plan: "Professional", enterprise_plan: "Enterprise", per_month: "/month", usage: "Usage", warranties_used: "Warranties Used" },
  },
  ar: {
    nav: { home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", features: "\u0627\u0644\u0645\u0632\u0627\u064a\u0627", pricing: "\u0627\u0644\u0623\u0633\u0639\u0627\u0631", login: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644", signup: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628", dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645", warranties: "\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a", contact: "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627" },
    hero: {
      title: "\u062b\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637.\n\u062a\u062a\u0628\u0639 \u0643\u0644 \u0636\u0645\u0627\u0646.",
      subtitle: "Warrantee \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0628\u0646\u064a\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062a. \u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0648\u062a\u0627\u0628\u0639\u0647\u0627 \u0648\u0627\u0637\u0627\u0644\u0628 \u0628\u0647\u0627 \u0628\u062b\u0642\u0629.",
      cta_demo: "\u0637\u0644\u0628 \u0639\u0631\u0636 \u062a\u0648\u0636\u064a\u062d\u064a",
      cta_start: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b",
    },
    features: {
      title: "\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647",
      items: [
        { id: "approval_workflow", title: "\u0633\u064a\u0631 \u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0630\u0643\u064a", description: "\u0642\u0645 \u0628\u062a\u0639\u064a\u064a\u0646 \u0642\u0648\u0627\u0639\u062f \u0645\u0648\u0627\u0641\u0642\u0629 \u0645\u062e\u0635\u0635\u0629\u060c \u0648\u062c\u0647\u0632 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0644\u0644\u0641\u0631\u0642 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060c \u0648\u0623\u062a\u0645\u062a\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062c." },
        { id: "expiry_reminders", title: "\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629", description: "\u0644\u0627 \u062a\u0641\u0648\u062a \u0645\u0648\u0639\u062f \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646. \u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0633\u062a\u0628\u0627\u0642\u064a\u0629 \u0644\u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0648\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u062d\u0631\u062c\u0629." },
        { id: "bilingual_certs", title: "\u0634\u0647\u0627\u062f\u0627\u062a \u062b\u0646\u0627\u0626\u064a\u0629 \u0627\u0644\u0644\u063a\u0629", description: "\u0623\u0646\u0634\u0626 \u0634\u0647\u0627\u062f\u0627\u062a \u0636\u0645\u0627\u0646 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629 \u0628\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629. \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u062e\u0635\u064a\u0635 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0639 \u0639\u0644\u0627\u0645\u062a\u0643 \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629." },
        { id: "dashboard", title: "\u0644\u0648\u062d\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062c \u0641\u0648\u0631\u064a\u0629", description: "\u0627\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0641\u064a \u0644\u0645\u062d\u0629 \u0648\u0627\u062d\u062f\u0629. \u062a\u062a\u0628\u0639 \u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0648\u0633\u062c\u0644 \u0627\u0644\u0627\u062f\u0639\u0627\u0621\u0627\u062a \u0641\u064a \u0645\u0631\u0643\u0632 \u0648\u0627\u062d\u062f." },
        { id: "email_to_warranty", title: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u0644\u0636\u0645\u0627\u0646", description: "\u0623\u0639\u062f \u062a\u0648\u062c\u064a\u0647 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b. \u064a\u062a\u0645 \u062a\u0636\u0645\u064a\u0646 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u062f\u0627\u0639\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u0648\u0631." },
        { id: "chain_tracking", title: "\u062a\u062a\u0628\u0639 \u0627\u0644\u0633\u0644\u0633\u0644\u0629", description: "\u062a\u062a\u0628\u0639 \u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0627\u0644\u062a\u062d\u0648\u064a\u0644\u0627\u062a. \u0627\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0645\u0633\u0627\u0631\u0627\u062a \u062a\u062f\u0642\u064a\u0642 \u0643\u0627\u0645\u0644\u0629 \u0644\u0644\u0645\u0644\u0643\u064a\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062c." },
      ],
    },
    how_it_works: {
      title: "\u0643\u064a\u0641 \u064a\u0639\u0645\u0644 Warrantee",
      steps: [
        { id: "register", title: "\u0633\u062c\u0644 \u0634\u0631\u0643\u062a\u0643", description: "\u0642\u0645 \u0628\u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0648\u0625\u0639\u062f\u0627\u062f \u0645\u0644\u0641 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062e\u0627\u0635 \u0628\u0643 \u0641\u064a \u062f\u0642\u0627\u0626\u0642." },
        { id: "create_warranty", title: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a", description: "\u0623\u0636\u0641 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u064a\u062f\u0648\u064a\u064b\u0627 \u0623\u0648 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a. \u0625\u0631\u0641\u0627\u0642 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0623\u0635\u0644\u064a\u0629 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627." },
        { id: "approve", title: "\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0627\u0644\u062a\u062a\u0628\u0639", description: "\u062a\u0648\u062c\u064a\u0647 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u064a\u0646\u060c \u062c\u0645\u0639 \u0627\u0644\u062a\u0648\u0642\u064a\u0639\u0627\u062a\u060c \u0648\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a." },
        { id: "track", title: "\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0648\u0627\u0644\u0627\u062f\u0639\u0627\u0621", description: "\u062a\u062a\u0628\u0639 \u0627\u0644\u062d\u0627\u0644\u0629 \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0641\u0639\u0644\u064a \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0627\u062f\u0639\u0627\u0621\u0627\u062a \u0645\u0639 \u0627\u0644\u062a\u0648\u062b\u064a\u0642 \u0627\u0644\u0643\u0627\u0645\u0644." },
      ],
    },
    pricing: {
      title: "\u0623\u0633\u0639\u0627\u0631 \u0628\u0633\u064a\u0637\u0629 \u0648\u0634\u0641\u0627\u0641\u0629",
      subtitle: "\u0627\u0628\u062d\u0623 \u0645\u062c\u0627\u0646\u0627\u064b. \u062a\u0648\u0633\u0639 \u0645\u0639 \u0646\u0645\u0648\u0643.",
      plans: [
        {
          id: "free",
          name: "\u0645\u062c\u0627\u0646\u064a",
          price: "$0",
          description: "\u0644\u0644\u0623\u0641\u0631\u0627\u062f \u0648\u0627\u0644\u0641\u0631\u0642 \u0627\u0644\u0635\u063a\u064a\u0631\u0629",
          features: [
            "\u062d\u062a\u0649 50 \u0636\u0645\u0627\u0646\u0629",
            "\u0644\u0648\u062d\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0623\u0633\u0627\u0633\u064a\u0629",
            "\u062f\u0639\u0645 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
            "\u062d\u062a\u0649 \u0639\u0636\u0648\u064a\u0646 \u0641\u064a \u0627\u0644\u0641\u0631\u064a\u0642",
            "\u0633\u062c\u0644 90 \u064a\u0648\u0645\u0627\u064b",
            "\u062a\u062a\u0628\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062b",
          ],
          cta: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b",
        },
        {
          id: "business",
          name: "\u0623\u0639\u0645\u0627\u0644",
          price: "$1",
          description: "\u0644\u0643\u0644 \u0636\u0645\u0627\u0646\u0629\u060c \u0634\u0647\u0631\u064a\u0627\u064b. \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062c\u0627\u0646\u064a\u0629.",
          features: [
            "\u0636\u0645\u0627\u0646\u0627\u062c \u063a\u064a\u0632 \u0645\u062d\u062d\u0648\u062f\u0629",
            "\u0644\u0648\u062d\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062c \u0645\u062a\u0642\u062f\u0645\u0629 \u0648\u062a\u062d\u0644\u064a\u0644\u0627\u062b",
            "\u062f\u0639\u0645 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u062d\u0648\u0627\u0632 \u0623\u0648\u0644\u0648\u064a\u0629",
            "\u062d\u062a\u0649 15 \u0639\u0636\u0648\u0627\u064b \u0641\u064a \u0627\u0644\u0641\u0631\u064a\u0642",
            "\u0633\u062c\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f",
            "\u0633\u064a\u0631 \u0639\u0645\u0644 \u0644\u0648\u0627\u0641\u0642\u0629 \u0645\u062e\u0635\u0635",
            "\u0634\u0647\u0627\u062f\u0627\u062a \u062b\u0646\u0627\u0626\u064a\u0629 \u0627\u0644\u0644\u063a\u0629",
            "\u062a\u062a\u0628\u0639 \u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u0648\u0627\u0644\u062a\u0639\u064a\u064a\u0646\u0627\u062a",
            "8% \u0639\u0645\u0648\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u062a\u0645\u062f\u064a\u062d\u0627\u062a",
          ],
          cta: "\u0627\u0628\u062f\u0623 \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629",
        },
        {
          id: "enterprise",
          name: "\u0645\u0624\u0633\u0633\u064a",
          price: "\u0645\u062e\u0635\u0635",
          description: "\u0644\u0644\u0645\u0624\u0633\u0633\u0627\u062a \u0627\u0644\u0643\u0628\u064a\u0631\u0629",
          features: [
            "\u0643\u0644 \u0634\u064a\u0621 \u0641\u064a \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
            "\u0623\u0639\u0636\u0627\u0621 \u0641\u0631\u064a\u0642 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u064a\u0646",
            "\u0645\u062f\u064a\u0631 \u062d\u0633\u0627\u0628\u0627\u062a \u0645\u062e\u0635\u0635",
            "\u0639\u0645\u0644\u064a\u0627\u062a \u062a\u0643\u0627\u0645\u0644 \u0645\u062e\u0635\u0635\u0629 \u0648API",
            "\u0623\u0645\u0627\u0646 \u0645\u062a\u0642\u062f\u0645 \u0648SSO",
            "\u0636\u0645\u0627\u0646 \u0627\u0644\u0627\u062a\u0641\u0627\u0642\u064a\u0629 \u0639\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062e\u062f\u0645\u0629",
            "\u0639\u0645\u0648\u0644\u0627\u062a \u0645\u062e\u0635\u0635\u0629",
            "\u0634\u0647\u0627\u062f\u0627\u062a \u0628\u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0628\u064a\u0636\u0627\u0621",
          ],
          cta: "\u0627\u062a\u0635\u0644 \u0628\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062b",
        },
      ],
    },
    footer: { company: "\u0627\u0644\u0634\u0631\u0643\u0629", product: "\u0627\u0644\u0645\u0646\u062a\u062c", legal: "\u0642\u0627\u0646\u0648\u0646\u064a", contact: "\u0627\u062a\u0635\u0644" },
    auth: { login: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644", signup: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628", magic_link: "\u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0633\u062d\u0631\u064a", google: "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0639 Google", apple: "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0639 Apple", password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0632", email: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a", remember_me: "\u062a\u0630\u0643\u0631\u0646\u064a", forgot_password: "\u0647\u0644 \u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f", sign_in: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644", create_account: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628", no_account: "\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628\u061f", have_account: "\u0647\u0644 \u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061f" },
    dashboard: { welcome: "\u0623\u0647\u0644\u0627 \u0628\u0639\u0648\u062f\u062a\u0643", active_warranties: "\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629", expiring_soon: "\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b", pending_approval: "\u0641\u064a \u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629", recent_activity: "\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062e\u064a\u0631", view_all: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644", create_new: "\u0625\u0646\u0634\u0627\u0621 \u062c\u062f\u064a\u062f", total_managed: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u064f\u062f\u0627\u0631\u0629", this_month: "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0632" },
    warranty: { create: "\u0625\u0646\u0634\u0627\u0621 \u0636\u0645\u0627\u0646", status: { draft: "\u0645\u0633\u0648\u062f\u0629", pending: "\u0641\u064a \u0627\u064b\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629", active: "\u0646\u0634\u0637", claimed: "\u062a\u0645 \u0627\u0644\u0627\u062d\u0639\u0627\u0621", expired: "\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u062a\u0647", cancelled: "\u062a\u0645 \u0627\u0644\u0625\u0644\u063a\u0627\u0621" }, fields: { product_name: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c", serial_number: "\u0631\u0642\u0645 \u0633\u0644\u0633\u0644\u0629", purchase_date: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621", warranty_end_date: "\u062a\u0627\u0631\u064a\u062e \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646", coverage_type: "\u0646\u0648\u0639 \u0627\u0644\u062a\u063a\u0637\u064a\u0629", coverage_amount: "\u0645\u0628\u0644\u063a \u0627\u0644\u062a\u063a\u0637\u064a\u0629", covered_items: "\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u063a\u0637\u0627\u0629", terms_conditions: "\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645", start_date: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629", customer_name: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644", customer_email: "\u0628\u0631\u064a\u062f \u0627\u0644\u0639\u0645\u064a\u0644 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" }, actions: { approve: "\u0645\u0648\u0627\u0641\u0642\u0629", reject: "\u0631\u0641\u0636", claim: "\u0627\u0644\u0627\u062d\u0639\u0627\u0621 \u0628\u0627\u0644\u0636\u0645\u0627\u0646", extend: "\u062a\u0645\u062d\u064a\u062d \u0627\u0644\u0636\u0645\u0627\u0646", cancel: "\u0625\u0644\u063a\u0627\u0621", download: "\u062a\u062d\u0645\u064a\u0644", share: "\u0645\u0634\u0627\u0631\u0643\u0629", edit: "\u062a\u0639\u062f\u064a\u0644", delete: "\u062d\u0630\u0641" } },
    common: { loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...", error: "\u062e\u0637\u0623", success: "\u0646\u062c\u062d", cancel: "\u0625\u0644\u063a\u0627\u0621", save: "\u062d\u0641\u0638", delete: "\u062d\u0630\u0641", edit: "\u062a\u0639\u062f\u064a\u0644", back: "\u0639\u0648\u062f\u0629", next: "\u0627\u0644\u062a\u0627\u0644\u064a", previous: "\u0627\u0644\u0633\u0627\u0628\u0642", more_info: "\u0645\u0639\u0644\u0648\u0645\u0627\u062c \u0623\u0643\u062b\u0631", help: "\u0645\u0633\u0627\u0639\u062f\u0629", settings: "\u0627\u0644\u0625\u0639\u062f\u0627\u062d\u0627\u062a", logout: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c", language: "\u0627\u0644\u0644\u063a\u0629", english: "English", arabic: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", retry: "Ø¥Ø¹Ø§Ø¯Ø© Ø§ÙÙØ­Ø§ÙÙØ©", all: "Ø§ÙÙÙ" },
    claims: { title: "Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª", new_claim: "ÙØ·Ø§ÙØ¨Ø© Ø¬Ø¯ÙØ¯Ø©", status: "Ø§ÙØ­Ø§ÙØ©", warranty: "Ø§ÙØ¶ÙØ§Ù", description: "Ø§ÙÙØµÙ", date: "Ø§ÙØªØ§Ø±ÙØ®", no_claims: "ÙØ§ ØªÙØ¬Ø¯ ÙØ·Ø§ÙØ¨Ø§Øª", submit: "ØªÙØ¯ÙÙ ÙØ·Ø§ÙØ¨Ø©", evidence: "Ø§ÙØ£Ø¯ÙØ©", statuses: { pending: "ÙÙØ¯ Ø§ÙØ§ÙØªØ¸Ø§Ø±", approved: "ÙÙØ§ÙÙ", rejected: "ÙØ±ÙÙØ¶", in_review: "ÙÙØ¯ Ø§ÙÙØ±Ø§Ø¬Ø¹Ø©" } },
    billing: { title: "Ø§ÙÙÙØ§ØªÙØ±", current_plan: "Ø§ÙØ®Ø·Ø© Ø§ÙØ­Ø§ÙÙØ©", upgrade: "ØªØ±ÙÙØ© Ø§ÙØ®Ø·Ø©", manage: "Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ§Ø´ØªØ±Ø§Ù", invoices: "Ø§ÙÙÙØ§ØªÙØ±", invoice_date: "Ø§ÙØªØ§Ø±ÙØ®", amount: "Ø§ÙÙØ¨ÙØº", status: "Ø§ÙØ­Ø§ÙØ©", download: "ØªØ­ÙÙÙ", free_plan: "ÙØ¬Ø§ÙÙ", pro_plan: "Ø§Ø­ØªØ±Ø§ÙÙ", enterprise_plan: "ÙØ¤Ø³Ø³Ø§Øª", per_month: "/Ø´ÙØ±", usage: "Ø§ÙØ§Ø³ØªØ®Ø¯Ø§Ù", warranties_used: "Ø§ÙØ¶ÙØ§ÙØ§Øª Ø§ÙÙØ³ØªØ®Ø¯ÙØ©" },
  },
};

export function getDictionary(locale: string): Dictionary {
  const normalizedLocale = (locale.toLowerCase() as Locale) || DEFAULT_LOCALE;
  return dictionaries[normalizedLocale] || dictionaries[DEFAULT_LOCALE];
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
