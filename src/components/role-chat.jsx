"use client";
import dynamic from "next/dynamic";

const UserChat  = dynamic(() => import("@/components/user/UserChat"),  { ssr: false, loading: () => <div className="text-white/70">Loading chat…</div> });
const AdminChat = dynamic(() => import("@/components/admin/AdminChat"), { ssr: false, loading: () => <div className="text-white/70">Loading chat…</div> });

export default function RoleChat({ role = "user" }) {
  return role === "admin" ? <AdminChat /> : <UserChat />;
}
