import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Building, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
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
    if (!fullName || !email || !password || !businessName) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        email,
        password,
        full_name: fullName,
        business_name: businessName,
      });
      // Save tokens to localStorage so request interceptor can attach it for getMe()
      localStorage.setItem('auth_tokens', JSON.stringify(response));
      const userProfile = await authService.getMe();
      login(response, userProfile);
      toast.success("Account successfully created!");
      navigate("/dashboard");
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden px-4">
      {/* Premium background mesh & floating glow orbs */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(79,70,229,0.08),transparent_50%)]" />
      <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-[#a855f7]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glass card container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl z-10 my-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-accent via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
            AI COO
          </h2>
          <p className="text-text-secondary text-sm mt-2">
            Create an account to digitize and optimize your business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-4 py-2.5 rounded-lg outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
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
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-4 py-2.5 rounded-lg outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Business Name
            </label>
            <div className="relative">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="My Retail Shop"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-4 py-2.5 rounded-lg outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0f]/60 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary pl-10 pr-10 py-2.5 rounded-lg outline-none transition-all"
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-gradient-to-r from-accent to-accent-muted hover:opacity-95 text-white font-semibold text-sm py-3 px-4 rounded-lg shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-text-secondary">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline font-semibold ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
