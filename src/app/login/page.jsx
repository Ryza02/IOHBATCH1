"use client";

import GalaxyBG from "@/components/galaxybg";
import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from "next/navigation";
import ContactAdminModal from "@/components/ContactAdminModal";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [contactOpen, setContactOpen] = useState(false);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const identifier = (form.username || "").trim();
    const password = form.password || "";
    if (!identifier || !password) {
      setMsg("Username/email dan password wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login gagal");

      if (data.forceChange) {
        router.replace("/change-password");
        return;
      }
      router.replace(
        data.role === "admin" ? "/dashboard?role=admin" : "/dashboard?role=user"
      );
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setMsg("Lengkapi semua field.");
      setLoading(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMsg("Konfirmasi password tidak cocok.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registrasi gagal");
      router.replace("/user");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GalaxyBG />
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <form
          className="flex flex-col items-center gap-5 w-full max-w-sm"
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          autoComplete="off"
        >
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
            {mode === "login" ? "Login" : "Buat Akun"}
          </h2>

          <input
            type="text"
            name="username"
            placeholder={mode === "login" ? "Username atau Email" : "Username"}
            value={form.username}
            onChange={onChange}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
            required
          />

          {mode === "register" && (
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              required
            />
          )}

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
              className="w-full px-4 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-3 text-white/70 hover:text-white"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {mode === "register" && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={onChange}
              className="w-full px-5 py-2 rounded-2xl bg-white/20 text-white/90 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              required
            />
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-2 rounded-2xl font-semibold text-base bg-white text-black hover:bg-zinc-200 transition shadow-lg disabled:opacity-70"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "SIGN IN"
              : "REGISTER"}
          </button>

          {mode === "login" && (
            <div className="flex items-center justify-end w-full -mt-2">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="text-white/80 hover:text-white text-sm font-medium underline"
              >
                Lupa Password? Hubungi Admin
              </button>
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-1 mt-1">
            {mode === "login" ? (
              <span className="text-white/80 text-sm">
                Belum punya akun?
                <button
                  type="button"
                  className="text-white/80 underline font-medium ml-1 hover:text-indigo-400"
                  onClick={() => {
                    setMode("register");
                    setMsg("");
                  }}
                >
                  Register
                </button>
              </span>
            ) : (
              <span className="text-white/80 text-sm">
                Sudah punya akun?
                <button
                  type="button"
                  className="text-white/80 underline font-medium ml-1 hover:text-indigo-400"
                  onClick={() => {
                    setMode("login");
                    setMsg("");
                  }}
                >
                  Login
                </button>
              </span>
            )}
          </div>

          {msg && (
            <p className="mt-1 text-rose-300 text-sm text-center">{msg}</p>
          )}
        </form>
      </main>

      {/* Modal chat admin terpisah */}
      <ContactAdminModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        presetEmail={form.username?.includes("@") ? form.username : ""}
      />
    </div>
  );
}
