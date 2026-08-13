export const rp = (n: any): string => {
  if (n === undefined || n === null || isNaN(Number(n))) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
};

export const uImg = (id: string, w = 400, h = 300): string =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
