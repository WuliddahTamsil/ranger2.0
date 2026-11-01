import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View, LogBox } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { Screen } from "./src/types";

// Suppress known benign React Native Web deprecation warnings in terminal & console
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
  'Cannot record touch end without a touch start',
  'Download the React DevTools',
]);

if (typeof console !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes('"shadow*" style props are deprecated') ||
      firstArg.includes('props.pointerEvents is deprecated') ||
      firstArg.includes('Cannot record touch end without a touch start') ||
      firstArg.includes('Download the React DevTools')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

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
import { WaitingApprovalScreen } from "./src/screens/auth/WaitingApprovalScreen";

// Role Screens (7 Roles)
import { Beranda as CustomerDashboardScreen } from "./src/screens/customer/Beranda";
import { CustomerCateringScreen } from "./src/screens/customer/CustomerCateringScreen";
import { CustomerCateringDetailScreen } from "./src/screens/customer/CustomerCateringDetailScreen";
import { CustomerCateringTrackingScreen } from "./src/screens/customer/CustomerCateringTrackingScreen";
import { CustomerCateringQrisPaymentScreen } from "./src/screens/customer/CustomerCateringQrisPaymentScreen";
import { MarketplaceScreen } from "./src/screens/customer/MarketplaceScreen";
import { CustomerLaundryScreen } from "./src/screens/customer/CustomerLaundryScreen";
import { CustomerLaundryDetailScreen } from "./src/screens/customer/CustomerLaundryDetailScreen";
import { CustomerLaundryTrackingScreen } from "./src/screens/customer/CustomerLaundryTrackingScreen";
import { CustomerKosScreen } from "./src/screens/customer/CustomerKosScreen";
import { CustomerKosDetailScreen } from "./src/screens/customer/CustomerKosDetailScreen";
import { CustomerAddressScreen } from "./src/screens/customer/CustomerAddressScreen";
import { CustomerRideScreen } from "./src/screens/customer/CustomerRideScreen";
import { CustomerRideTrackingScreen } from "./src/screens/customer/CustomerRideTrackingScreen";
import { SendProvider } from "./src/context/SendContext";
import { KanyahSendHomeScreen } from "./src/screens/customer/send/KanyahSendHomeScreen";
import { SendLocationPickerScreen } from "./src/screens/customer/send/SendLocationPickerScreen";
import { SendRecipientFormScreen } from "./src/screens/customer/send/SendRecipientFormScreen";
import { SendPackageDetailScreen } from "./src/screens/customer/send/SendPackageDetailScreen";
import { SendFareEstimateScreen } from "./src/screens/customer/send/SendFareEstimateScreen";
import { SendPaymentScreen } from "./src/screens/customer/send/SendPaymentScreen";
import { SendOrderConfirmationScreen } from "./src/screens/customer/send/SendOrderConfirmationScreen";
import { SendSearchingDriverScreen } from "./src/screens/customer/send/SendSearchingDriverScreen";
import { SendTrackingScreen } from "./src/screens/customer/send/SendTrackingScreen";
import { SendDeliveryDetailScreen } from "./src/screens/customer/send/SendDeliveryDetailScreen";
import { RecycleProvider } from "./src/context/RecycleContext";
import { KanyahRecycleHomeScreen } from "./src/screens/customer/recycle/KanyahRecycleHomeScreen";
import { BankSampahListScreen } from "./src/screens/customer/recycle/BankSampahListScreen";
import { BankSampahDetailScreen } from "./src/screens/customer/recycle/BankSampahDetailScreen";
import { WasteDepositFormScreen } from "./src/screens/customer/recycle/WasteDepositFormScreen";
import { WastePickupScheduleScreen } from "./src/screens/customer/recycle/WastePickupScheduleScreen";
import { WasteDepositTrackingScreen } from "./src/screens/customer/recycle/WasteDepositTrackingScreen";
import { WeighingResultScreen } from "./src/screens/customer/recycle/WeighingResultScreen";
import { PointWalletScreen } from "./src/screens/customer/recycle/PointWalletScreen";
import { PointLedgerScreen } from "./src/screens/customer/recycle/PointLedgerScreen";
import { PointRedemptionScreen } from "./src/screens/customer/recycle/PointRedemptionScreen";
import {
  GeoversePointProvider,
  GeoversePointHomeScreen,
  GeoversePointLedgerScreen,
  GeoversePointVoucherScreen,
  GeoversePointRedeemCashScreen,
  GeoversePointRedemptionDetailScreen,
  GeoversePointHowItWorksScreen,
} from "./src/features/geoversePoint";
import { ShopCartProvider } from "./src/context/ShopCartContext";
import { KanyahShopHomeScreen } from "./src/screens/customer/shop/KanyahShopHomeScreen";
import { StoreDiscoveryScreen } from "./src/screens/customer/shop/StoreDiscoveryScreen";
import { StoreDetailScreen } from "./src/screens/customer/shop/StoreDetailScreen";
import { ShopCartScreen } from "./src/screens/customer/shop/ShopCartScreen";
import { ShopCheckoutScreen } from "./src/screens/customer/shop/ShopCheckoutScreen";
import { ShopOrderDetailScreen } from "./src/screens/customer/shop/ShopOrderDetailScreen";
import { ShopMerchantOrderScreen } from "./src/screens/pemilik_shop/ShopMerchantOrderScreen";
import { WasteBankDashboardScreen } from "./src/screens/bank_sampah/WasteBankDashboardScreen";
import { WasteWeighingScreen } from "./src/screens/bank_sampah/WasteWeighingScreen";
import { Beranda as DriverHomeScreen } from "./src/screens/driver/Beranda";
import { Beranda as PemilikCateringHomeScreen } from "./src/screens/pemilik_catering/Beranda";
import { Beranda as PemilikMarketplaceHomeScreen } from "./src/screens/pemilik_marketplace/Beranda";
import { Beranda as PemilikShopHomeScreen } from "./src/screens/pemilik_shop/Beranda";
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
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { GeoverseGlobalDialog } from "./src/components/CustomDialog";
import {
  createAuthSession,
  restoreStoredAccount,
  loginWithGoogle,
  loginWithPassword,
  registerAccount,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "./src/screens/auth/authService";
import { roleToScreen } from "./src/screens/auth/authNavigation";
import { clearSession, loadAccounts } from "./src/screens/auth/authStorage";
import { AuthAccount, AuthRegistrationRole, GoogleCredential, GoogleProfile, RegistrationForm } from "./src/screens/auth/authTypes";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [registrationRole, setRegistrationRole] = useState<AuthRegistrationRole>("customer");
  const [registrationResult, setRegistrationResult] = useState<AuthAccount | null>(null);
  const [currentAuthAccount, setCurrentAuthAccount] = useState<AuthAccount | null>(null);
  const [googleDraft, setGoogleDraft] = useState<GoogleProfile | null>(null);
  const [googleCredential, setGoogleCredential] = useState<GoogleCredential | null>(null);
  const [selectedShopStoreId, setSelectedShopStoreId] = useState<string>("");
  const [selectedShopOrderId, setSelectedShopOrderId] = useState<string>("");
  const [selectedPointRedemptionId, setSelectedPointRedemptionId] = useState<string>("");
  const [postLoginTarget, setPostLoginTarget] = useState<{ screen: Screen; params?: Record<string, any> } | null>(null);
  const [loginPromptReason, setLoginPromptReason] = useState<string>("");
  const [lastPublicScreen, setLastPublicScreen] = useState<Screen>("c_home");
  const [customerInitialTab, setCustomerInitialTab] = useState<number | undefined>(undefined);
  const [registrationInitialTab, setRegistrationInitialTab] = useState<"customer" | "partner">("customer");

  useEffect(() => {
    let active = true;
    void restoreStoredAccount().then(async ({ account }) => {
      if (!active) return;
      if (Platform.OS === "web") {
        try {
          if (typeof window !== "undefined" && typeof (window as any)?.location?.search === "string") {
            const locSearch = (window as any).location.search;
            if (locSearch) {
              const urlParams = new URLSearchParams(locSearch);
              const tabParam = urlParams.get("tab");
              if (tabParam !== null) {
                setCustomerInitialTab(Number(tabParam));
              }
              const roleTabParam = urlParams.get("roleTab");
              if (roleTabParam === "customer" || roleTabParam === "partner") {
                setRegistrationInitialTab(roleTabParam);
              }
              const screenParam = urlParams.get("screen") as Screen | null;
              if (screenParam) {
                setCurrentScreen(screenParam);
                return;
              }
            }
          }
        } catch {
          // Safe fallback for mobile environments
        }
      }
      if (!account) {
        try {
          const completed = await AsyncStorage.getItem("@geoverse_onboarding_completed");
          if (active) {
            if (completed === "true") {
              setCurrentScreen("c_home");
            } else {
              setCurrentScreen("onboarding");
            }
          }
        } catch {
          if (active) setCurrentScreen("onboarding");
        }
        return;
      }
      setCurrentAuthAccount(account);
      setCurrentScreen(roleToScreen(account.role, account.status));
    });

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "rnw-focus-reset";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          *:focus, *:focus-visible, [role="button"]:focus, button:focus, a:focus {
            outline: none !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    return () => {
      active = false;
    };
  }, []);

  const navigate = (screen: Screen, params?: Record<string, any>) => {
    if (screen === "login") {
      if (params?.targetScreen) {
        setPostLoginTarget({ screen: params.targetScreen, params: params.targetParams });
      }
      if (params?.reason) {
        setLoginPromptReason(params.reason);
      }
      if (currentAuthAccount) {
        setCurrentAuthAccount(null);
        setRegistrationResult(null);
        setGoogleDraft(null);
        setGoogleCredential(null);
        void clearSession();
      }
    } else if (screen === "onboarding") {
      setCurrentAuthAccount(null);
      setRegistrationResult(null);
      setGoogleDraft(null);
      setGoogleCredential(null);
      void clearSession();
    } else {
      const publicScreens: Screen[] = [
        "c_home",
        "c_ride",
        "c_send",
        "c_send_package",
        "c_send_recipient",
        "c_send_fare",
        "c_marketplace",
        "c_catering",
        "c_catering_detail",
        "c_laundry",
        "c_laundry_detail",
        "c_kos",
        "c_kos_detail",
        "c_shop_home",
        "c_shop_discovery",
        "c_shop_store",
        "c_shop_cart",
        "c_recycle_home",
        "c_recycle_banks",
        "c_recycle_bank_detail",
        "c_recycle_deposit_form",
        "c_recycle_pickup_schedule",
        "c_point_home",
        "c_point_vouchers",
        "c_point_how_it_works",
        "c_point_ledger",
        "c_addresses",
      ];
      if (publicScreens.includes(screen)) {
        setLastPublicScreen(screen);
      }
    }

    if (params?.storeId) setSelectedShopStoreId(params.storeId);
    if (params?.orderId) setSelectedShopOrderId(params.orderId);
    if (params?.redemptionId) setSelectedPointRedemptionId(params.redemptionId);
    if (params?.tab !== undefined) {
      setCustomerInitialTab(Number(params.tab));
    }
    if (params?.roleTab) {
      setRegistrationInitialTab(params.roleTab);
    }
    setCurrentScreen(screen);
  };

  const handleCancelLogin = () => {
    const returnScreen = postLoginTarget?.screen || lastPublicScreen || "c_home";
    const returnParams = postLoginTarget?.params;
    setPostLoginTarget(null);
    setLoginPromptReason("");
    navigate(returnScreen, returnParams);
  };

  const completeAuthTransition = (account: AuthAccount) => {
    if (postLoginTarget) {
      const target = postLoginTarget;
      setPostLoginTarget(null);
      setLoginPromptReason("");
      navigate(target.screen, target.params);
      return;
    }
    setLoginPromptReason("");
    navigate(roleToScreen(account.role, account.status));
  };

  const handleLogin = async (email: string, password: string) => {
    const result = await loginWithPassword(email, password);
    if (!result.account) return { ok: false, error: result.error };
    setCurrentAuthAccount(result.account);
    await createAuthSession(result.account);
    completeAuthTransition(result.account);
    return { ok: true };
  };

  const handleGoogleLogin = async (credential: GoogleCredential) => {
    const result = await loginWithGoogle(credential);
    if (result.account) {
      setCurrentAuthAccount(result.account);
      await createAuthSession(result.account);
      completeAuthTransition(result.account);
      return;
    }
    setGoogleDraft(result.profile);
    setGoogleCredential(result.credential);
    navigate("auth_register_role");
  };

  const handleRegistration = async (form: RegistrationForm) => {
    const result = await registerAccount(registrationRole, form, googleDraft || undefined, googleCredential || undefined);
    if (!result.account) return { ok: false, error: result.error };
    setRegistrationResult(result.account);
    setCurrentAuthAccount(result.account);
    setGoogleDraft(null);
    setGoogleCredential(null);
    if (postLoginTarget) {
      completeAuthTransition(result.account);
      return { ok: true };
    }
    navigate("auth_register_success");
    return { ok: true };
  };

  const handleResetPassword = async (email: string, password: string, resetToken?: string) =>
    resetPassword(email, password, resetToken);

  const handleUpdateAccount = async (account: AuthAccount) => {
    setCurrentAuthAccount(account);
    await createAuthSession(account);
  };

  const startSession = async (account: AuthAccount) => {
    setCurrentAuthAccount(account);
    await createAuthSession(account);
    navigate(roleToScreen(account.role, account.status));
  };

  const handleRoleSelection = async (role: AuthAccount["role"]) => {
    if (currentAuthAccount?.role === role && currentAuthAccount.token) {
      navigate(roleToScreen(role, currentAuthAccount.status));
      return;
    }

    const accounts = await loadAccounts();
    const matchingAccounts = accounts.filter((account) =>
      account.role === role && Boolean(account.token) && account.status !== "rejected"
    );

    if (matchingAccounts.length >= 1) {
      await startSession(matchingAccounts[0]);
      return;
    }

    // Direct to registration flow for new role registration
    setRegistrationRole(role as AuthRegistrationRole);
    navigate("auth_register");
  };

  const renderScreen = () => {
    const hasValidToken = Boolean(currentAuthAccount?.token);

    // Route guards: ensure dashboard screens are only rendered when authenticated with correct role
    if (currentScreen === "admin_home" && (!hasValidToken || currentAuthAccount?.role !== "admin")) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Administrator memerlukan login dengan kredensial yang valid."
          onCancel={handleCancelLogin}
        />
      );
    }

    if (currentScreen === "d_home" && (!hasValidToken || currentAuthAccount?.role !== "driver")) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Driver memerlukan login akun driver yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    if ((currentScreen === "bank_sampah_dashboard" || currentScreen === "bank_sampah_weighing") && (!hasValidToken || (currentAuthAccount?.role !== "bank_sampah" && currentAuthAccount?.role !== "admin"))) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Mitra Bank Sampah memerlukan login akun yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    if (currentScreen === "pemilik_catering_home" && (!hasValidToken || (currentAuthAccount?.role !== "pemilik_catering" && currentAuthAccount?.role !== "admin"))) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Mitra Catering memerlukan login akun yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    if ((currentScreen === "pemilik_marketplace_home" || currentScreen === "pemilik_shop_home" || currentScreen === "shop_merchant_orders") && (!hasValidToken || (currentAuthAccount?.role !== "pemilik_marketplace" && currentAuthAccount?.role !== "pemilik_shop" && currentAuthAccount?.role !== "admin"))) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Mitra Toko/Marketplace memerlukan login akun yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    if (currentScreen.startsWith("pemilik_laundry") && (!hasValidToken || (currentAuthAccount?.role !== "pemilik_laundry" && currentAuthAccount?.role !== "admin"))) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Mitra Laundry memerlukan login akun yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    if (currentScreen.startsWith("pemilik_kos") && (!hasValidToken || (currentAuthAccount?.role !== "pemilik_kos" && currentAuthAccount?.role !== "admin"))) {
      return (
        <LoginScreen
          navigate={navigate}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loginReason="Akses Mitra Kos & Wisata memerlukan login akun yang terverifikasi."
          onCancel={handleCancelLogin}
        />
      );
    }

    switch (currentScreen) {
      // Auth
      case "splash":
        return <SplashScreen navigate={navigate} />;
      case "onboarding":
        return <OnboardingScreen navigate={navigate} />;
      case "login":
        return (
          <LoginScreen
            navigate={navigate}
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            loginReason={loginPromptReason}
            onCancel={handleCancelLogin}
          />
        );
      case "role":
        return <RoleScreen navigate={navigate} onSelectRole={handleRoleSelection} />;
      case "auth_register_role":
        return (
          <RegisterRoleScreen
            navigate={navigate}
            googleDraft={googleDraft}
            onGoogleConnect={handleGoogleLogin}
            initialTab={registrationInitialTab}
            onSelect={(role) => {
              setRegistrationRole(role);
              navigate("auth_register");
            }}
          />
        );
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
        return (
          <ForgotPasswordScreen
            navigate={navigate}
            onRequestOtp={requestPasswordResetOtp}
            onVerifyOtp={verifyPasswordResetOtp}
            onResetPassword={handleResetPassword}
          />
        );
      case "auth_register_success":
        return registrationResult ? (
          <RegisterSuccessScreen navigate={navigate} account={registrationResult} onContinue={() => void startSession(registrationResult)} />
        ) : (
          <LoginScreen
            navigate={navigate}
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            loginReason={loginPromptReason}
            onCancel={handleCancelLogin}
          />
        );
      case "daftar_mitra_step1":
        return <DaftarMitraStep1Screen navigate={navigate} />;
      case "daftar_mitra_step2":
        return <DaftarMitraStep2Screen navigate={navigate} />;
      case "daftar_mitra_step3":
        return <DaftarMitraStep3Screen navigate={navigate} />;
      case "waiting_approval":
        return (
          <WaitingApprovalScreen
            navigate={navigate}
            authAccount={currentAuthAccount}
            onRefreshAccount={handleUpdateAccount}
          />
        );

      // 1. Customer
      case "c_home":
        return (
          <CustomerDashboardScreen
            navigate={navigate}
            authAccount={currentAuthAccount}
            onUpdateAccount={handleUpdateAccount}
            initialTab={customerInitialTab}
          />
        );
      case "c_addresses":
        return <CustomerAddressScreen navigate={navigate} authAccount={currentAuthAccount} onUpdateAccount={handleUpdateAccount} />;
      case "c_marketplace":
        return <MarketplaceScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_catering":
        return <CustomerCateringScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_catering_detail":
        return <CustomerCateringDetailScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_catering_tracking":
        return <CustomerCateringTrackingScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_catering_qris":
      case "c_catering_payment":
        return <CustomerCateringQrisPaymentScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_laundry":
        return <CustomerLaundryScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_laundry_detail":
        return <CustomerLaundryDetailScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_laundry_tracking":
        return <CustomerLaundryTrackingScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_kos":
        return <CustomerKosScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_kos_detail":
        return <CustomerKosDetailScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_ride":
        return <CustomerRideScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_ride_tracking":
        return <CustomerRideTrackingScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send":
        return <KanyahSendHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send_location":
        return <SendLocationPickerScreen navigate={navigate} />;
      case "c_send_recipient":
        return <SendRecipientFormScreen navigate={navigate} />;
      case "c_send_package":
        return <SendPackageDetailScreen navigate={navigate} />;
      case "c_send_fare":
        return <SendFareEstimateScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send_payment":
        return <SendPaymentScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send_confirm":
        return <SendOrderConfirmationScreen navigate={navigate} />;
      case "c_send_searching":
        return <SendSearchingDriverScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send_tracking":
        return <SendTrackingScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_send_delivery_detail":
        return <SendDeliveryDetailScreen navigate={navigate} />;

      // Kanyaah Recycle Screens (Modern Responsive UI)
      case "c_recycle_home":
        return <KanyahRecycleHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_recycle_banks":
        return <BankSampahListScreen navigate={navigate} />;
      case "c_recycle_bank_detail":
        return <BankSampahDetailScreen navigate={navigate} />;
      case "c_recycle_deposit_form":
        return <WasteDepositFormScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_recycle_pickup_schedule":
        return <WastePickupScheduleScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_recycle_tracking":
        return <WasteDepositTrackingScreen navigate={navigate} />;
      case "c_recycle_weighing_result":
        return <WeighingResultScreen navigate={navigate} />;
      // GEOVERSE Point Screens
      case "c_point_home":
        return <GeoversePointHomeScreen navigate={navigate} />;
      case "c_point_ledger":
        return <GeoversePointLedgerScreen navigate={navigate} />;
      case "c_point_vouchers":
        return <GeoversePointVoucherScreen navigate={navigate} />;
      case "c_point_redeem_cash":
        return <GeoversePointRedeemCashScreen navigate={navigate} />;
      case "c_point_redemption_detail":
        return <GeoversePointRedemptionDetailScreen navigate={navigate} redemptionId={selectedPointRedemptionId} />;
      case "c_point_how_it_works":
        return <GeoversePointHowItWorksScreen navigate={navigate} />;

      // Legacy Recycle Point screen aliases
      case "c_recycle_wallet":
        return <GeoversePointHomeScreen navigate={navigate} />;
      case "c_recycle_ledger":
        return <GeoversePointLedgerScreen navigate={navigate} />;
      case "c_recycle_redemption":
        return <GeoversePointRedeemCashScreen navigate={navigate} />;

      // Kanyaah Shop Screens
      case "c_shop_home":
        return <KanyahShopHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_shop_discovery":
        return <StoreDiscoveryScreen navigate={navigate} />;
      case "c_shop_store":
        return <StoreDetailScreen navigate={navigate} storeId={selectedShopStoreId} />;
      case "c_shop_cart":
        return <ShopCartScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_shop_checkout":
        return <ShopCheckoutScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "c_shop_order_detail":
        return <ShopOrderDetailScreen navigate={navigate} orderId={selectedShopOrderId} />;
      case "shop_merchant_orders":
        return <ShopMerchantOrderScreen navigate={navigate} authAccount={currentAuthAccount} />;

      case "bank_sampah_dashboard":
        return <WasteBankDashboardScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "bank_sampah_weighing":
        return <WasteWeighingScreen navigate={navigate} />;

      // 2. Driver
      case "d_home":
        return <DriverHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 3. Pemilik Catering
      case "pemilik_catering_home":
        return <PemilikCateringHomeScreen navigate={navigate} authAccount={currentAuthAccount} onUpdateAccount={handleUpdateAccount} />;

      // 4. Pemilik Marketplace (UMKM)
      case "pemilik_marketplace_home":
        return <PemilikMarketplaceHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_shop_home":
        return <PemilikShopHomeScreen navigate={navigate} authAccount={currentAuthAccount} onUpdateAccount={handleUpdateAccount} />;

      // 5. Pemilik Laundry
      case "pemilik_laundry_home":
        return <PemilikLaundryHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_order":
        return <LaundryOrderScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_user":
        return <LaundryUserScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_riwayat":
        return <LaundryRiwayatScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_pendapatan":
        return <LaundryPendapatanScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_laundry_profil":
        return <LaundryProfilScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 6. Pemilik Kos
      case "pemilik_kos_home":
        return <PemilikKosHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_manajemen_kamar":
        return <ManajemenKamarScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_manajemen_penghuni":
        return <ManajemenPenghuniScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_laporan_keuangan":
        return <LaporanKeuanganScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_profil":
        return <PemilikKosProfilScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_verifikasi_dp":
        return <VerifikasiDpScreen navigate={navigate} authAccount={currentAuthAccount} />;
      case "pemilik_kos_kirim_pengingat":
        return <KirimPengingatScreen navigate={navigate} authAccount={currentAuthAccount} />;

      // 7. Admin
      case "admin_home":
        return <AdminHomeScreen navigate={navigate} authAccount={currentAuthAccount} />;

      default:
        return <CustomerDashboardScreen navigate={navigate} authAccount={currentAuthAccount} />;
    }
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GeoverseGlobalDialog />
      <GeoversePointProvider>
        <RecycleProvider>
          <SendProvider>
            <ShopCartProvider>
              <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? (currentScreen === "login" || currentScreen === "auth_register" ? undefined : "padding") : undefined}
                keyboardVerticalOffset={0}
              >
                <View style={styles.container}>
                  <StatusBar style="auto" />
                  <ErrorBoundary onReset={() => navigate("c_home")}>
                    {renderScreen()}
                  </ErrorBoundary>
                </View>
              </KeyboardAvoidingView>
            </ShopCartProvider>
          </SendProvider>
        </RecycleProvider>
      </GeoversePointProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
