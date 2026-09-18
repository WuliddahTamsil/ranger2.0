import React, { createContext, useContext, useState, useMemo } from "react";
import {
  SendFareBreakdown,
  SendOrderUI,
  SendPackageData,
  SendPartyData,
} from "../types";

interface SendContextType {
  sender: SendPartyData;
  setSender: React.Dispatch<React.SetStateAction<SendPartyData>>;
  recipient: SendPartyData;
  setRecipient: React.Dispatch<React.SetStateAction<SendPartyData>>;
  packageData: SendPackageData;
  setPackageData: React.Dispatch<React.SetStateAction<SendPackageData>>;
  fareEstimate: SendFareBreakdown | null;
  setFareEstimate: (fare: SendFareBreakdown | null) => void;
  activeOrder: SendOrderUI | null;
  setActiveOrder: (order: SendOrderUI | null) => void;
  resetSendFlow: () => void;
  pickerTarget: "sender" | "recipient" | null;
  setPickerTarget: (target: "sender" | "recipient" | null) => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  isRouteReady: boolean;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
}

const defaultSender: SendPartyData = {
  name: "",
  phone: "",
  address: "",
  latitude: null,
  longitude: null,
  notes: "",
  locationInstruction: "",
};

const defaultRecipient: SendPartyData = {
  name: "",
  phone: "",
  address: "",
  latitude: null,
  longitude: null,
  notes: "",
  preferredDeliveryTime: "",
};

const defaultPackage: SendPackageData = {
  name: "",
  category: "Paket kecil",
  quantity: 1,
  weightKg: 1,
  lengthCm: 15,
  widthCm: 15,
  heightCm: 10,
  fragile: false,
  specialHandling: false,
  declaredValue: 0,
  photoUrls: [],
  notes: "",
};

const SendContext = createContext<SendContextType | undefined>(undefined);

export const SendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sender, setSender] = useState<SendPartyData>(defaultSender);
  const [recipient, setRecipient] = useState<SendPartyData>(defaultRecipient);
  const [packageData, setPackageData] = useState<SendPackageData>(defaultPackage);
  const [fareEstimate, setFareEstimate] = useState<SendFareBreakdown | null>(null);
  const [activeOrder, setActiveOrder] = useState<SendOrderUI | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"sender" | "recipient" | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("QRIS");

  const resetSendFlow = () => {
    setSender(defaultSender);
    setRecipient(defaultRecipient);
    setPackageData(defaultPackage);
    setFareEstimate(null);
    setActiveOrder(null);
    setPickerTarget(null);
    setActiveStep(1);
    setPaymentMethod("QRIS");
  };

  const isRouteReady = useMemo(() => {
    return (
      sender.latitude != null &&
      sender.longitude != null &&
      recipient.latitude != null &&
      recipient.longitude != null
    );
  }, [sender.latitude, sender.longitude, recipient.latitude, recipient.longitude]);

  return (
    <SendContext.Provider
      value={{
        sender,
        setSender,
        recipient,
        setRecipient,
        packageData,
        setPackageData,
        fareEstimate,
        setFareEstimate,
        activeOrder,
        setActiveOrder,
        resetSendFlow,
        pickerTarget,
        setPickerTarget,
        activeStep,
        setActiveStep,
        isRouteReady,
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </SendContext.Provider>
  );
};

export const useSendContext = (): SendContextType => {
  const context = useContext(SendContext);
  if (!context) {
    throw new Error("useSendContext must be used within a SendProvider");
  }
  return context;
};
