import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSensor } from "../context/SensorContext";
import { getCurrentUserProfile } from "../services/auth";
import { PlantbotWidget } from "../components/PlantbotWidget";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Sun, Droplets } from "lucide-react";

export function History() {
  const { historicalData, lightIntensity, soilMoisture } = useSensor();
  const [username, setUsername] = useState("");

  const chartData = historicalData
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      light: Math.round(entry.lightIntensity),
      moisture: entry.soilMoisture,
    }));

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

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sensor History</h2>
          <p className="text-lg font-bold text-gray-900">{username ? `Hi, ${username}` : "Hi there"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/history/switch"
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Water Pump & Pest History
          </Link>
          <Link
            to="/history/sensors"
            className="rounded-full border border-green-500 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
          >
            Managed Sensor History
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700">Current Sensor Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">Light</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900 mb-1">{Math.round(lightIntensity)}</div>
            <div className="text-xs text-yellow-600">%</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Moisture</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mb-1">{Math.round(soilMoisture)}</div>
            <div className="text-xs text-blue-600">%</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Light & Moisture History</h3>
          </div>
          {historicalData.length > 0 ? (
            <div className="text-xs text-gray-500">
              Avg light {stats.avgLight}% · Avg moisture {stats.avgMoisture}%
            </div>
          ) : null}
        </div>
        {chartData.length === 0 ? (
          <div className="text-xs text-gray-500">No light or moisture history available yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="light" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="moisture" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <PlantbotWidget />
    </div>
  );
}
