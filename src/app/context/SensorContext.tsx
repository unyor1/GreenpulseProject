import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getBackendSensorData } from "../services/backend";
import { toast } from "sonner";

const env = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;
const DEFAULT_WEATHER_LAT = Number(env.VITE_WEATHER_LAT ?? 14.5176);
const DEFAULT_WEATHER_LON = Number(env.VITE_WEATHER_LON ?? 121.0509);
const WEATHER_LOCATION_STORAGE_KEY = "gp_weather_location";
const PUMP_ON_THRESHOLD_STORAGE_KEY = "gp_pump_on_threshold";
const PUMP_OFF_THRESHOLD_STORAGE_KEY = "gp_pump_off_threshold";
const DEFAULT_PUMP_ON_THRESHOLD = 60;
const DEFAULT_PUMP_OFF_THRESHOLD = 70;
const LIGHT_NOTIFICATION_START_HOUR = 7;
const LIGHT_NOTIFICATION_END_HOUR = 16;
const LIGHT_MAX_LUX = 1000; // used to convert lux to percentage

interface SensorData {
  timestamp: number;
  lightIntensity: number;
  soilMoisture: number;
}

interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
}

interface SensorContextType {
  lightIntensity: number;
  soilMoisture: number;
  weatherLocation: WeatherLocation;
  setWeatherLocation: (location: WeatherLocation) => void;
  humidifierActive: boolean;
  waterPumpActive: boolean;
  setHumidifierActive: (active: boolean) => void;
  setWaterPumpActive: (active: boolean) => void;
  historicalData: SensorData[];
  pumpOnThreshold: number;
  pumpOffThreshold: number;
  setPumpOnThreshold: (v: number) => void;
  setPumpOffThreshold: (v: number) => void;
  getLightStatus: (intensity: number) => "good" | "warning" | "critical";
  getMoistureStatus: (moisture: number) => "good" | "warning" | "critical";
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export function SensorProvider({ children }: { children: ReactNode }) {
  const parseCoordinate = (value: number, min: number, max: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  };

  const getInitialWeatherLocation = (): WeatherLocation => {
    const fallback: WeatherLocation = {
      name: "Taguig City",
      lat: parseCoordinate(DEFAULT_WEATHER_LAT, -90, 90, 14.5176),
      lon: parseCoordinate(DEFAULT_WEATHER_LON, -180, 180, 121.0509),
    };

    if (typeof window === "undefined") {
      return fallback;
    }

    const raw = window.localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const sanitizeName = (input?: unknown) => {
      if (typeof input !== "string") return fallback.name;
      const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0] === parts[1]) {
        return parts[0];
      }
      return input.trim() || fallback.name;
    };

