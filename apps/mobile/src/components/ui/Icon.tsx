import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'bulb'
  | 'calendar'
  | 'calculator'
  | 'growth'
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
  | 'chevron-down'
  | 'syringe'
  | 'play'
  | 'sparkle'
  | 'chat'
  | 'thermometer'
  | 'leaf'
  | 'ruler'
  | 'chart'
  | 'bell'
  | 'arrow-right'
  | 'head'
  | 'bowl'
  | 'robot'
  | 'pill'
  | 'syrup'
  | 'traveler'
  | 'nutrition'
  | 'sleep'
  | 'baby'
  | 'sos'
  | 'consultation';

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
      {/* განვითარება — მხოხავი ბავშვი, მზარდი სვეტები და ვარსკვლავი */}
      {name === 'growth' && (
        <>
          {/* ბავშვი */}
          <Circle cx="5.4" cy="12.2" r="2" {...common} />
          <Path
            d="M7.1 13.4c.9.8 1.3 1.9 1.3 3.1v2.9c0 .6-.5 1.1-1.1 1.1"
            {...common}
          />
          <Path
            d="M3.9 13.7c-1.4.6-2.4 2-2.4 3.6v1.9c0 .7.6 1.3 1.3 1.3h4.5"
            {...common}
          />

          {/* ვარსკვლავისკენ მიმავალი წყვეტილი რკალი */}
          <Path
            d="M9.6 13.2c2.4-1.1 4.8-2.9 6.6-5.2"
            {...common}
            strokeDasharray="1.6 1.6"
          />

          {/* სვეტები — დაბლიდან მაღლა */}
          <Rect x="11.4" y="16.4" width="2.7" height="4.2" rx="1" {...common} />
          <Rect x="15" y="13.6" width="2.7" height="7" rx="1" {...common} />
          <Rect x="18.6" y="10.8" width="2.7" height="9.8" rx="1" {...common} />

          {/* ვარსკვლავი */}
          <Path
            d="m19.4 2.6 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z"
            {...common}
          />
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

          {/* დღეები — ერთი მონიშნული, დანარჩენი ცარიელი */}
          <Circle cx="8" cy="14" r="1.1" {...common} />
          <Circle cx="12" cy="14" r="1.1" fill={color} stroke="none" />
          <Circle cx="16" cy="14" r="1.1" {...common} />
          <Circle cx="8" cy="17.6" r="1.1" {...common} />
          <Circle cx="12" cy="17.6" r="1.1" {...common} />
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
      {/* თერმომეტრი — ჯანმრთელობის ბარათი */}
      {name === 'thermometer' && (
        <>
          <Path
            d="M14 14.8V5.5a2 2 0 1 0-4 0v9.3a4 4 0 1 0 4 0Z"
            {...common}
          />
          <Circle cx="12" cy="17.8" r="1.7" fill={color} stroke="none" />
          <Path d="M15.8 7.5H17.6" {...common} />
          <Path d="M15.8 10.3H17.6" {...common} />
        </>
      )}

      {/* ყლორტი — განვითარების ბარათი */}
      {name === 'leaf' && (
        <>
          <Path d="M12 20.5V11" {...common} />
          <Path
            d="M12 11c0-3 2-5.4 5.4-5.9.4 3.4-1.6 6-5.4 5.9Z"
            {...common}
          />
          <Path
            d="M12 13.4c0-2.6-1.7-4.6-4.6-5-.4 2.9 1.3 5.1 4.6 5Z"
            {...common}
          />
        </>
      )}

      {/* სახაზავი — ზრდის ბარათი */}
      {name === 'ruler' && (
        <>
          <Path
            d="M4.6 15.2 15.2 4.6a1.5 1.5 0 0 1 2.1 0l2.1 2.1a1.5 1.5 0 0 1 0 2.1L8.8 19.4a1.5 1.5 0 0 1-2.1 0l-2.1-2.1a1.5 1.5 0 0 1 0-2.1Z"
            {...common}
          />
          <Path d="M8.2 11.6 9.9 13.3" {...common} />
          <Path d="M10.9 8.9 12.6 10.6" {...common} />
          <Path d="M13.6 6.2 15.3 7.9" {...common} />
        </>
      )}

      {/* დიაგრამა — ზრდის დღიური */}
      {name === 'chart' && (
        <>
          <Path d="M4 20h16" {...common} />
          <Path d="M7 20v-5.5" {...common} strokeWidth={strokeWidth + 0.6} />
          <Path d="M12 20V9.5" {...common} strokeWidth={strokeWidth + 0.6} />
          <Path d="M17 20V5.5" {...common} strokeWidth={strokeWidth + 0.6} />
        </>
      )}

      {/* პროფილი გვერდიდან — განვითარების ბარათი */}
      {name === 'head' && (
        <>
          <Path
            d="M15.8 20.5v-2.7c0-.7.4-1.2 1-1.5 1.6-.8 2.7-2.5 2.7-4.4 0-3.6-3.2-6.5-7-6.5-3.5 0-6.4 2.4-6.9 5.5-.2 1.3.2 2.5.9 3.4l1.2 1.5v4.7"
            {...common}
          />
          <Circle cx="10.4" cy="11.6" r="1" fill={color} stroke="none" />
          <Path d="M13.6 12.6c.6.8 1.5 1 2.4.6" {...common} />
        </>
      )}

      {/* თეფში — კვების ბარათი */}
      {name === 'bowl' && (
        <>
          <Path d="M3.6 11.5h16.8a8.4 8.4 0 0 1-8.4 7.6 8.4 8.4 0 0 1-8.4-7.6Z" {...common} />
          <Path d="M8.6 8.2c-.5-1 .2-2 1.3-2.4" {...common} />
          <Path d="M12 7.6c-.5-1 .2-2 1.3-2.4" {...common} />
          <Path d="M15.4 8.2c-.5-1 .2-2 1.3-2.4" {...common} />
        </>
      )}

      {/* რობოტი — AI ასისტენტი */}
      {name === 'robot' && (
        <>
          <Rect x="4.2" y="7.6" width="15.6" height="11.4" rx="3.2" {...common} />
          <Path d="M12 4.2v3.4" {...common} />
          <Circle cx="12" cy="3.4" r="1.1" fill={color} stroke="none" />
          <Circle cx="9.2" cy="12.6" r="1.15" fill={color} stroke="none" />
          <Circle cx="14.8" cy="12.6" r="1.15" fill={color} stroke="none" />
          <Path d="M9.6 15.8h4.8" {...common} />
        </>
      )}

      {/* კაფსულა — დოზის კალკულატორი */}
      {name === 'pill' && (
        <>
          <Path
            d="M6.6 17.4 17.4 6.6a3.9 3.9 0 0 0-5.5-5.5L1.1 11.9a3.9 3.9 0 0 0 5.5 5.5Z"
            transform="translate(3 3)"
            {...common}
          />
          <Path d="M6.4 6.4 11.9 11.9" transform="translate(3 3)" {...common} />
        </>
      )}

      {/* წამლის ბოთლი გამოყრილი აბებით — დოზის კალკულატორი */}
      {name === 'syrup' && (
        <>
          <Rect x="4.6" y="2.4" width="6.6" height="2.6" rx="0.9" {...common} />
          <Rect x="4" y="5" width="7.8" height="13.6" rx="2.3" {...common} />

          {/* ეტიკეტი */}
          <Path d="M5.4 9.6h5" {...common} />
          <Path d="M5.4 12.2h5" {...common} />

          {/* გამოყრილი აბები */}
          <Circle cx="16.4" cy="14.6" r="2.6" {...common} />
          <Path d="M14.6 12.8 18.2 16.4" {...common} />
          <Circle cx="19.4" cy="19.6" r="2.2" {...common} />
        </>
      )}

      {/* ზარი — შეტყობინებები */}
      {name === 'bell' && (
        <>
          <Path
            d="M12 3.2a5.6 5.6 0 0 0-5.6 5.6v3.4l-1.3 2.6a.9.9 0 0 0 .8 1.3h12.2a.9.9 0 0 0 .8-1.3l-1.3-2.6V8.8A5.6 5.6 0 0 0 12 3.2Z"
            {...common}
          />
          <Path d="M10.2 19a1.9 1.9 0 0 0 3.6 0" {...common} />
        </>
      )}

      {name === 'arrow-right' && (
        <>
          <Path d="M4.5 12h14" {...common} />
          <Path d="M13.5 7 18.5 12 13.5 17" {...common} />
        </>
      )}

      {/* შპრიცი — დიაგონალზე: დგუში ზემოთ მარჯვნივ, ნემსი ქვემოთ მარცხნივ */}
      {name === 'syringe' && (
        <>
          <Path d="M17.3 3.2 L20.8 6.7" {...common} />
          <Path d="M19.05 4.95 L16.6 7.4" {...common} />

          <Path
            d="M15.6 6.4 L17.6 8.4a1.2 1.2 0 0 1 0 1.7l-6.6 6.6a1.2 1.2 0 0 1-1.7 0L7.3 14.7a1.2 1.2 0 0 1 0-1.7l6.6-6.6a1.2 1.2 0 0 1 1.7 0Z"
            {...common}
          />

          {/* დანაყოფები — სწორედ ესენი ხდის ნახატს შპრიცად */}
          <Path d="M13.4 8.6 L15.2 10.4" {...common} />
          <Path d="M11.6 10.4 L13.4 12.2" {...common} />
          <Path d="M9.8 12.2 L11.6 14" {...common} />

          <Path d="M8.6 15.4 L6.2 17.8" {...common} />

          {/* წვეთი ნემსის წვერზე — ასე ჩანს, რომ ნემსია და არა ჯოხი */}
          <Path
            d="M4.9 18.5c.95 1.15 1.45 1.85 1.45 2.45a1.45 1.45 0 0 1-2.9 0c0-.6.5-1.3 1.45-2.45z"
            {...common}
            fill={color}
          />
        </>
      )}

      {/* საუბრის ბუშტი სამი წერტილით */}
      {name === 'chat' && (
        <>
          <Path
            d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 21l1.5-3.4C4.2 16.2 3.5 14.4 3.5 12.4c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"
            {...common}
          />
          <Circle cx="8.4" cy="12.3" r="1" fill={color} stroke="none" />
          <Circle cx="12" cy="12.3" r="1" fill={color} stroke="none" />
          <Circle cx="15.6" cy="12.3" r="1" fill={color} stroke="none" />
        </>
      )}

      {/* AI — ოთხქიმიანი ნაპერწკალი, პატარა თანამგზავრით */}
      {name === 'sparkle' && (
        <>
          <Path
            d="M10 3.5c.9 3 1.6 3.7 4.6 4.6-3 .9-3.7 1.6-4.6 4.6-.9-3-1.6-3.7-4.6-4.6 3-.9 3.7-1.6 4.6-4.6Z"
            {...common}
          />
          <Path
            d="M17 13c.5 1.7.9 2.1 2.6 2.6-1.7.5-2.1.9-2.6 2.6-.5-1.7-.9-2.1-2.6-2.6 1.7-.5 2.1-.9 2.6-2.6Z"
            {...common}
          />
          <Circle cx="7" cy="18" r="1.1" fill={color} stroke="none" />
        </>
      )}

      {/* დაკვრის სამკუთხედი მრგვალ ჩარჩოში */}
      {name === 'play' && (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M10.2 8.6 L16 12 L10.2 15.4 Z" {...common} fill={color} />
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
      {name === 'traveler' && (
        <>
          {/* პატარა მგზავრი */}
          <Circle cx="7.6" cy="14.2" r="3.4" {...common} />
          <Path d="M3 21.8a4.6 4.6 0 0 1 9.2 0" {...common} />
          {/* თვითმფრინავი — ოდნავ ზემოთ აღმართული */}
          <G transform="rotate(-18 17 6)">
            <Path
              d="M13.6 7.2h4.6c1.5 0 2.7-.5 2.7-1.1s-1.2-1.1-2.7-1.1h-4.6a1.1 1.1 0 0 0 0 2.2z"
              {...common}
            />
            <Path d="M16.4 7.2 15 9.8h1.3l1.8-2.6" {...common} />
            <Path d="M14.4 5 13.3 2.6h1.2L16.4 5" {...common} />
          </G>
        </>
      )}
      {name === 'nutrition' && (
        <>
          {/* ვაშლი — ტარითა და ფოთლით */}
          <Ellipse cx="14.4" cy="13.6" rx="5.4" ry="5.8" {...common} />
          <Path d="M14.4 7.6V4.8" {...common} />
          <Path d="M14.6 5.8c1-1.2 2.4-1.4 3.6-1-.1 1.4-1 2.5-2.2 2.7" {...common} />
          {/* ბავშვი წინ */}
          <Circle cx="5.8" cy="13.2" r="2.7" {...common} />
          <Path d="M2.2 20.4a3.7 3.7 0 0 1 7.2 0" {...common} />
        </>
      )}

      {name === 'baby' && (
        <>
          {/* თავი და ბიბილო */}
          <Circle cx="12" cy="7.6" r="3.4" {...common} />
          <Path d="M12 4.2c.9-.9 2.1-.8 2.5.3" {...common} />
          {/* პამპერსი */}
          <Path d="M8.6 14.6a3.4 3.4 0 0 1 6.8 0v1.2c0 1.7-1.5 3-3.4 3s-3.4-1.3-3.4-3z" {...common} />
          <Path d="M8.7 15.4h6.6" {...common} />
          {/* ხელები და ფეხები */}
          <Path d="M8.8 14.8 6.2 16.4M15.2 14.8l2.6 1.6" {...common} />
          <Path d="M10 18.6 9 21M14 18.6l1 2.4" {...common} />
        </>
      )}

      {name === 'sos' && (
        <>
          <Path d="M12 20.4S3 15.2 3 9.4a4.8 4.8 0 0 1 9-2.4 4.8 4.8 0 0 1 9 2.4c0 5.8-9 11-9 11z" {...common} />
          {/* პულსი — სამედიცინო სასწრაფოს ნიშანი */}
          <Path d="M4.6 12h3.6l1.6-3 2.4 5.4 1.8-2.4h5.4" {...common} />
        </>
      )}

      {name === 'sleep' && (
        <>
          {/* საწოლი */}
          <Path
            d="M2.4 19.8v-6.4a1.6 1.6 0 0 1 1.6-1.6h8.6a4.4 4.4 0 0 1 4.4 4.4v3.6"
            {...common}
          />
          <Path d="M2.4 17.2h14.6" {...common} />
          {/* ბალიშზე მძინარე ბავშვი */}
          <Circle cx="6.4" cy="9.2" r="2.3" {...common} />
          {/* ძილის ნიშანი */}
          <Path d="M13.6 3h3.6l-3.6 4h3.6" {...common} />
          <Path d="M18.8 8.2h2.6l-2.6 2.9h2.6" {...common} />
        </>
      )}
      {name === 'consultation' && (
        <>
          {/* ყურსასმენები */}
          <Path d="M2.8 3.4h1.8M8.2 3.4H10" {...common} />
          <Path d="M3.7 3.4v3.2a2.8 2.8 0 0 0 5.6 0V3.4" {...common} />
          {/* მილი და თავსაკრავი */}
          <Path d="M6.5 9.4v2.8a3.4 3.4 0 0 0 3.4 3.4" {...common} />
          <Circle cx="12.4" cy="15.6" r="2.5" {...common} />
          {/* სიგნალის ტალღები — კავშირი ცოცხალია */}
          <Path d="M16.4 12.6a4.6 4.6 0 0 1 0 6" {...common} />
          <Path d="M19.4 10.4a8.4 8.4 0 0 1 0 10.4" {...common} />
        </>
      )}
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
