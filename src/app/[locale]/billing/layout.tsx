import DashboardLayout from "../dashboard/layout";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
