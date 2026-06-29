"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./_sidebar";

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditor = pathname?.startsWith("/dashboard/editor");

  if (isEditor) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
