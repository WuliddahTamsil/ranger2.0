export const rp = (n: any): string => {
  if (n === undefined || n === null || isNaN(Number(n))) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
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