    try {
      const parsed = JSON.parse(raw) as Partial<WeatherLocation>;
      const lat = parseCoordinate(Number(parsed.lat), -90, 90, fallback.lat);
      const lon = parseCoordinate(Number(parsed.lon), -180, 180, fallback.lon);
      const name = sanitizeName(parsed.name);
      return { name, lat, lon };
    } catch {
      return fallback;
    }
  };

  const [lightIntensity, setLightIntensity] = useState(750);
  const [soilMoisture, setSoilMoisture] = useState(65);
  const [pumpOnThreshold, setPumpOnThreshold] = useState<number>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(PUMP_ON_THRESHOLD_STORAGE_KEY) : null;
      return raw === null ? DEFAULT_PUMP_ON_THRESHOLD : Number(raw ?? DEFAULT_PUMP_ON_THRESHOLD);
    } catch {
      return DEFAULT_PUMP_ON_THRESHOLD;
    }
  });
  const [pumpOffThreshold, setPumpOffThreshold] = useState<number>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(PUMP_OFF_THRESHOLD_STORAGE_KEY) : null;
      return raw === null ? DEFAULT_PUMP_OFF_THRESHOLD : Number(raw ?? DEFAULT_PUMP_OFF_THRESHOLD);
    } catch {
      return DEFAULT_PUMP_OFF_THRESHOLD;
    }
  });
  const [weatherLocation, setWeatherLocationState] = useState<WeatherLocation>(() =>
    getInitialWeatherLocation()
  );
  const [humidifierActive, setHumidifierActive] = useState(false);
  const [waterPumpActive, setWaterPumpActive] = useState(false);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [notificationState, setNotificationState] = useState<{
    dateKey?: string;
    lightNotified: boolean;
  }>({
    dateKey: undefined,
    lightNotified: false,
  });

  const getLightStatus = (intensity: number): "good" | "warning" | "critical" => {
    if (intensity <= 30) return "critical";
    if (intensity >= 60) return "good";
    if (intensity >= 40 && intensity <= 50) return "warning";
    return "warning";
  };

  const getMoistureStatus = (moisture: number): "good" | "warning" | "critical" => {
    if (moisture < pumpOnThreshold) return "critical";
    if (moisture > pumpOffThreshold) return "warning";
    return "good";
  };

  const setWeatherLocation = (location: WeatherLocation) => {
    const sanitizeName = (input?: string) => {
      if (!input) return "Custom Location";
      const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0] === parts[1]) return parts[0];
      return input.trim() || "Custom Location";
    };

    setWeatherLocationState({
      name: sanitizeName(location.name),
      lat: parseCoordinate(location.lat, -90, 90, DEFAULT_WEATHER_LAT),
      lon: parseCoordinate(location.lon, -180, 180, DEFAULT_WEATHER_LON),
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, JSON.stringify(weatherLocation));
  }, [weatherLocation]);

  // Persist pump threshold settings
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PUMP_ON_THRESHOLD_STORAGE_KEY, String(pumpOnThreshold));
        window.localStorage.setItem(PUMP_OFF_THRESHOLD_STORAGE_KEY, String(pumpOffThreshold));
      }
    } catch {}
  }, [pumpOnThreshold, pumpOffThreshold]);

  // Simulate real-time sensor updates
  useEffect(() => {
    let isMounted = true;
    const fetchSensor = async () => {
      try {
        const { light, soilMoisture } = await getBackendSensorData();
        if (isMounted) {
          setLightIntensity(light);
          setSoilMoisture(soilMoisture);
        }
      } catch (err) {
        // Optionally handle error (e.g., show toast)
      }
    };
    fetchSensor();
    const interval = setInterval(fetchSensor, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Store historical data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHistoricalData((prev) => {
        const newData = {
          timestamp: Date.now(),
          lightIntensity: lightIntensity,
          soilMoisture: Math.round(soilMoisture),
        };
        // Keep only last 50 data points
        const updated = [...prev, newData];
        return updated.slice(-50);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [lightIntensity, soilMoisture]);

  // Light intensity notifications (7am - 4pm only)
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const isWithinWindow =
      hour >= LIGHT_NOTIFICATION_START_HOUR && hour < LIGHT_NOTIFICATION_END_HOUR;
    const dateKey = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    setNotificationState((prev) => {
      const isNewDay = prev.dateKey !== dateKey;
      const currentState = isNewDay ? { dateKey, lightNotified: false } : prev;

      if (!isWithinWindow) {
        return currentState;
      }

      if (!currentState.lightNotified) {
        const lightPercent = Math.round((lightIntensity / LIGHT_MAX_LUX) * 100);
        if (lightPercent < 30) {
          toast.warning("Light Intensity Alert", {
            description: `Light intensity is ${lightPercent}%. Ensure plants get enough light between 7am and 4pm.`,
          });
          return { ...currentState, lightNotified: true };
        }
      }

      return currentState;
    });
  }, [lightIntensity]);

  return (
    <SensorContext.Provider
      value={{
        lightIntensity,
        soilMoisture,
        weatherLocation,
        setWeatherLocation,
        humidifierActive,
        waterPumpActive,
        setHumidifierActive,
        setWaterPumpActive,
        historicalData,
        pumpOnThreshold,
        pumpOffThreshold,
        setPumpOnThreshold,
        setPumpOffThreshold,
        getLightStatus,
        getMoistureStatus,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error("useSensor must be used within a SensorProvider");
  }
  return context;
}
