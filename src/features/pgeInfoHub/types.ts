export type PgeInfoHubCategory =
  | "Acara"
  | "Company Profile"
  | "CSR"
  | "Kegiatan Komunitas"
  | "Pengumuman"
  | "Safety Alert";

export type PgeInfoHubStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

export interface PgeInfoHubItem {
  _id?: string;
  id: string;
  itemId?: string;
  title: string;
  category: PgeInfoHubCategory;
  description: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  authorOrDept?: string;
  location?: string;
  eventDate?: string;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  publishedAt: string;
  isPublished: boolean;
  status?: PgeInfoHubStatus;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PgeInfoHubFilter {
  category?: PgeInfoHubCategory | "Semua";
  searchQuery?: string;
}
