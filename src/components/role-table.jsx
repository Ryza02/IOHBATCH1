"use client";
import dynamic from "next/dynamic";

const UserTable  = dynamic(() => import("@/components/user/UserTable"),  { ssr: false });
const AdminTable = dynamic(() => import("@/components/admin/AdminTable"), { ssr: false });

export default function RoleTable({ role = "user" }) {
  if (role === "admin") return <AdminTable />;
  return <UserTable />;
}
