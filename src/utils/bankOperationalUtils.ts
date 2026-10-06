/**
 * Utility to check operational status of Bank Sampah
 */

export interface BankOperationalStatus {
  isOpen: boolean;
  statusText: string;
  reason?: string;
  hoursText: string;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const checkBankOperationalStatus = (
  openingHours?: string | null,
  now: Date = new Date()
): BankOperationalStatus => {
  const defaultHours = "Senin - Sabtu, 08:00 - 15:15";
  const hoursStr = (openingHours || defaultHours).trim();

  if (hoursStr.toLowerCase().includes("24 jam") || hoursStr.toLowerCase().includes("24jam")) {
    return {
      isOpen: true,
      statusText: "Buka (24 Jam)",
      hoursText: hoursStr,
    };
  }

  const dayIndex = now.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const lower = hoursStr.toLowerCase();
  let isDayOpen = true;

  if (lower.includes("senin - sabtu") || lower.includes("senin-sabtu") || lower.includes("senin sd sabtu")) {
    isDayOpen = dayIndex >= 1 && dayIndex <= 6;
  } else if (lower.includes("senin - jumat") || lower.includes("senin-jumat") || lower.includes("senin sd jumat")) {
    isDayOpen = dayIndex >= 1 && dayIndex <= 5;
  } else if (
    lower.includes("senin - minggu") ||
    lower.includes("senin-minggu") ||
    lower.includes("setiap hari") ||
    lower.includes("tiap hari")
  ) {
    isDayOpen = true;
  } else if (lower.includes("minggu tutup") && dayIndex === 0) {
    isDayOpen = false;
  }

  // Parse time: match "HH:MM - HH:MM" or "HH.MM - HH.MM"
  const timeRegex = /(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/;
  const timeMatch = hoursStr.match(timeRegex);

  let isTimeOpen = true;

  if (timeMatch) {
    const startH = parseInt(timeMatch[1], 10);
    const startM = parseInt(timeMatch[2], 10);
    const endH = parseInt(timeMatch[3], 10);
    const endM = parseInt(timeMatch[4], 10);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    isTimeOpen = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  const isOpen = isDayOpen && isTimeOpen;

  let reason = "";
  if (!isDayOpen) {
    reason = `Hari ini (${DAY_NAMES[dayIndex]}) Bank Sampah sedang libur/tutup.`;
  } else if (!isTimeOpen) {
    const displayTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]} - ${timeMatch[3]}:${timeMatch[4]} WIB` : "08:00 - 15:15 WIB";
    reason = `Saat ini di luar jam operasional. Jam buka: ${displayTime}.`;
  }

  return {
    isOpen,
    statusText: isOpen ? "Buka Sekarang" : "Sedang Tutup",
    reason: isOpen ? undefined : reason,
    hoursText: hoursStr,
  };
};
