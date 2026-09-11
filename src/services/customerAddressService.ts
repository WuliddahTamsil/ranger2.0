import { CustomerAddress, AddressAccessType, AddressLabel } from "../types";
import { AuthAccount } from "../screens/auth/authTypes";
import { updateUserProfile } from "./api";
import { updateCachedAccount } from "../screens/auth/authService";

const ADDRESS_STORAGE_KEY = "customerAddresses";

const ADDRESS_LABELS: AddressLabel[] = ["Rumah", "Kos", "Kantor", "Lainnya"];
const ACCESS_TYPES: AddressAccessType[] = [
  "Gang sempit",
  "Bisa dilalui mobil",
  "Hanya bisa dilalui motor",
  "Jalan utama",
  "Perlu masuk gang",
  "Hanya kendaraan tertentu",
];

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const asNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const safeLabel = (value: unknown): AddressLabel => {
  const label = asText(value) as AddressLabel;
  return ADDRESS_LABELS.includes(label) ? label : "Rumah";
};

const safeAccessType = (value: unknown): AddressAccessType => {
  const accessType = asText(value) as AddressAccessType;
  return ACCESS_TYPES.includes(accessType) ? accessType : "Bisa dilalui mobil";
};

export const buildFullAddress = (address: Partial<CustomerAddress>) => {
  const lines = [
    [address.street, address.houseNumber].filter(Boolean).join(" "),
    [address.rt && `RT ${address.rt}`, address.rw && `RW ${address.rw}`].filter(Boolean).join(" / "),
    address.village,
    address.district,
    address.city,
    address.province,
    address.postalCode,
  ].filter(Boolean);

  return lines.join(", ").trim() || asText(address.fullAddress);
};

const normalizeAddress = (raw: Partial<CustomerAddress>, index: number): CustomerAddress => {
  const normalized: CustomerAddress = {
    id: asText(raw.id) || `addr_${Date.now()}_${index}`,
    label: safeLabel(raw.label),
    receiverName: asText(raw.receiverName),
    phoneNumber: asText(raw.phoneNumber),
    province: asText(raw.province),
    city: asText(raw.city),
    district: asText(raw.district),
    village: asText(raw.village),
    postalCode: asText(raw.postalCode),
    street: asText(raw.street),
    houseNumber: asText(raw.houseNumber),
    rt: asText(raw.rt),
    rw: asText(raw.rw),
    fullAddress: asText(raw.fullAddress),
    notes: asText(raw.notes),
    accessType: safeAccessType(raw.accessType),
    latitude: asNumber(raw.latitude),
    longitude: asNumber(raw.longitude),
    detectedAddress: asText(raw.detectedAddress),
    isMain: Boolean(raw.isMain),
    updatedAt: asText(raw.updatedAt) || new Date().toISOString(),
  };

  normalized.fullAddress = buildFullAddress(normalized);
  return normalized;
};

export const parseCustomerAddresses = (account?: AuthAccount | null): CustomerAddress[] => {
  if (!account) return [];

  const rawValue = account.roleData?.[ADDRESS_STORAGE_KEY];
  let parsed: unknown = [];
  if (rawValue) {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = [];
    }
  }

  const addresses = Array.isArray(parsed)
    ? parsed.filter((item): item is Partial<CustomerAddress> => Boolean(item && typeof item === "object"))
        .map(normalizeAddress)
    : [];

  if (addresses.length > 0) {
    const primaryIndex = addresses.findIndex((address) => address.isMain);
    return addresses.map((address, index) => ({ ...address, isMain: index === (primaryIndex >= 0 ? primaryIndex : 0) }));
  }

  // Keep the existing single address usable for accounts created before this feature.
  if (asText(account.address)) {
    return [normalizeAddress({
      id: `legacy_${account.id}`,
      label: "Rumah",
      receiverName: account.name,
      phoneNumber: account.phone,
      fullAddress: account.address,
      notes: "",
      isMain: true,
    }, 0)];
  }

  return [];
};

export const getPrimaryCustomerAddress = (account?: AuthAccount | null) =>
  parseCustomerAddresses(account).find((address) => address.isMain) || parseCustomerAddresses(account)[0];

export const serializeCustomerAddresses = (addresses: CustomerAddress[]) =>
  JSON.stringify(addresses.map((address) => normalizeAddress(address, 0)));

export const saveCustomerAddresses = async (account: AuthAccount, addresses: CustomerAddress[]) => {
  const normalized = addresses.slice(0, 3).map(normalizeAddress);
  const primaryIndex = normalized.findIndex((address) => address.isMain);
  const safeAddresses = normalized.map((address, index) => ({
    ...address,
    isMain: index === (primaryIndex >= 0 ? primaryIndex : 0),
  }));
  const primary = safeAddresses.find((address) => address.isMain);
  const roleData = {
    ...account.roleData,
    [ADDRESS_STORAGE_KEY]: JSON.stringify(safeAddresses),
  };
  const updatedAccount: AuthAccount = {
    ...account,
    address: primary?.fullAddress || "",
    roleData,
    updatedAt: new Date().toISOString(),
  };

  const backendResult = await updateUserProfile(account.id, {
    address: updatedAccount.address,
    roleData: { [ADDRESS_STORAGE_KEY]: roleData[ADDRESS_STORAGE_KEY] },
  });
  await updateCachedAccount(updatedAccount);

  return {
    account: updatedAccount,
    savedToServer: Boolean(backendResult?.success),
  };
};

export const saveCustomerProfile = async (account: AuthAccount, name: string, phone: string) => {
  const updatedAccount: AuthAccount = {
    ...account,
    name: name.trim(),
    phone: phone.trim(),
    updatedAt: new Date().toISOString(),
  };
  const backendResult = await updateUserProfile(account.id, {
    name: updatedAccount.name,
    phone: updatedAccount.phone,
  });
  await updateCachedAccount(updatedAccount);
  return { account: updatedAccount, savedToServer: Boolean(backendResult?.success) };
};

export const isValidCoordinatePair = (latitude?: number, longitude?: number) =>
  latitude !== undefined && longitude !== undefined && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
