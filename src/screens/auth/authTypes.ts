import { CustomerAddress, Role } from "../../types";

export type AuthRegistrationRole =
  | "customer"
  | "driver"
  | "pemilik_marketplace"
  | "pemilik_catering"
  | "pemilik_laundry"
  | "pemilik_kos";

export type AuthAccountStatus = "pending" | "verified" | "rejected";
export type AuthDocumentStatus = "pending" | "verified" | "rejected";

export interface AuthDocument {
  key: string;
  label: string;
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
  status: AuthDocumentStatus;
  progress: number;
}

export interface AuthDocumentRequirement {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export interface RegistrationForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  address: string;
  profilePhoto?: AuthDocument;
  roleData: Record<string, string>;
  documents: Record<string, AuthDocument>;
}

export interface AuthAccount {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  address: string;
  profilePhoto?: string;
  passwordHash?: string;
  googleLinked?: boolean;
  status: AuthAccountStatus;
  rejectionReason?: string;
  roleData: Record<string, string>;
  documents: Record<string, AuthDocument>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accountId: string;
  role: Role;
  name: string;
  email: string;
  address?: CustomerAddress;
  startedAt: string;
}

export interface GoogleProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

export const ROLE_LABELS: Record<AuthRegistrationRole, string> = {
  customer: "Customer",
  driver: "Driver Rangers",
  pemilik_marketplace: "Pemilik Marketplace",
  pemilik_catering: "Pemilik Catering",
  pemilik_laundry: "Pemilik Laundry",
  pemilik_kos: "Pemilik Kos",
};
