import { registerRootComponent } from 'expo';
import { Text, TextInput } from 'react-native';

// ============================================================================
// GLOBAL CRASH-GUARD SHIMS (Hermes Android & React Native Safe)
// Prevents native RangeError / ICU exceptions from crashing the app or clearing session
// ============================================================================
try {
  const originalNumberToLocale = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (locales?: any, options?: any) {
    try {
      return originalNumberToLocale.call(this, locales, options);
    } catch {
      const val = Number(this);
      if (!Number.isFinite(val)) return "0";
      const parts = Math.floor(Math.abs(val)).toString().split("");
      let formatted = "";
      while (parts.length > 3) {
        formatted = "." + parts.splice(-3).join("") + formatted;
      }
      formatted = parts.join("") + formatted;
      return (val < 0 ? "-" : "") + formatted;
    }
  };

  const originalDateToLocaleDate = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (locales?: any, options?: any) {
    try {
      return originalDateToLocaleDate.call(this, locales, options);
    } catch {
      const d = this as Date;
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  const originalDateToLocale = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function (locales?: any, options?: any) {
    try {
      return originalDateToLocale.call(this, locales, options);
    } catch {
      const d = this as Date;
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${mins}`;
    }
  };
} catch {
  // Silent failover
}

// ============================================================================
// GLOBAL FONT SCALING & RESPONSIVENESS GUARD
// Caps maxFontSizeMultiplier to 1.15 globally across Text & TextInput
// Prevents extreme system font scales (e.g. Android Large/Largest) from causing
// text overlap, clipping, badge overflowing, and layout breakage while preserving
// accessibility and graceful scaling on all devices and screen sizes.
// ============================================================================
try {
  const MAX_FONT_SCALE = 1.15;
  if ((Text as any).defaultProps == null) {
    (Text as any).defaultProps = {};
  }
  (Text as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

  if ((TextInput as any).defaultProps == null) {
    (TextInput as any).defaultProps = {};
  }
  (TextInput as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
} catch {
  // Silent fallback
}

import App from './App';

registerRootComponent(App);
