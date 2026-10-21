import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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

  useEffect(() => {
    let active = true;
    void restoreStoredAccount().then(({ account }) => {
      if (!active) return;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get("screen") as Screen | null;
        if (screenParam) {
          if (screenParam === "admin_home") {
            const adminAcc: any = {
              id: "6aa17978d4b39e0b125becd5",
              name: "Super Admin Ranger",
              email: "ranger@gmail.com",
              role: "admin",
              status: "verified",
              token: "6aa17978d4b39e0b125becd5",
            };
            setCurrentAuthAccount(adminAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: adminAcc, accountId: adminAcc.id }));
            void AsyncStorage.setItem("rangers.auth.accounts.v1", JSON.stringify([adminAcc]));
          } else if (screenParam === "d_home" || urlParams.get("role") === "driver") {
            const driverAcc: any = {
              id: "6a9c2f97c0998813eb04450c",
              name: "Wuwu Driver",
              email: "wuliddah@gmail.com",
              phone: "081234567894",
              role: "driver",
              status: "verified",
              token: "6a9c2f97c0998813eb04450c",
            };
            setCurrentAuthAccount(driverAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: driverAcc, accountId: driverAcc.id }));
          } else if (screenParam === "pemilik_catering_home" || urlParams.get("role") === "pemilik_catering") {
            const catAcc: any = {
              id: "6aa7fc9ba28bf4d6d90dae7f",
              name: "cateringsehat",
              email: "cateringsehat@gmail.com",
              phone: "+6286352354288",
              role: "pemilik_catering",
              status: "verified",
              token: "6aa7fc9ba28bf4d6d90dae7f",
              roleData: {
                businessName: "Catering sehat",
                businessAddress: "Bogor",
                businessType: "Nasi Box",
                isDapurOpen: "true",
                cateringBankAccountHolder: "Wuliddah Tamsil Barokah",
                cateringBankAccountNumber: "198378687244",
                cateringBankName: "BCA",
                cateringQrisImageUrl: "https://res.cloudinary.com/b9soz7ka/image/upload/v1789639345/ranger_uploads/ranger_1789639326093_ChatGPT_Image_Sep_17__2026__05_01_45_PM.png",
                cateringBankTransferEnabled: "true",
                cateringQrisEnabled: "true"
              }
            };
            setCurrentAuthAccount(catAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: catAcc, accountId: catAcc.id }));
          } else if (screenParam === "pemilik_marketplace_home" || urlParams.get("role") === "pemilik_marketplace") {
            const mktAcc: any = {
              id: "6ac8bab40244f6bb3bc61bec",
              name: "Titing Sriyanti",
              email: "titing06@gmail.com",
              phone: "081234567891",
              role: "pemilik_marketplace",
              status: "verified",
              token: "6ac8bab40244f6bb3bc61bec",
            };
            setCurrentAuthAccount(mktAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: mktAcc, accountId: mktAcc.id }));
          } else if (screenParam?.startsWith("bank_sampah") || urlParams.get("role") === "bank_sampah") {
            const bankAcc: any = {
              id: "6aadbb8c5513afda4c34d999",
              name: "Bank Sampah Induk Kamojang Asri",
              email: "banksampah@geoverse.com",
              phone: "081234567896",
              role: "bank_sampah",
              status: "verified",
              token: "6aadbb8c5513afda4c34d999",
            };
          } else if (screenParam?.startsWith("pemilik_laundry") || urlParams.get("role") === "pemilik_laundry") {
            const laundryAcc: any = {
              id: "laundry_seed_001",
              name: "Ais Laundry",
              email: "aisl@gmail.com",
              phone: "081234567891",
              role: "pemilik_laundry",
              status: "verified",
              token: "laundry_seed_001",
              roleData: {
                businessName: "Ais Laundry",
                businessAddress: "BGR",
                serviceType: "express",
                operatingHours: "24 jam",
              },
            };
            setCurrentAuthAccount(laundryAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: laundryAcc, accountId: laundryAcc.id }));
          } else if (screenParam?.startsWith("pemilik_kos") || urlParams.get("role") === "pemilik_kos") {
            const isAdam = urlParams.get("account") === "adam" || urlParams.get("email")?.includes("adam");
            const kosAcc: any = isAdam
              ? {
                  id: "6ac6718770933058bf751c11",
                  name: "Adam (ADAM HO)",
                  email: "adamshalishazahra@gmail.com",
                  phone: "+6287805987309",
                  role: "pemilik_kos",
                  status: "verified",
                  token: "6ac6718770933058bf751c11",
                  roleData: {
                    businessName: "ADAM HO",
                    businessAddress: "GARUT",
                    propertyType: "Wisata",
                    businessCategory: "wisata",
                  },
                }
              : {
                  id: "kos_seed_001",
                  name: "Aisyah Pemilik Kos & Homestay",
                  email: "aisk@gmail.com",
                  phone: "087805987309",
                  role: "pemilik_kos",
                  status: "verified",
                  token: "kos_seed_001",
                  roleData: {
                    businessName: "Ais Kos Exclusive & Homestay",
                    businessAddress: "Tarogong Kaler, Garut",
                    kostType: "Campur",
                    roomCount: "10",
                  },
                };
            setCurrentAuthAccount(kosAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: kosAcc, accountId: kosAcc.id }));
          } else if (screenParam?.startsWith("c_") || urlParams.get("role") === "customer") {
            const custAcc: any = {
              id: "6a85892d8d27c7d42a0d8ba8",
              name: "Wuwu Customer",
              email: "wuliddahtamsilbarokah19@gmail.com",
              phone: "081234567895",
              role: "customer",
              status: "verified",
              token: "6a85892d8d27c7d42a0d8ba8",
              address: "Jl. Raya Kamojang No. 12, Samarang, Garut",
              roleData: {
                customerAddresses: JSON.stringify([{
                  id: "addr_kamojang_1",
                  label: "Rumah",
                  receiverName: "Wuwu Customer",
                  phoneNumber: "081234567895",
                  street: "Jl. Raya Kamojang No. 12",
                  district: "Samarang",
                  city: "Garut",
                  province: "Jawa Barat",
                  fullAddress: "Jl. Raya Kamojang No. 12, Samarang, Garut",
                  isMain: true
                }])
              }
            };
            setCurrentAuthAccount(custAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: custAcc, accountId: custAcc.id }));
          } else if (screenParam?.startsWith("admin") || urlParams.get("role") === "admin") {
            const adminAcc: any = {
              id: "6aa17978d4b39e0b125becd5",
              name: "Super Admin Ranger",
              email: "ranger@gmail.com",
              phone: "081511226089",
              role: "admin",
              status: "verified",
              token: "6aa17978d4b39e0b125becd5",
              address: "HQ GEOVERSE Platform, Garut",
              roleData: {},
            };
            setCurrentAuthAccount(adminAcc);
            void AsyncStorage.setItem("rangers.auth.session.v1", JSON.stringify({ currentAccount: adminAcc, accountId: adminAcc.id }));
          }
          setCurrentScreen(screenParam);
          return;
        }
      }
      if (!account) return;
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
    if (screen === "login" || screen === "onboarding") {
      setCurrentAuthAccount(null);
      setRegistrationResult(null);
      setGoogleDraft(null);
      setGoogleCredential(null);
      void clearSession();
    }
    if (params?.storeId) setSelectedShopStoreId(params.storeId);
    if (params?.orderId) setSelectedShopOrderId(params.orderId);
    if (params?.redemptionId) setSelectedPointRedemptionId(params.redemptionId);
    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, password: string) => {
    const result = await loginWithPassword(email, password);
    if (!result.account) return { ok: false, error: result.error };
    setCurrentAuthAccount(result.account);
    await createAuthSession(result.account);
    navigate(roleToScreen(result.account.role, result.account.status));
    return { ok: true };
  };

  const handleGoogleLogin = async (credential: GoogleCredential) => {
    const result = await loginWithGoogle(credential);
    if (result.account) {
      setCurrentAuthAccount(result.account);
      await createAuthSession(result.account);
      navigate(roleToScreen(result.account.role, result.account.status));
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

    // Check if any account or seed account exists for this role
    const anyAccount = accounts.find((account) => account.role === role && account.status !== "rejected");
    if (anyAccount) {
      const activeSeed = {
        ...anyAccount,
        token: anyAccount.token || `seed_token_${anyAccount.id}`,
      };
      await startSession(activeSeed);
      return;
    }

    if (role === "admin") {
      navigate("login");
      return;
    }

    // Direct to registration flow for new role registration
    setRegistrationRole(role as AuthRegistrationRole);
    navigate("auth_register");
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
        return <RoleScreen navigate={navigate} onSelectRole={handleRoleSelection} />;
      case "auth_register_role":
        return <RegisterRoleScreen navigate={navigate} googleDraft={googleDraft} onGoogleConnect={handleGoogleLogin} onSelect={(role) => { setRegistrationRole(role); navigate("auth_register"); }} />;
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
        return <CustomerDashboardScreen navigate={navigate} authAccount={currentAuthAccount} onUpdateAccount={handleUpdateAccount} />;
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
        return <WasteDepositFormScreen navigate={navigate} />;
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
        return <ShopCartScreen navigate={navigate} />;
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
    <SafeAreaProvider>
      <GeoverseGlobalDialog />
      <GeoversePointProvider>
        <RecycleProvider>
          <SendProvider>
            <ShopCartProvider>
              <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? (currentScreen === "login" || currentScreen === "auth_register" ? undefined : "padding") : "height"}
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
