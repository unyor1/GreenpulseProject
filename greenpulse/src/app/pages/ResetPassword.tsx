import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../services/supabase";
import { sendPasswordReset } from "../services/auth";
import { GreenPulseHeader } from "../components/GreenPulseHeader";

export function ResetPassword() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const processSession = async () => {
      try {
        if (!supabase) throw new Error("Supabase not configured");

        // Supabase client may not expose getSessionFromUrl in some builds. Manually parse
        // the URL fragment for access_token/refresh_token and set the session.
        // The confirmation URL can look like: http://.../#/auth/reset#access_token=...&refresh_token=...
        // so we find the last '#' and parse the params after it.
        let fragment = window.location.hash || window.location.search || "";
        if (fragment.startsWith("#")) fragment = fragment.substring(1);
        const lastHash = fragment.lastIndexOf("#");
        let paramString = fragment;
        if (lastHash !== -1) {
          paramString = fragment.substring(lastHash + 1);
        }
        // If a '?' is present (some clients include query), strip the leading path
        const qIndex = paramString.indexOf("?");
        if (qIndex !== -1) paramString = paramString.substring(qIndex + 1);
        const params = new URLSearchParams(paramString);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          console.log("Session set from URL:", data);
          // Clean up URL (remove tokens)
          try {
            const clean = `${window.location.origin}${window.location.pathname}${window.location.hash.includes('#/auth/reset') ? '#/auth/reset' : ''}`;
            window.history.replaceState({}, document.title, clean);
          } catch (_) {
            // ignore
          }
        } else {
          throw new Error("Auth session missing");
        }
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Unable to process recovery link.";
        setErrorMsg(msg);
        toast.error(msg);
      } finally {
        if (active) setIsProcessing(false);
      }
    };

    void processSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg("Password updated. Please sign in.");
      toast.success("Password updated. Please sign in.");
      navigate("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/20">
          <p className="text-lg font-semibold">Processing reset link…</p>
          <p className="mt-3 text-sm text-slate-300">Please wait while we validate the recovery link.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GreenPulseHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/20 w-full max-w-md">
        <h2 className="text-2xl font-semibold">Choose a new password</h2>
        <p className="mt-2 text-sm text-slate-300">Set a strong new password for your account.</p>

        <form onSubmit={onSubmit} className="mt-6">
          <input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/3 p-3 text-white"
          />

          <input
            type="password"
            required
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/3 p-3 text-white mt-3"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "Updating…" : "Update password"}
          </button>
        </form>
        {errorMsg ? (
          <div className="mt-4">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => navigate('/forgot')}
                className="rounded-md bg-white/5 px-3 py-2 text-sm text-emerald-400"
              >
                Resend reset email
              </button>
            </div>
          </div>
        ) : null}

        {successMsg ? (
          <p className="mt-4 text-sm text-emerald-300">{successMsg}</p>
        ) : null}
      </div>
    </div>
  </>
  );
}
