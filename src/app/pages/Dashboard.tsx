import { useEffect, useState } from "react";
import { MonitoringCard } from "../components/MonitoringCard";
import { WeatherForecast } from "../components/WeatherForecast";
import { WateringRecommendation } from "../components/WateringRecommendation";
import { PlantbotWidget } from "../components/PlantbotWidget";
import { useSensor } from "../context/SensorContext";
import { Sun, Droplets } from "lucide-react";
import { getCurrentUserProfile } from "../services/auth";

export function Dashboard() {
  const { lightIntensity, soilMoisture, getLightStatus, getMoistureStatus } =
    useSensor();
  const [username, setUsername] = useState("");

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Welcome</h2>
          <p className="text-lg font-bold text-gray-900">
            {username ? `Hi, ${username}` : "Hi there"}
          </p>
        </div>
      </div>
      {/* Monitoring Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Environmental Sensors
        </h2>
        <div className="space-y-3">
          <MonitoringCard
            title="Light Intensity"
            value={Math.round(lightIntensity)}
            unit="lux"
            icon={Sun}
            iconColor="text-yellow-500"
            status={getLightStatus(lightIntensity)}
          />
          <MonitoringCard
            title="Soil Moisture"
            value={Math.round(soilMoisture)}
            unit="%"
            icon={Droplets}
            iconColor="text-blue-500"
            status={getMoistureStatus(soilMoisture)}
          />
        </div>
      </div>

      {/* Smart Watering Recommendation */}
      <div>
        <WateringRecommendation />
      </div>

      {/* Weather Forecast */}
      <div>
        <WeatherForecast />
      </div>

      {/* Status Footer */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">System Active</span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      <PlantbotWidget />
    </div>
  );
}
