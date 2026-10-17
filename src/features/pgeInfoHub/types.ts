export type PgeInfoHubCategory =
  | "Acara"
  | "Company Profile"
  | "CSR"
  | "Kegiatan Komunitas";

export interface PgeInfoHubItem {
  id: string;
  title: string;
  category: PgeInfoHubCategory;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  authorOrDept?: string;
  location?: string;
  eventDate?: string;
  publishedAt: string;
  isPublished: boolean;
  tags?: string[];
}

export interface PgeInfoHubFilter {
  category?: PgeInfoHubCategory | "Semua";
  searchQuery?: string;
}
