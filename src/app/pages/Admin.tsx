import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Leaf, LogOut, Shield, Users } from "lucide-react";
import { getCurrentUserProfile, signOutUser, getUsersByRole } from "../services/auth";
import { getBackendSchedules, getAuditLogs } from "../services/backend";
import type { AuditLogEntry, BackendSensorLog } from "../services/backend";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// stat card values will be loaded dynamically

export function Admin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);
  const [teamUserCount, setTeamUserCount] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      const profile = await getCurrentUserProfile();
      if (!cancelled && profile?.username) {
        setUsername(profile.username);
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load counts for schedules and users with role 'user'
  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const schedules = await getBackendSchedules().catch(() => []);
        if (!cancelled) setScheduleCount(Array.isArray(schedules) ? schedules.length : 0);
      } catch {
        if (!cancelled) setScheduleCount(0);
      }

      try {
        const users = await getUsersByRole("user").catch(() => []);
        if (!cancelled) setTeamUserCount(Array.isArray(users) ? users.length : 0);
      } catch {
        if (!cancelled) setTeamUserCount(0);
      }
    };
    void loadCounts();
    return () => { cancelled = true; };
  }, []);

  // Load recent audit logs for admin review
  useEffect(() => {
    let cancelled = false;
    const loadAudit = async () => {
      setAuditLoading(true);
      setAuditError("");
      try {
        const audits = await getAuditLogs(20);
        if (cancelled) return;
        setAuditLogs(Array.isArray(audits) ? audits : []);
      } catch {
        if (!cancelled) setAuditError("Unable to load audit logs.");
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    };
    void loadAudit();
    return () => { cancelled = true; };
  }, []);

  const timeAgo = (iso?: string | null) => {
    if (!iso) return "unknown";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const auditPreviewLimit = 8;

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed.";
      toast.error(message);
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-4 md:px-6 md:py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1607194402064-d0742de6d17b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMGxlYWYlMjBwbGFudCUyMGxvZ298ZW58MXx8fHwxNzcyNjIzODU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="GreenPulse Logo"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
          />
          <h1 className="text-2xl font-bold text-white">GreenPulse</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <div className="p-5 md:p-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Control Center</p>
                <h1 className="mt-2 text-3xl font-black md:text-4xl">Admin Dashboard</h1>
                <p className="mt-2 text-sm text-emerald-100">
                  {username ? `Welcome, ${username}` : "Welcome, Admin"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/approvals"
                  className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold transition hover:border-emerald-300 hover:text-emerald-200"
                >
                  User Approvals
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Set Schedules",
                value: scheduleCount === null ? "—" : String(scheduleCount),
                note: scheduleCount === null ? "Loading..." : "",
                icon: ArrowRightLeft,
                tone: "from-cyan-500 to-cyan-400",
              },
              {
                title: "Team Members",
                value: teamUserCount === null ? "—" : String(teamUserCount),
                note: teamUserCount === null ? "Loading..." : "",
                icon: Users,
                tone: "from-amber-500 to-amber-400",
              },
            ].map((card) => (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-r p-2 ${card.tone}`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-sm font-semibold text-slate-600">{card.title}</h2>
                <p className="mt-1 text-3xl font-black text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </article>
            ))}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Admin Audit</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Recent Audit Events</h2>
              </div>
            </div>
            {auditLoading ? (
              <div className="text-sm text-slate-500">Loading audit logs...</div>
            ) : auditError ? (
              <div className="text-sm text-red-600">{auditError}</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-sm text-slate-500">No audit events recorded yet.</div>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-auto pr-2">
                <div className="text-xs text-slate-500">
                  Showing latest {Math.min(auditPreviewLimit, auditLogs.length)} of {auditLogs.length} events
                </div>
                {auditLogs.slice(0, auditPreviewLimit).map((audit) => (
                  <div key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {audit.username ?? "Unknown user"}
                        {audit.event === "login" && " logged in"}
                        {audit.event === "manual_switch" && ` toggled ${audit.device === "waterpump" ? "Water Pump" : "Pest Control"}`}
                        {audit.event === "schedule_create" && " created a schedule"}
                        {audit.event === "schedule_update" && " updated a schedule"}
                        {audit.event === "schedule_delete" && " deleted a schedule"}
                      </div>
                      <div className="text-xs text-slate-500">{timeAgo(audit.createdAt)}</div>
                    </div>
                    {audit.details ? (
                      <p className="mt-2 text-sm text-slate-700">{audit.details}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
