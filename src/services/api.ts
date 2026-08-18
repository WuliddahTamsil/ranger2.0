import { Platform } from "react-native";

// In Android emulator use 10.0.2.2, for web/iOS simulator use localhost
export const API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:5000/api" : "http://localhost:5000/api";

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export const uploadFileToBackend = async (fileUri: string, fileName: string, mimeType: string) => {
  try {
    const formData = new FormData();

    if (Platform.OS === "web") {
      // In web, fetch blob from uri and append
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append("file", blob, fileName);
    } else {
      // In native React Native
      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    const response = await fetch(getApiUrl("/upload"), {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Upload file error:", error);
    throw error;
  }
};
