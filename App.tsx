import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { Screen } from "./src/types";

// Auth Screens
import { SplashScreen } from "./src/screens/auth/SplashScreen";
import { OnboardingScreen } from "./src/screens/auth/OnboardingScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { RoleScreen } from "./src/screens/auth/RoleScreen";
import { RegisterRoleScreen } from "./src/screens/auth/RegisterRoleScreen";
import { RegisterFlowScreen } from "./src/screens/auth/RegisterFlowScreen";
import { RegisterSuccessScreen } from "./src/screens/auth/RegisterSuccessScreen";
import { ForgotPasswordScreen } from "./src/screens/auth/ForgotPasswordScreen";
import { DaftarMitraStep1Screen } from "./src/screens/auth/DaftarMitraStep1Screen";
import { DaftarMitraStep2Screen } from "./src/screens/auth/DaftarMitraStep2Screen";
import { DaftarMitraStep3Screen } from "./src/screens/auth/DaftarMitraStep3Screen";

// Role Screens (7 Roles)
import { Beranda as CustomerDashboardScreen } from "./src/screens/customer/Beranda";
import { CustomerCateringScreen } from "./src/screens/customer/CustomerCateringScreen";
import { CustomerCateringDetailScreen } from "./src/screens/customer/CustomerCateringDetailScreen";
import { CustomerCateringTrackingScreen } from "./src/screens/customer/CustomerCateringTrackingScreen";
import { MarketplaceScreen } from "./src/screens/customer/MarketplaceScreen";
import { CustomerLaundryScreen } from "./src/screens/customer/CustomerLaundryScreen";
import { CustomerLaundryDetailScreen } from "./src/screens/customer/CustomerLaundryDetailScreen";
import { CustomerLaundryTrackingScreen } from "./src/screens/customer/CustomerLaundryTrackingScreen";
import { CustomerKosScreen } from "./src/screens/customer/CustomerKosScreen";
import { CustomerKosDetailScreen } from "./src/screens/customer/CustomerKosDetailScreen";
import { Beranda as DriverHomeScreen } from "./src/screens/driver/Beranda";
import { Beranda as PemilikCateringHomeScreen } from "./src/screens/pemilik_catering/Beranda";
import { Beranda as PemilikMarketplaceHomeScreen } from "./src/screens/pemilik_marketplace/Beranda";
import { PemilikLaundryHomeScreen } from "./src/screens/pemilik_laundry/PemilikLaundryHomeScreen";
import { LaundryOrderScreen } from "./src/screens/pemilik_laundry/LaundryOrderScreen";
import { LaundryUserScreen } from "./src/screens/pemilik_laundry/LaundryUserScreen";
import { LaundryRiwayatScreen } from "./src/screens/pemilik_laundry/LaundryRiwayatScreen";
import { LaundryPendapatanScreen } from "./src/screens/pemilik_laundry/LaundryPendapatanScreen";
import { LaundryProfilScreen } from "./src/screens/pemilik_laundry/LaundryProfilScreen";
import { PemilikKosHomeScreen } from "./src/screens/pemilik_kos/PemilikKosHomeScreen";
import { ManajemenKamarScreen } from "./src/screens/pemilik_kos/ManajemenKamarScreen";
import { ManajemenPenghuniScreen } from "./src/screens/pemilik_kos/ManajemenPenghuniScreen";
import { LaporanKeuanganScreen } from "./src/screens/pemilik_kos/LaporanKeuanganScreen";
import { PemilikKosProfilScreen } from "./src/screens/pemilik_kos/PemilikKosProfilScreen";
import { VerifikasiDpScreen } from "./src/screens/pemilik_kos/VerifikasiDpScreen";
import { KirimPengingatScreen } from "./src/screens/pemilik_kos/KirimPengingatScreen";
import { AdminHomeScreen } from "./src/screens/admin/AdminHomeScreen";
import {
  createAuthSession,
  restoreStoredAccount,
  loginWithGoogle,
  loginWithPassword,
  registerAccount,
  resetPassword,
} from "./src/screens/auth/authService";
import { roleToScreen } from "./src/screens/auth/authNavigation";
import { clearSession } from "./src/screens/auth/authStorage";
import { AuthAccount, AuthRegistrationRole, GoogleProfile, RegistrationForm } from "./src/screens/auth/authTypes";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [registrationRole, setRegistrationRole] = useState<AuthRegistrationRole>("customer");
  const [registrationResult, setRegistrationResult] = useState<AuthAccount | null>(null);
  const [currentAuthAccount, setCurrentAuthAccount] = useState<AuthAccount | null>(null);
  const [googleDraft, setGoogleDraft] = useState<GoogleProfile | null>(null);

  useEffect(() => {
    let active = true;
    void restoreStoredAccount().then(({ account }) => {
      if (!active || !account) return;
      setCurrentAuthAccount(account);
      setCurrentScreen(roleToScreen(account.role));
    });
    return () => {
      active = false;
    };
  }, []);

  const navigate = (screen: Screen) => {
    if (screen === "login" || screen === "onboarding") {
      setCurrentAuthAccount(null);
      setRegistrationResult(null);
      setGoogleDraft(null);
      void clearSession();
    }
    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, password: string) => {
    const result = await loginWithPassword(email, password);
    if (!result.account) return { ok: false, error: result.error };
    setCurrentAuthAccount(result.account);
    await createAuthSession(result.account);
    navigate(roleToScreen(result.account.role));
    return { ok: true };
  };

  const handleGoogleLogin = async (accessToken?: string) => {
    const result = await loginWithGoogle(accessToken);
    if (result.account) {
      setCurrentAuthAccount(result.account);
      await createAuthSession(result.account);
      navigate(roleToScreen(result.account.role));
      return;
    }
    setGoogleDraft(result.profile);
    navigate("auth_register_role");
  };

  const handleRegistration = async (form: RegistrationForm) => {
    const result = await registerAccount(registrationRole, form, googleDraft || undefined);
    if (!result.account) return { ok: false, error: result.error };
    setRegistrationResult(result.account);
    setCurrentAuthAccount(result.account);
    setGoogleDraft(null);
    navigate("auth_register_success");
    return { ok: true };
  };

  const handleResetPassword = async (email: string, password: string) => resetPassword(email, password);

  const handleUpdateAccount = async (account: AuthAccount) => {
    setCurrentAuthAccount(account);
    await createAuthSession(account);
  };

  const startSession = async (account: AuthAccount) => {
    setCurrentAuthAccount(account);
    await createAuthSession(account);
    navigate(roleToScreen(account.role));
  };

  const renderScreen = () => {
    switch (currentScreen) {
      // Auth
      case "splash":
        return <SplashScreen navigate={navigate} />;
      case "onboarding":
        return <OnboardingScreen navigate={navigate} />;
      case "login":
        return <LoginScreen navigate={navigate} onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />;
      case "role":
        return <RoleScreen navigate={navigate} />;
      case "auth_register_role":
        return <RegisterRoleScreen navigate={navigate} onSelect={(role) => { setRegistrationRole(role); navigate("auth_register"); }} />;
      case "auth_register":
        return (
          <RegisterFlowScreen
            navigate={navigate}
            role={registrationRole}
            initialEmail={googleDraft?.email}
            initialName={googleDraft?.name}
            googleRegistration={Boolean(googleDraft)}
            onSubmit={handleRegistration}
          />
        );
      case "auth_forgot_password":
        return <ForgotPasswordScreen navigate={navigate} onResetPassword={handleResetPassword} />;
      case "auth_register_success":
        return registrationResult ? (
          <RegisterSuccessScreen navigate={navigate} account={registrationResult} onContinue={() => void startSession(registrationResult)} />
        ) : (
          <LoginScreen navigate={navigate} onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />
        );
      case "daftar_mitra_step1":
        return <DaftarMitraStep1Screen navigate={navigate} />;
      case "daftar_mitra_step2":
        return <DaftarMitraStep2Screen navigate={navigate} />;
      case "daftar_mitra_step3":
        return <DaftarMitraStep3Screen navigate={navigate} />;

      // 1. Customer
      case "c_home":
        return <CustomerDashboardScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_marketplace":
        return <MarketplaceScreen navigate={navigate} />;
      case "c_catering":
        return <CustomerCateringScreen navigate={navigate} />;
      case "c_catering_detail":
        return <CustomerCateringDetailScreen navigate={navigate} />;
      case "c_catering_tracking":
        return <CustomerCateringTrackingScreen navigate={navigate} />;
      case "c_laundry":
        return <CustomerLaundryScreen navigate={navigate} />;
      case "c_laundry_detail":
        return <CustomerLaundryDetailScreen navigate={navigate} />;
      case "c_laundry_tracking":
        return <CustomerLaundryTrackingScreen navigate={navigate} />;
      case "c_kos":
        return <CustomerKosScreen navigate={navigate} />;
      case "c_kos_detail":
        return <CustomerKosDetailScreen navigate={navigate} />;

      // 2. Driver
      case "d_home":
        return <DriverHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 3. Pemilik Catering
      case "pemilik_catering_home":
        return <PemilikCateringHomeScreen navigate={navigate} authAccount={currentAuthAccount} onUpdateAccount={handleUpdateAccount} />;

      // 4. Pemilik Marketplace (UMKM)
      case "pemilik_marketplace_home":
        return <PemilikMarketplaceHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 5. Pemilik Laundry
      case "pemilik_laundry_home":
              return <PemilikLaundryHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_order":
        return <LaundryOrderScreen navigate={navigate} />;
      case "pemilik_laundry_user":
        return <LaundryUserScreen navigate={navigate} />;
      case "pemilik_laundry_riwayat":
        return <LaundryRiwayatScreen navigate={navigate} />;
      case "pemilik_laundry_pendapatan":
        return <LaundryPendapatanScreen navigate={navigate} />;
      case "pemilik_laundry_profil":
        return <LaundryProfilScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 6. Pemilik Kos
      case "pemilik_kos_home":
              return <PemilikKosHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_manajemen_kamar":
        return <ManajemenKamarScreen navigate={navigate} />;
      case "pemilik_kos_manajemen_penghuni":
        return <ManajemenPenghuniScreen navigate={navigate} />;
      case "pemilik_kos_laporan_keuangan":
        return <LaporanKeuanganScreen navigate={navigate} />;
      case "pemilik_kos_profil":
        return <PemilikKosProfilScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_verifikasi_dp":
        return <VerifikasiDpScreen navigate={navigate} />;
      case "pemilik_kos_kirim_pengingat":
        return <KirimPengingatScreen navigate={navigate} />;

      // 7. Admin
      case "admin_home":
        return <AdminHomeScreen navigate={navigate} />;

      default:
        return <CustomerDashboardScreen navigate={navigate} authAccount={currentAuthAccount} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
