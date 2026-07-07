import { User, Key } from "lucide-react";

import PageWrapper from "@/components/shared/PageWrapper";
import { useAuthStore } from "@/store/auth.store";

export const Settings: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Settings Workspace
          </h1>
          <p className="text-text-secondary text-sm">
            Manage your credentials, business profile parameters, and AI model parameters
          </p>
        </div>

        {/* User Card */}
        <div className="bg-surface/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <User className="w-4 h-4 text-accent" /> Owner Account Profile
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-text-muted font-medium">Full Name</p>
              <p className="text-text-primary font-bold mt-1 text-sm">{user?.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-text-muted font-medium">Email Address</p>
              <p className="text-text-primary font-bold mt-1 text-sm">{user?.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-text-muted font-medium">Role Access Level</p>
              <p className="text-text-primary font-bold mt-1 capitalize text-sm">{user?.role || "Owner"}</p>
            </div>
            <div>
              <p className="text-text-muted font-medium">Business Unique ID</p>
              <p className="text-text-primary font-mono mt-1 text-sm select-all">{user?.business_id || "None"}</p>
            </div>
          </div>
        </div>

        {/* System Keys */}
        <div className="bg-surface/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" /> AI COO System API Keys
          </h3>
          
          <p className="text-xs text-text-secondary leading-relaxed">
            API keys are set securely in the backend server environment configuration `.env` file. These govern multi-agent task execution and external research parameters:
          </p>

          <div className="space-y-3 mt-1">
            <div className="p-3 bg-[#0a0a0f]/60 border border-white/5 rounded-xl flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-text-primary">Google Gemini model engine</p>
                <p className="text-[10px] text-text-muted mt-0.5">Used for core multi-agent orchestration and chat reasoning</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/10">
                Configured in Server
              </span>
            </div>

            <div className="p-3 bg-[#0a0a0f]/60 border border-white/5 rounded-xl flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-text-primary">Groq model engine</p>
                <p className="text-[10px] text-text-muted mt-0.5">Serves as low-latency fallback router in case of Gemini rate limit exhaustion</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/10">
                Configured in Server
              </span>
            </div>

            <div className="p-3 bg-[#0a0a0f]/60 border border-white/5 rounded-xl flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-text-primary">Tavily Web Search engine</p>
                <p className="text-[10px] text-text-muted mt-0.5">Allows the Search Agent to fetch external market metrics and news</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/10">
                Configured in Server
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
