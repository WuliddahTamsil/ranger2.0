import { Role, Screen } from "../../types";

export const roleToScreen = (role: Role): Screen => {
  if (role === "customer") return "c_home";
  if (role === "driver") return "d_home";
  if (role === "pemilik_catering") return "pemilik_catering_home";
  if (role === "pemilik_marketplace") return "pemilik_marketplace_home";
  if (role === "pemilik_laundry") return "pemilik_laundry_home";
  if (role === "pemilik_kos") return "pemilik_kos_home";
  return "admin_home";
};
