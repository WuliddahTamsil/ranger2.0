import { Role, Screen } from "../../types";
import { AuthAccount } from "./authTypes";

export const roleToScreen = (role: Role, status?: AuthAccount["status"]): Screen => {
  if (role === "admin") return "admin_home";
  if (role === "customer") return "c_home";

  // Gatekeeper: If mitra status is pending or rejected, keep them in waiting approval screen
  if (status && status !== "verified") {
    return "waiting_approval";
  }

  if (role === "driver") return "d_home";
  if (role === "pemilik_catering") return "pemilik_catering_home";
  if (role === "pemilik_marketplace") return "pemilik_marketplace_home";
  if (role === "pemilik_laundry") return "pemilik_laundry_home";
  if (role === "pemilik_kos") return "pemilik_kos_home";
  return "admin_home";
};

export const getInitialScreenForAccount = (account: AuthAccount): Screen => {
  return roleToScreen(account.role as Role, account.status);
};
