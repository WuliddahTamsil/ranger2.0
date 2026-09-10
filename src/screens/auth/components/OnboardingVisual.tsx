import React from "react";
import { Svg, Path, Rect, Circle, Line, Text as SvgText, G } from "react-native-svg";

export type OnboardingVisualKind = "local" | "ecosystem" | "mobility";

interface Props { kind: OnboardingVisualKind; }

export const OnboardingVisual: React.FC<Props> = ({ kind }) => {
  if (kind === "ecosystem") return <EcosystemVisual />;
  if (kind === "mobility") return <MobilityVisual />;
  return <LocalCommerceVisual />;
};

const baseProps = { width: "100%", height: "100%", viewBox: "0 0 320 220" } as const;

const LocalCommerceVisual: React.FC = () => (
  <Svg {...baseProps}>
    <Path d="M36 180h248" stroke="#DCE6E1" strokeWidth="1" />
    <Path d="M52 64c22-22 42-29 66-29 33 0 46 19 77 19 19 0 37-8 73-4" fill="none" stroke="#CFE2D8" strokeWidth="2" strokeDasharray="5 7" />
    <G transform="translate(58 67)">
      <Path d="M5 45h144" stroke="#142238" strokeWidth="3" strokeLinecap="round" />
      <Path d="M18 43V82h113V43" fill="#FFFFFF" stroke="#142238" strokeWidth="2" />
      <Path d="M11 43h127l-8-22H19L11 43Z" fill="#E8F2ED" stroke="#142238" strokeWidth="2" />
      <Line x1="25" y1="22" x2="29" y2="43" stroke="#087A4B" strokeWidth="2" />
      <Line x1="47" y1="22" x2="49" y2="43" stroke="#087A4B" strokeWidth="2" />
      <Line x1="69" y1="22" x2="69" y2="43" stroke="#087A4B" strokeWidth="2" />
      <Line x1="91" y1="22" x2="89" y2="43" stroke="#087A4B" strokeWidth="2" />
      <Line x1="113" y1="22" x2="109" y2="43" stroke="#087A4B" strokeWidth="2" />
      <Rect x="28" y="55" width="29" height="27" rx="3" fill="#F7F9F8" stroke="#B9CEC2" />
      <Rect x="69" y="56" width="39" height="26" rx="3" fill="#F7F9F8" stroke="#B9CEC2" />
      <Path d="M32 75h21M73 75h31" stroke="#087A4B" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="139" cy="59" r="14" fill="#FFFFFF" stroke="#087A4B" strokeWidth="2" />
      <Path d="M132 59h14M139 52v14" stroke="#087A4B" strokeWidth="2" strokeLinecap="round" />
    </G>
    <SvgText x="160" y="201" fill="#667085" fontSize="10" fontWeight="600" letterSpacing="1.5" textAnchor="middle">LOCAL COMMERCE</SvgText>
  </Svg>
);

const EcosystemVisual: React.FC = () => (
  <Svg {...baseProps}>
    <Path d="M53 110C91 56 122 57 160 109s68 54 107 1" fill="none" stroke="#CFE2D8" strokeWidth="2" strokeDasharray="4 7" />
    <Circle cx="53" cy="110" r="4" fill="#087A4B" />
    <Circle cx="160" cy="109" r="4" fill="#087A4B" />
    <Circle cx="267" cy="110" r="4" fill="#087A4B" />
    <G transform="translate(24 46)">
      <Rect width="74" height="58" rx="10" fill="#FFFFFF" stroke="#DCE6E1" />
      <Rect x="13" y="13" width="22" height="16" rx="3" fill="#E8F2ED" stroke="#087A4B" />
      <Path d="M16 35h36M16 42h25" stroke="#9BB3A7" strokeWidth="2" strokeLinecap="round" />
      <SvgText x="13" y="54" fill="#142238" fontSize="8" fontWeight="700">MARKETPLACE</SvgText>
    </G>
    <G transform="translate(123 119)">
      <Rect width="74" height="58" rx="10" fill="#FFFFFF" stroke="#DCE6E1" />
      <Circle cx="24" cy="22" r="10" fill="#F7F9F8" stroke="#087A4B" />
      <Path d="M19 22h10M24 17v10" stroke="#087A4B" strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 39h40M16 46h29" stroke="#9BB3A7" strokeWidth="2" strokeLinecap="round" />
      <SvgText x="13" y="54" fill="#142238" fontSize="8" fontWeight="700">CATERING</SvgText>
    </G>
    <G transform="translate(222 46)">
      <Rect width="74" height="58" rx="10" fill="#FFFFFF" stroke="#DCE6E1" />
      <Circle cx="24" cy="22" r="10" fill="#E8F2ED" stroke="#087A4B" />
      <Path d="M19 20c3 7 8 7 10 0M18 27h12" fill="none" stroke="#087A4B" strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 39h40M16 46h29" stroke="#9BB3A7" strokeWidth="2" strokeLinecap="round" />
      <SvgText x="13" y="54" fill="#142238" fontSize="8" fontWeight="700">LAUNDRY</SvgText>
    </G>
    <G transform="translate(123 18)">
      <Rect width="74" height="42" rx="10" fill="#142238" />
      <Path d="M20 36V25l17-12 17 12v11" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <Path d="M32 36V26h10v10" fill="none" stroke="#A8D1BC" strokeWidth="2" />
      <SvgText x="51" y="51" fill="#667085" fontSize="8" fontWeight="700" textAnchor="middle">KOS</SvgText>
    </G>
  </Svg>
);

const MobilityVisual: React.FC = () => (
  <Svg {...baseProps}>
    <Path d="M32 166c29-17 24-45 53-62 29-17 48 16 75-8 30-27 41-54 128-65" fill="none" stroke="#DCE6E1" strokeWidth="28" strokeLinecap="round" opacity="0.6" />
    <Path d="M32 166c29-17 24-45 53-62 29-17 48 16 75-8 30-27 41-54 128-65" fill="none" stroke="#087A4B" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
    <Path d="M40 152c24-11 31-25 44-40M223 49c20-9 39-12 59-14" fill="none" stroke="#142238" strokeWidth="2" strokeLinecap="round" />
    <G transform="translate(24 141)">
      <Circle cx="8" cy="8" r="7" fill="#FFFFFF" stroke="#087A4B" strokeWidth="2" />
      <Circle cx="8" cy="8" r="2.5" fill="#087A4B" />
    </G>
    <G transform="translate(152 86)">
      <Path d="M12 0C5.4 0 0 5.2 0 11.6c0 8.5 12 19.4 12 19.4s12-10.9 12-19.4C24 5.2 18.6 0 12 0Z" fill="#FFFFFF" stroke="#087A4B" strokeWidth="2" />
      <Circle cx="12" cy="11" r="4" fill="#E8F2ED" stroke="#087A4B" strokeWidth="2" />
    </G>
    <G transform="translate(268 24)">
      <Circle cx="8" cy="8" r="7" fill="#142238" />
      <Path d="M5 8h6M8 5v6" stroke="#A8D1BC" strokeWidth="1.5" strokeLinecap="round" />
    </G>
    <SvgText x="160" y="202" fill="#667085" fontSize="10" fontWeight="600" letterSpacing="1.5" textAnchor="middle">COMMUNITY MOBILITY</SvgText>
  </Svg>
);
