"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Wind,
} from "lucide-react";

type WeatherSummary = {
  temperatureC: number;
  windKmh: number;
  weatherCode: number;
};

const WEATHER_LABEL: Record<number, string> = {
  0: "Trời quang",
  1: "Ít mây",
  2: "Mây rải rác",
  3: "Nhiều mây",
  45: "Sương mù",
  48: "Sương mù lạnh",
  51: "Mưa phùn nhẹ",
  53: "Mưa phùn",
  55: "Mưa phùn dày",
  61: "Mưa nhẹ",
  63: "Mưa vừa",
  65: "Mưa to",
  71: "Tuyết nhẹ",
  73: "Tuyết",
  75: "Tuyết dày",
  77: "Hạt tuyết",
  80: "Mưa rào nhẹ",
  81: "Mưa rào",
  82: "Mưa rào lớn",
  95: "Dông",
  96: "Dông kèm mưa đá nhẹ",
  99: "Dông kèm mưa đá",
};

function weatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 55) return CloudDrizzle;
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FBangkok";

export function KioskWeatherClock() {
  // Defer time initialization to client to avoid SSR/CSR hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherErr, setWeatherErr] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(WEATHER_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as {
          current?: {
            temperature_2m?: number;
            wind_speed_10m?: number;
            weather_code?: number;
          };
        };
        if (cancelled) return;
        const c = data.current;
        if (
          !c ||
          typeof c.temperature_2m !== "number" ||
          typeof c.weather_code !== "number"
        ) {
          throw new Error("malformed");
        }
        setWeather({
          temperatureC: c.temperature_2m,
          windKmh: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : 0,
          weatherCode: c.weather_code,
        });
        setWeatherErr(false);
      } catch {
        if (!cancelled) setWeatherErr(true);
      }
    }
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const timeStr = now
    ? now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";
  const dateStr = now
    ? now.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

  const Icon = weather ? weatherIcon(weather.weatherCode) : Clock;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-2 backdrop-blur">
      <div className="flex flex-col items-end leading-tight">
        <span className="font-mono text-2xl font-semibold tabular-nums">
          {timeStr}
        </span>
        <span className="text-[11px] capitalize opacity-80">{dateStr}</span>
      </div>
      <div className="h-10 w-px bg-white/30" aria-hidden />
      <div className="flex items-center gap-2">
        <Icon className="size-7" aria-hidden />
        <div className="flex flex-col leading-tight">
          {weather && !weatherErr ? (
            <>
              <span className="font-semibold tabular-nums">
                {Math.round(weather.temperatureC)}°C
              </span>
              <span className="flex items-center gap-1 text-[10px] opacity-80">
                <span className="truncate max-w-[110px]">
                  {WEATHER_LABEL[weather.weatherCode] ?? "Hà Nội"}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Wind className="size-2.5" aria-hidden />
                  {Math.round(weather.windKmh)} km/h
                </span>
              </span>
            </>
          ) : (
            <span className="text-[11px] opacity-80">
              {weatherErr ? "Hà Nội" : "Đang tải..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
