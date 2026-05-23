import DashboardLayout from "../dashboard/layout";

export default function ExtensionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
