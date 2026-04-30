import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBackendSensorLogs } from "../services/backend";
import { getCurrentUserProfile } from "../services/auth";
import { PlantbotWidget } from "../components/PlantbotWidget";
import { Droplets, Wind, Clock } from "lucide-react";

type SwitchDevice = "waterpump" | "pest";

interface SwitchEvent {
  id: string;
  device: SwitchDevice;
  state: boolean;
  timestamp: string;
}

export function SwitchHistory() {
  const [switchEvents, setSwitchEvents] = useState<SwitchEvent[]>([]);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<SwitchDevice | "all">("all");
  const [username, setUsername] = useState("");

  useEffect(() => {
    let cancelled = false;
    const REFRESH_INTERVAL_MS = 60 * 1000;

    const buildEvents = (rows: Array<{ createdAt: string; waterpump: boolean; pest: boolean }>) => {
      const ordered = rows
        .filter((row) => row.createdAt)
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (ordered.length === 0) return [] as SwitchEvent[];

      let prevPump = ordered[0].waterpump;
      let prevPest = ordered[0].pest;
      const events: SwitchEvent[] = [];

      for (let i = 1; i < ordered.length; i += 1) {
        const row = ordered[i];
        if (row.waterpump !== prevPump) {
          events.push({
            id: `waterpump-${row.createdAt}-${row.waterpump ? "on" : "off"}`,
            device: "waterpump",
            state: row.waterpump,
            timestamp: row.createdAt,
          });
          prevPump = row.waterpump;
        }
        if (row.pest !== prevPest) {
          events.push({
            id: `pest-${row.createdAt}-${row.pest ? "on" : "off"}`,
            device: "pest",
            state: row.pest,
            timestamp: row.createdAt,
          });
          prevPest = row.pest;
        }
      }

      return events.reverse().slice(0, 50);
    };

    const loadSwitchHistory = async () => {
      setSwitchLoading(true);
      setSwitchError("");
      try {
        const rows = await getBackendSensorLogs(200);
        if (cancelled) return;
        setSwitchEvents(buildEvents(rows));
      } catch {
        if (!cancelled) setSwitchError("Unable to load switch history.");
      } finally {
        if (!cancelled) setSwitchLoading(false);
      }
    };

    void loadSwitchHistory();
    const interval = setInterval(() => void loadSwitchHistory(), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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

  const filterDateStart = filterDate ? new Date(`${filterDate}T00:00:00`) : null;
  const filterDateEnd = filterDate ? new Date(`${filterDate}T23:59:59`) : null;
  const filteredSwitchEvents = switchEvents.filter((event) => {
    const eventTime = new Date(event.timestamp);
    if (deviceFilter !== "all" && event.device !== deviceFilter) return false;
    if (filterDateStart && eventTime < filterDateStart) return false;
    if (filterDateEnd && eventTime > filterDateEnd) return false;
    return true;
  });
  const previewSwitchEvents = filteredSwitchEvents.slice(0, 50);

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Water Pump & Pest History</h2>
          <p className="text-lg font-bold text-gray-900">{username ? `Hi, ${username}` : "Hi there"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/history"
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Light & Moisture History
          </Link>
          <Link
            to="/history/sensors"
            className="rounded-full border border-green-500 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
          >
            Managed Sensor History
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-2 text-slate-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Water Pump & Pest Switch History</h3>
              <p className="text-xs text-slate-500">Track recent switch events and state changes.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(170px,_1fr)_auto] w-full sm:w-auto">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2" htmlFor="history-date">
                Date
              </label>
              <input
                id="history-date"
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Device</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "waterpump", "pest"] as const).map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() => setDeviceFilter(device)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
                      deviceFilter === device
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {device === "all" ? "All" : device === "waterpump" ? "Water Pump" : "Pest"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-slate-500">
          Showing {previewSwitchEvents.length} of {filteredSwitchEvents.length} switch event{previewSwitchEvents.length === 1 ? "" : "s"}.
        </div>

        {switchLoading ? (
          <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">Loading switch history...</div>
        ) : switchError ? (
          <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{switchError}</div>
        ) : filteredSwitchEvents.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No switch events yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {previewSwitchEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${event.device === "waterpump" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {event.device === "waterpump" ? <Droplets className="h-4 w-4" /> : <Wind className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {event.device === "waterpump" ? "Water Pump" : "Pest Control"} {event.state ? "ON" : "OFF"}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlantbotWidget />
    </div>
  );
}
