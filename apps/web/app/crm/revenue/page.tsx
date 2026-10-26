"use client";

import AppShell from "@/components/layout/AppShell";
import RevenueOverview from "@/components/crm/RevenueOverview";

export default function RevenuePage() {
  return (
    <AppShell>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <RevenueOverview />
        </div>
      </main>
    </AppShell>
  );
}
