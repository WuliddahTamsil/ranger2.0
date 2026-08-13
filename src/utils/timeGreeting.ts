import { useEffect, useState } from "react";

export type TimeGreeting = "selamat pagi" | "selamat siang" | "selamat sore" | "selamat malam";

export const getTimeGreeting = (date: Date = new Date()): TimeGreeting => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return "selamat pagi";
  if (hour >= 11 && hour < 15) return "selamat siang";
  if (hour >= 15 && hour < 18) return "selamat sore";
  return "selamat malam";
};

export const useTimeGreeting = (): TimeGreeting => {
  const [greeting, setGreeting] = useState<TimeGreeting>(() => getTimeGreeting());

  useEffect(() => {
    const timer = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
};
