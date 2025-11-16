"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import AdminTable from "@/components/admin/AdminTable";

export default function AdminTablePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] relative bg-gradient-to-br from-[#0e1021] via-[#0b0d1a] to-[#0f1222]">
      {/* Background Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-20 -top-24 w-[34vw] h-[34vw] rounded-full blur-3xl opacity-25 bg-[#a78bfa]" />
        <div className="absolute -right-20 top-44 w-[28vw] h-[28vw] rounded-full blur-3xl opacity-20 bg-[#22d3ee]" />
      </div>

      {/* Layout */}
      <div className="relative z-10 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role="admin" />
        <div className="flex-1 flex flex-col min-h-[100dvh]">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 p-4 md:p-6 space-y-6">
            <AdminTable />
          </main>
        </div>
      </div>
    </div>
  );
}