"use client";

import { useState } from "react";

export default function AuthModal({ show, onClose }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(mode === "login" ? "Login!" : "Register!");
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-morphism-dark rounded-3xl p-8 w-full max-w-md transform transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === "login" ? "Login" : "Buat Akun"}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            placeholder={mode === "login" ? "Username" : "Nama Lengkap"}
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-xl glass-morphism text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {mode === "register" && (
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl glass-morphism text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl glass-morphism text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-300 hover:text-white"
            >
              {showPassword ? "👁️" : "🔒"}
            </button>
          </div>

          {mode === "register" && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl glass-morphism text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}

          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            {mode === "login" ? "SIGN IN" : "REGISTER"}
          </button>

          {mode === "login" && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-2" /> Remember Me
              </label>
              <a href="#" className="text-blue-400 hover:text-blue-300">Forgot Password?</a>
            </div>
          )}

          <div className="text-center pt-4">
            <span className="text-gray-300">
              {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {mode === "login" ? "Register" : "Login"}
              </button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}