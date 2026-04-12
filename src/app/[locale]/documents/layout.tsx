import DashboardLayout from "../dashboard/layout";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
