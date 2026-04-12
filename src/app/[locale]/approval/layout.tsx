import DashboardLayout from "../dashboard/layout";

export default function ApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
