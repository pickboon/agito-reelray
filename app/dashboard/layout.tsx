import { Sidebar } from "./_sidebar";
import { DashboardContent } from "./_dashboard-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardContent>{children}</DashboardContent>;
}
