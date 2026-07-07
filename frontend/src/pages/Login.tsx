import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      // Save tokens to localStorage so request interceptor can attach it for getMe()
      localStorage.setItem('auth_tokens', JSON.stringify(response));
      const userProfile = await authService.getMe();
      login(response, userProfile);
      toast.success("Welcome back to AI COO!");
      navigate("/dashboard");
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Invalid email or password.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden px-4">
      {/* Premium background mesh & floating glow orbs */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(79,70,229,0.08),transparent_50%)]" />
      <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] bg-accent/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-accent-muted/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glass card container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-accent via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
            AI COO
          </h2>
          <p className="text-text-secondary text-sm mt-2">
            Login to access your business operations dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-4 py-3 rounded-lg outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-10 py-3 rounded-lg outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-gradient-to-r from-accent to-accent-muted hover:opacity-95 text-white font-semibold text-sm py-3 px-4 rounded-lg shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-text-secondary">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent hover:underline font-semibold ml-1">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
