// Fetch latest sensor readings (light, soilMoisture) from Supabase
export async function getBackendSensorData(): Promise<{ light: number; soilMoisture: number }> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }
  const { data, error } = await supabase
    .from(SUPABASE_DEVICE_TABLE)
    .select("light,soil_moisture")
    .eq("device_id", SUPABASE_DEVICE_ID)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase sensor read failed: ${error.message}`);
  }
  const row = data as { light?: unknown; soil_moisture?: unknown } | null;
  return {
    light: typeof row?.light === "number" ? row.light : Number(row?.light ?? 0),
    soilMoisture: typeof row?.soil_moisture === "number" ? row.soil_moisture : Number(row?.soil_moisture ?? 0),
  };
}
/// <reference types="vite/client" />
// Backend sync for humidifier (Pest Control)
export async function getBackendHumidifierState(): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }
  const { data, error } = await supabase
    .from(SUPABASE_DEVICE_TABLE)
    .select("pest_on")
    .eq("device_id", SUPABASE_DEVICE_ID)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  const row = data as { pest_on?: unknown } | null;
  return parseBooleanValue(row?.pest_on);
}

export async function setBackendHumidifierState(active: boolean): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }
  const { error } = await supabase.from(SUPABASE_DEVICE_TABLE).upsert(
    {
      device_id: SUPABASE_DEVICE_ID,
      pest_on: active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" }
  );
  if (error) {
    throw new Error(`Supabase write failed: ${error.message}`);
  }
}

// Backend sync for water pump
export async function getBackendWaterPumpState(): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }
  const { data, error } = await supabase
    .from(SUPABASE_DEVICE_TABLE)
    .select("waterpump_on")
    .eq("device_id", SUPABASE_DEVICE_ID)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase read failed: ${error.message}`);
  }
  const row = data as { waterpump_on?: unknown } | null;
  return parseBooleanValue(row?.waterpump_on);
}

export async function setBackendWaterPumpState(active: boolean): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }
  const { error } = await supabase.from(SUPABASE_DEVICE_TABLE).upsert(
    {
      device_id: SUPABASE_DEVICE_ID,
      waterpump_on: active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" }
  );
  if (error) {
    throw new Error(`Supabase write failed: ${error.message}`);
  }
}

export interface BackendSensorLog {
  createdAt: string;
  waterpump: boolean;
  pest: boolean;
}

export async function getBackendSensorLogs(limit = 200): Promise<BackendSensorLog[]> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const { data, error } = await supabase
    .from("sensor_logs")
    .select("created_at,waterpump,pest")
    .eq("device_id", SUPABASE_DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase sensor logs read failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    createdAt: String(row.created_at ?? ""),
    waterpump: parseBooleanValue(row.waterpump),
    pest: parseBooleanValue(row.pest),
  }));
}
import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;

const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "https://ppcwxgllgvqdgidbifky.supabase.co").trim();
const SUPABASE_KEY = (env.VITE_SUPABASE_KEY ?? "").trim();
const SUPABASE_DEVICE_ID = (env.VITE_SUPABASE_DEVICE_ID ?? "esp32-1").trim();
const SUPABASE_DEVICE_TABLE = (env.VITE_SUPABASE_DEVICE_TABLE ?? "device_state").trim();

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const parseBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "on";
  }
  return false;
};

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  username: string | null;
  event: string;
  device: ScheduleDevice | null;
  state: boolean | null;
  details: string | null;
  createdAt: string;
}

export async function logAuditEvent(input: {
  userId?: string | null;
  username?: string | null;
  event: string;
  device?: ScheduleDevice | null;
  state?: boolean | null;
  details?: string | null;
}): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.userId ?? null,
    username: input.username ?? null,
    event: input.event,
    device: input.device ?? null,
    state: input.state ?? null,
    details: input.details ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Supabase audit log failed: ${error.message}`);
  }
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,user_id,username,event,device,state,details,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase audit log read failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    userId: row.user_id ? String(row.user_id) : null,
    username: row.username ? String(row.username) : null,
    event: String(row.event ?? ""),
    device: parseScheduleDevice(row.device) ?? null,
    state: row.state === null ? null : parseBooleanValue(row.state),
    details: row.details ? String(row.details) : null,
    createdAt: String(row.created_at ?? ""),
  }));
}

const normalizeTimeValue = (value: unknown): string => {
  if (typeof value !== "string") {
    return "00:00:00";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "00:00:00";
  }

  const parts = trimmed.split(":");
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1]}:00`;
  }

  if (parts.length >= 3) {
    return `${parts[0]}:${parts[1]}:${parts[2]}`;
  }

  return "00:00:00";
};

const parseNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[{}\s]/g, "");
    if (!cleaned) return [];
    return cleaned
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  }

  return [];
};

export type ScheduleDevice = "pest" | "waterpump";

export interface BackendSchedule {
  id: number;
  deviceId: string;
  device: ScheduleDevice;
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBackendScheduleInput {
  device: ScheduleDevice;
  days: number[];
  startTime: string;
  endTime: string;
  timezone?: string;
  enabled?: boolean;
}

const parseScheduleDevice = (value: unknown): ScheduleDevice | null => {
  if (value === "pest" || value === "waterpump") {
    return value;
  }
  return null;
};

const mapBackendSchedule = (row: Record<string, unknown>): BackendSchedule | null => {
  const id = Number(row.id);
  const device = parseScheduleDevice(row.device);

  if (!Number.isFinite(id) || !device) {
    return null;
  }

  return {
    id,
    deviceId: String(row.device_id ?? ""),
    device,
    days: parseNumberArray(row.days),
    startTime: normalizeTimeValue(row.start_time),
    endTime: normalizeTimeValue(row.end_time),
    timezone: String(row.timezone ?? "Asia/Manila"),
    enabled: parseBooleanValue(row.enabled),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
};

export const hasScheduleBackendConfig = () => Boolean(supabase && SUPABASE_DEVICE_ID);

export async function getBackendSchedules(): Promise<BackendSchedule[]> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const { data, error } = await supabase
    .from("device_schedules")
    .select("id,device_id,device,days,start_time,end_time,timezone,enabled,created_at,updated_at")
    .eq("device_id", SUPABASE_DEVICE_ID)
    .eq("enabled", true)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Supabase schedule read failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map(mapBackendSchedule).filter((item): item is BackendSchedule => Boolean(item));
}

export async function createBackendSchedule(input: CreateBackendScheduleInput): Promise<BackendSchedule> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const payload = {
    device_id: SUPABASE_DEVICE_ID,
    device: input.device,
    days: [...new Set(input.days)].sort((a, b) => a - b),
    start_time: normalizeTimeValue(input.startTime),
    end_time: normalizeTimeValue(input.endTime),
    timezone: input.timezone ?? "Asia/Manila",
    enabled: input.enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("device_schedules")
    .insert(payload)
    .select("id,device_id,device,days,start_time,end_time,timezone,enabled,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(`Supabase schedule insert failed: ${error.message}`);
  }

  const mapped = mapBackendSchedule((data ?? {}) as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Supabase schedule insert returned invalid data");
  }

  return mapped;
}

export async function deleteBackendSchedule(id: number): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const { error } = await supabase
    .from("device_schedules")
    .delete()
    .eq("id", id)
    .eq("device_id", SUPABASE_DEVICE_ID);

  if (error) {
    throw new Error(`Supabase schedule delete failed: ${error.message}`);
  }
}

export async function updateBackendSchedule(id: number, input: CreateBackendScheduleInput): Promise<BackendSchedule> {
  if (!supabase) {
    throw new Error("Supabase config missing");
  }

  const payload = {
    device: input.device,
    days: [...new Set(input.days)].sort((a, b) => a - b),
    start_time: normalizeTimeValue(input.startTime),
    end_time: normalizeTimeValue(input.endTime),
    timezone: input.timezone ?? "Asia/Manila",
    enabled: input.enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("device_schedules")
    .update(payload)
    .eq("id", id)
    .eq("device_id", SUPABASE_DEVICE_ID)
    .select("id,device_id,device,days,start_time,end_time,timezone,enabled,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(`Supabase schedule update failed: ${error.message}`);
  }

  const mapped = mapBackendSchedule((data ?? {}) as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Supabase schedule update returned invalid data");
  }

  return mapped;
}

