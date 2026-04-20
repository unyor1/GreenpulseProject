import { useEffect, useState } from "react";
import { useSensor } from "../context/SensorContext";
import { getBackendSensorLogs } from "../services/backend";
import { getCurrentUserProfile } from "../services/auth";
import { PlantbotWidget } from "../components/PlantbotWidget";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Clock, Sun, Droplets, Wind } from "lucide-react";

type SwitchDevice = "waterpump" | "pest";

interface SwitchEvent {
  id: string;
  device: SwitchDevice;
  state: boolean;
  timestamp: string;
}

export function History() {
  const { historicalData, lightIntensity, soilMoisture } = useSensor();
  const [switchEvents, setSwitchEvents] = useState<SwitchEvent[]>([]);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [username, setUsername] = useState("");

  // Format data for charts
  const chartData = historicalData.map((data) => ({
    time: new Date(data.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    light: Math.round(data.lightIntensity),
    moisture: data.soilMoisture,
  }));

  // Calculate statistics
  const getStats = () => {
    if (historicalData.length === 0) {
      return {
        avgLight: 0,
        avgMoisture: 0,
        minLight: 0,
        maxLight: 0,
        minMoisture: 0,
        maxMoisture: 0,
      };
    }

    const lights = historicalData.map((d) => Math.round(d.lightIntensity));
    const moistures = historicalData.map((d) => d.soilMoisture);

    return {
      avgLight: Math.round(lights.reduce((a, b) => a + b, 0) / lights.length),
      avgMoisture: Math.round(moistures.reduce((a, b) => a + b, 0) / moistures.length),
      minLight: Math.min(...lights),
      maxLight: Math.max(...lights),
      minMoisture: Math.min(...moistures),
      maxMoisture: Math.max(...moistures),
    };
  };

  const stats = getStats();

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
    if (filterDateStart && eventTime < filterDateStart) return false;
    if (filterDateEnd && eventTime > filterDateEnd) return false;
    return true;
  });

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Welcome</h2>
          <p className="text-lg font-bold text-gray-900">
            {username ? `Hi, ${username}` : "Hi there"}
          </p>
        </div>
      </div>
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Historical Data
        </h2>
      
      </div>

      {/* Current Values Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Light</span>
          </div>
            <div className="text-2xl font-bold text-yellow-900 mb-1">
              {Math.round(lightIntensity)}
            </div>
            <div className="text-xs text-yellow-600">%</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Moisture</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mb-1">
            {Math.round(soilMoisture)}
          </div>
          <div className="text-xs text-blue-600">%</div>
        </div>
      </div>

      {/* Light Intensity Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-yellow-600" />
          <h3 className="text-sm font-semibold text-gray-700">
            Light Intensity Over Time
          </h3>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="light"
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#colorLight)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[150px] flex items-center justify-center text-gray-400 text-sm">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Collecting data...</p>
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-yellow-50 rounded-lg p-2 text-center">
            <div className="text-yellow-600 font-medium">Avg</div>
            <div className="text-yellow-900 font-semibold">{stats.avgLight}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2 text-center">
            <div className="text-yellow-600 font-medium">Min</div>
            <div className="text-yellow-900 font-semibold">{stats.minLight}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2 text-center">
            <div className="text-yellow-600 font-medium">Max</div>
            <div className="text-yellow-900 font-semibold">{stats.maxLight}</div>
          </div>
        </div>
      </div>

      {/* Soil Moisture Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">
            Soil Moisture Over Time
          </h3>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="moisture"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorMoisture)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[150px] flex items-center justify-center text-gray-400 text-sm">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Collecting data...</p>
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-blue-600 font-medium">Avg</div>
            <div className="text-blue-900 font-semibold">{stats.avgMoisture}%</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-blue-600 font-medium">Min</div>
            <div className="text-blue-900 font-semibold">{stats.minMoisture}%</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-blue-600 font-medium">Max</div>
            <div className="text-blue-900 font-semibold">{stats.maxMoisture}%</div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-auto">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600">
            Data refreshes every 10 seconds • Last 50 readings shown
          </span>
        </div>
      </div>

      {/* Switch History */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">
            Water Pump & Pest Switch History
          </h3>
        </div>
        <div className="mb-3 max-w-xs">
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="history-date">
            Date
          </label>
          <input
            id="history-date"
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
          />
        </div>
        {switchLoading ? (
          <div className="text-xs text-gray-500">Loading switch history...</div>
        ) : switchError ? (
          <div className="text-xs text-red-600">{switchError}</div>
        ) : filteredSwitchEvents.length === 0 ? (
          <div className="text-xs text-gray-500">No switch events yet.</div>
        ) : (
          <div className="space-y-2">
            {filteredSwitchEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {event.device === "waterpump" ? (
                    <Droplets className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Wind className="w-4 h-4 text-green-600" />
                  )}
                  <div className="text-xs text-gray-700">
                    <span className="font-medium">
                      {event.device === "waterpump" ? "Water Pump" : "Pest Control"}
                    </span>{" "}
                    {event.state ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlantbotWidget />
    </div>
  );
}
