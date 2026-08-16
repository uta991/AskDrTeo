import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'bulb'
  | 'calendar'
  | 'calculator'
  | 'crown'
  | 'user'
  | 'user-plus'
  | 'lock'
  | 'mail'
  | 'phone'
  | 'eye'
  | 'eye-off'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** მსუბუქი, ხაზოვანი იკონები — ცალკე იკონ-ბიბლიოთეკის დამატების გარეშე. */
export function Icon({
  name,
  size = 20,
  color = colors.textSecondary,
  strokeWidth = 1.8,
}: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...common} />
          <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" {...common} />
          <Path d="M9.5 21v-6h5v6" {...common} />
        </>
      )}
      {name === 'calculator' && (
        <>
          <Rect x="4" y="2.5" width="16" height="19" rx="2.5" {...common} />
          <Rect x="7.5" y="6" width="9" height="3.5" rx="1" {...common} />
          <Line x1="8" y1="13" x2="8" y2="13" {...common} strokeWidth={2.6} />
          <Line x1="12" y1="13" x2="12" y2="13" {...common} strokeWidth={2.6} />
          <Line x1="16" y1="13" x2="16" y2="13" {...common} strokeWidth={2.6} />
          <Line x1="8" y1="17" x2="8" y2="17" {...common} strokeWidth={2.6} />
          <Line x1="12" y1="17" x2="12" y2="17" {...common} strokeWidth={2.6} />
          <Line x1="16" y1="17" x2="16" y2="17" {...common} strokeWidth={2.6} />
        </>
      )}
      {name === 'bulb' && (
        <>
          <Path
            d="M9 18h6M10 21h4M12 2a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V15h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 2z"
            {...common}
          />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2.5" {...common} />
          <Line x1="3" y1="10" x2="21" y2="10" {...common} />
          <Line x1="8" y1="3" x2="8" y2="7" {...common} />
          <Line x1="16" y1="3" x2="16" y2="7" {...common} />
        </>
      )}
      {name === 'crown' && (
        <Path
          d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8z"
          {...common}
          strokeLinejoin="round"
        />
      )}
      {name === 'user' && (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...common} />
          <Circle cx="12" cy="7" r="4" {...common} />
        </>
      )}
      {name === 'user-plus' && (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...common} />
          <Circle cx="9" cy="7" r="4" {...common} />
          <Line x1="20" y1="8" x2="20" y2="14" {...common} />
          <Line x1="23" y1="11" x2="17" y2="11" {...common} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" {...common} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...common} />
        </>
      )}
      {name === 'mail' && (
        <>
          <Rect x="2" y="4" width="20" height="16" rx="2" {...common} />
          <Polyline points="22,6 12,13 2,6" {...common} />
        </>
      )}
      {name === 'phone' && (
        <Path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6
             A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81
             2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45
             12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          {...common}
        />
      )}
      {name === 'eye' && (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...common} />
          <Circle cx="12" cy="12" r="3" {...common} />
        </>
      )}
      {name === 'eye-off' && (
        <>
          <Path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94
               M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
               m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            {...common}
          />
          <Line x1="1" y1="1" x2="23" y2="23" {...common} />
        </>
      )}
      {name === 'check' && <Polyline points="20 6 9 17 4 12" {...common} strokeWidth={2.5} />}
      {name === 'chevron-left' && <Polyline points="15 18 9 12 15 6" {...common} />}
      {name === 'chevron-right' && <Polyline points="9 18 15 12 9 6" {...common} />}
      {name === 'chevron-down' && <Polyline points="6 9 12 15 18 9" {...common} />}
    </Svg>
  );
}

/** Apple-ის ლოგო. */
export function AppleLogo({ size = 22, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35
           C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84
           1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09z
           M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

/** Google-ის ოფიციალური ფერადი "G". */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}
