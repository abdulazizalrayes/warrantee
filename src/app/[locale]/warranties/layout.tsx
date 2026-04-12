import DashboardLayout from "../dashboard/layout";

export default function WarrantiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
