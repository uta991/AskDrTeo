export type FeatureIconName =
  | 'thermometer'
  | 'head'
  | 'chart'
  | 'syringe'
  | 'syrup'
  | 'robot'
  | 'chat'
  | 'play'
  | 'calendar'
  | 'crown'
  | 'traveler'
  | 'nutrition'
  | 'sleep'
  | 'baby'
  | 'sos';

/**
 * ფუნქციების ხატულები.
 *
 * იგივე ნახატებია, რაც აპლიკაციაში — ვები და ტელეფონი ერთ ენაზე უნდა
 * ლაპარაკობდნენ. ცალკე ბიბლიოთეკა ამისთვის ზედმეტია: ცხრა ხატულა
 * inline SVG-ით უფრო მსუბუქია, ვიდრე მთელი პაკეტის ჩამოტანა.
 */
export function FeatureIcon({
  name,
  size = 28,
  color = 'currentColor',
}: {
  name: FeatureIconName;
  size?: number;
  color?: string;
}) {
  const common = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === 'thermometer' && (
        <>
          <path d="M14 14.8V5.5a2 2 0 1 0-4 0v9.3a4 4 0 1 0 4 0Z" {...common} />
          <circle cx="12" cy="17.8" r="1.7" fill={color} />
          <path d="M15.8 7.5H17.6" {...common} />
          <path d="M15.8 10.3H17.6" {...common} />
        </>
      )}

      {name === 'head' && (
        <>
          <path
            d="M15.8 20.5v-2.7c0-.7.4-1.2 1-1.5 1.6-.8 2.7-2.5 2.7-4.4 0-3.6-3.2-6.5-7-6.5-3.5 0-6.4 2.4-6.9 5.5-.2 1.3.2 2.5.9 3.4l1.2 1.5v4.7"
            {...common}
          />
          <circle cx="10.4" cy="11.6" r="1" fill={color} />
          <path d="M13.6 12.6c.6.8 1.5 1 2.4.6" {...common} />
        </>
      )}

      {name === 'chart' && (
        <>
          <path d="M4 20h16" {...common} />
          <path d="M7 20v-5.5" {...common} strokeWidth={2.5} />
          <path d="M12 20V9.5" {...common} strokeWidth={2.5} />
          <path d="M17 20V5.5" {...common} strokeWidth={2.5} />
        </>
      )}

      {name === 'syringe' && (
        <>
          <path d="M17.3 3.2 20.8 6.7" {...common} />
          <path d="M19.05 4.95 16.6 7.4" {...common} />
          <path
            d="M15.6 6.4 17.6 8.4a1.2 1.2 0 0 1 0 1.7l-6.6 6.6a1.2 1.2 0 0 1-1.7 0L7.3 14.7a1.2 1.2 0 0 1 0-1.7l6.6-6.6a1.2 1.2 0 0 1 1.7 0Z"
            {...common}
          />
          <path d="M13.4 8.6 15.2 10.4" {...common} />
          <path d="M11.6 10.4 13.4 12.2" {...common} />
          <path d="M9.8 12.2 11.6 14" {...common} />
          <path d="M8.6 15.4 6.2 17.8" {...common} />
          <path
            d="M4.9 18.5c.95 1.15 1.45 1.85 1.45 2.45a1.45 1.45 0 0 1-2.9 0c0-.6.5-1.3 1.45-2.45z"
            {...common}
            fill={color}
          />
        </>
      )}

      {name === 'syrup' && (
        <>
          <rect x="4.6" y="2.4" width="6.6" height="2.6" rx="0.9" {...common} />
          <rect x="4" y="5" width="7.8" height="13.6" rx="2.3" {...common} />
          <path d="M5.4 9.6h5" {...common} />
          <path d="M5.4 12.2h5" {...common} />
          <circle cx="16.4" cy="14.6" r="2.6" {...common} />
          <path d="M14.6 12.8 18.2 16.4" {...common} />
          <circle cx="19.4" cy="19.6" r="2.2" {...common} />
        </>
      )}

      {name === 'robot' && (
        <>
          <rect x="4.2" y="7.6" width="15.6" height="11.4" rx="3.2" {...common} />
          <path d="M12 4.2v3.4" {...common} />
          <circle cx="12" cy="3.4" r="1.1" fill={color} />
          <circle cx="9.2" cy="12.6" r="1.15" fill={color} />
          <circle cx="14.8" cy="12.6" r="1.15" fill={color} />
          <path d="M9.6 15.8h4.8" {...common} />
        </>
      )}

      {name === 'chat' && (
        <>
          <path
            d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 21l1.5-3.4C4.2 16.2 3.5 14.4 3.5 12.4c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"
            {...common}
          />
          <circle cx="8.4" cy="12.3" r="1" fill={color} />
          <circle cx="12" cy="12.3" r="1" fill={color} />
          <circle cx="15.6" cy="12.3" r="1" fill={color} />
        </>
      )}

      {name === 'play' && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M10.2 8.6 16 12 10.2 15.4 Z" {...common} fill={color} />
        </>
      )}

      {name === 'calendar' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2.5" {...common} />
          <path d="M3 10h18" {...common} />
          <path d="M8 3v4" {...common} />
          <path d="M16 3v4" {...common} />
          <circle cx="8" cy="14" r="1.1" {...common} />
          <circle cx="12" cy="14" r="1.1" fill={color} />
          <circle cx="16" cy="14" r="1.1" {...common} />
          <circle cx="8" cy="17.6" r="1.1" {...common} />
          <circle cx="12" cy="17.6" r="1.1" {...common} />
        </>
      )}

      {name === 'crown' && (
        <>
          <path d="M4 17.5h16" {...common} />
          <path d="M4 17.5 5.4 7.6l4.1 3.3L12 5.5l2.5 5.4 4.1-3.3L20 17.5" {...common} />
        </>
      )}
      {name === 'traveler' && (
        <>
          {/* პატარა მგზავრი */}
          <circle cx="7.6" cy="14.2" r="3.4" {...common} />
          <path d="M3 21.8a4.6 4.6 0 0 1 9.2 0" {...common} />
          {/* თვითმფრინავი — ოდნავ ზემოთ აღმართული */}
          <g transform="rotate(-18 17 6)">
            <path
              d="M13.6 7.2h4.6c1.5 0 2.7-.5 2.7-1.1s-1.2-1.1-2.7-1.1h-4.6a1.1 1.1 0 0 0 0 2.2z"
              {...common}
            />
            <path d="M16.4 7.2 15 9.8h1.3l1.8-2.6" {...common} />
            <path d="M14.4 5 13.3 2.6h1.2L16.4 5" {...common} />
          </g>
        </>
      )}
      {name === 'nutrition' && (
        <>
          {/* ვაშლი — ტარითა და ფოთლით */}
          <ellipse cx="14.4" cy="13.6" rx="5.4" ry="5.8" {...common} />
          <path d="M14.4 7.6V4.8" {...common} />
          <path d="M14.6 5.8c1-1.2 2.4-1.4 3.6-1-.1 1.4-1 2.5-2.2 2.7" {...common} />
          {/* ბავშვი წინ */}
          <circle cx="5.8" cy="13.2" r="2.7" {...common} />
          <path d="M2.2 20.4a3.7 3.7 0 0 1 7.2 0" {...common} />
        </>
      )}

      {name === 'baby' && (
        <>
          {/* თავი და ბიბილო */}
          <circle cx="12" cy="7.6" r="3.4" {...common} />
          <path d="M12 4.2c.9-.9 2.1-.8 2.5.3" {...common} />
          {/* პამპერსი */}
          <path d="M8.6 14.6a3.4 3.4 0 0 1 6.8 0v1.2c0 1.7-1.5 3-3.4 3s-3.4-1.3-3.4-3z" {...common} />
          <path d="M8.7 15.4h6.6" {...common} />
          {/* ხელები და ფეხები */}
          <path d="M8.8 14.8 6.2 16.4M15.2 14.8l2.6 1.6" {...common} />
          <path d="M10 18.6 9 21M14 18.6l1 2.4" {...common} />
        </>
      )}

      {name === 'sos' && (
        <>
          <path d="M12 20.4S3 15.2 3 9.4a4.8 4.8 0 0 1 9-2.4 4.8 4.8 0 0 1 9 2.4c0 5.8-9 11-9 11z" {...common} />
          {/* პულსი — სამედიცინო სასწრაფოს ნიშანი */}
          <path d="M4.6 12h3.6l1.6-3 2.4 5.4 1.8-2.4h5.4" {...common} />
        </>
      )}

      {name === 'sleep' && (
        <>
          {/* საწოლი */}
          <path
            d="M2.4 19.8v-6.4a1.6 1.6 0 0 1 1.6-1.6h8.6a4.4 4.4 0 0 1 4.4 4.4v3.6"
            {...common}
          />
          <path d="M2.4 17.2h14.6" {...common} />
          {/* ბალიშზე მძინარე ბავშვი */}
          <circle cx="6.4" cy="9.2" r="2.3" {...common} />
          {/* ძილის ნიშანი */}
          <path d="M13.6 3h3.6l-3.6 4h3.6" {...common} />
          <path d="M18.8 8.2h2.6l-2.6 2.9h2.6" {...common} />
        </>
      )}
    </svg>
  );
}
