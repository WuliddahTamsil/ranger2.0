export const formatNumberSafe = (n: any): string => {
  if (n === undefined || n === null) return "0";
  const num = Number(n);
  if (isNaN(num) || !isFinite(num)) return "0";
  try {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  } catch {
    return String(Math.round(num) || 0);
  }
};

const ID_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const formatDateSafe = (dateVal: any, includeTime = false): string => {
  if (!dateVal) return "Hari ini";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Hari ini";
    const day = d.getDate();
    const month = ID_MONTHS_SHORT[d.getMonth()] || "";
    const year = d.getFullYear();
    if (includeTime) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${year}, ${hh}:${mm} WIB`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return "Hari ini";
  }
};

export const rp = (n: any): string => {
  if (n === undefined || n === null || isNaN(Number(n))) return "Rp 0";
  return "Rp " + formatNumberSafe(n);
};

export const uImg = (id: string, w = 400, h = 300): string =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

/**
 * Normalizes image URLs, specifically converting Google Drive share links
 * and Google search redirect links into direct displayable image URLs.
 */
export const normalizeImageUrl = (rawUrl?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();
  if (!url) return "";

  if (url.startsWith("data:image") || url.startsWith("file://") || url.startsWith("blob:")) {
    return url;
  }

  // Handle Google Image search redirect URLs
  const imgUrlMatch = url.match(/[?&]imgurl=([^&]+)/i);
  if (imgUrlMatch && imgUrlMatch[1]) {
    try {
      url = decodeURIComponent(imgUrlMatch[1]);
    } catch {
      url = imgUrlMatch[1];
    }
  }

  // Handle Google Drive /file/d/<id>
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  // Handle Google Drive /open?id=<id> or uc?id=<id>
  const driveIdMatch = url.match(/(?:drive|docs)\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/i);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // Handle Google Drive /thumbnail?id=<id>
  const driveThumbMatch = url.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/i);
  if (driveThumbMatch && driveThumbMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveThumbMatch[1]}`;
  }

  return url;
};

