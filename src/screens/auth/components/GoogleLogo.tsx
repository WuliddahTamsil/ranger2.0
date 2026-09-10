import React from "react";
import { Svg, Path } from "react-native-svg";

export const GoogleLogo: React.FC<{ size?: number }> = ({ size = 21 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Google">
    <Path fill="#4285F4" d="M21.35 12.1c0-.74-.07-1.45-.22-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.27z" />
    <Path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.5z" />
    <Path fill="#FBBC05" d="M6.51 13.58A5.85 5.85 0 0 1 6.2 12c0-.55.1-1.09.31-1.58V7.89H3.27A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.06 1.02 4.11l3.24-2.53z" />
    <Path fill="#EA4335" d="M12 6.38c1.43 0 2.72.49 3.73 1.46l2.79-2.79C16.84 3.49 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.73 5.39l3.24 2.53C7.29 8.1 9.45 6.38 12 6.38z" />
  </Svg>
);
