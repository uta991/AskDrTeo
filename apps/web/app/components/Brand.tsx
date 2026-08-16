/**
 * ბრენდის ელემენტები — მობილურის `Logo.tsx`-ის ზუსტი შესატყვისი.
 *
 * SVG განზრახ ხელახლა იწერება და არა ფოტოდ ინახება: ვექტორი ნებისმიერ
 * ზომაზე მკვეთრია და ფერს თემის ცვლადებიდან იღებს.
 */

/** ამომავალი მზე — სითბო, ახალი დღე, იმედი. */
export function SunLogo({ size = 92 }: { size?: number }) {
  const rays = [
    { angle: -70, length: 10 },
    { angle: -50, length: 13 },
    { angle: -25, length: 16 },
    { angle: 0, length: 18 },
    { angle: 25, length: 16 },
    { angle: 50, length: 13 },
    { angle: 70, length: 10 },
  ];

  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 120 86" aria-hidden>
      <defs>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-dark)" />
        </linearGradient>
      </defs>

      {rays.map(({ angle, length }) => (
        <rect
          key={angle}
          x={58.5}
          y={62 - 26 - length}
          width={3}
          height={length}
          rx={1.5}
          fill="url(#sunGrad)"
          transform={`rotate(${angle} 60 62)`}
        />
      ))}

      <path d="M36 62 A24 24 0 0 1 84 62 Z" fill="url(#sunGrad)" />
      <rect x="26" y="66" width="68" height="4.5" rx="2.25" fill="url(#sunGrad)" />
      <rect x="40" y="76" width="40" height="4" rx="2" fill="var(--primary-light)" />
    </svg>
  );
}

/** სათაურის ქვეშ დეკორაცია — ორმხრივი ტალღა გულით. */
export function HeartFlourish({ width = 150 }: { width?: number }) {
  return (
    <svg width={width} height={width * 0.24} viewBox="0 0 150 36" aria-hidden>
      <g stroke="var(--primary-dark)" strokeWidth={2} strokeLinecap="round" fill="none">
        <path d="M6 12 C22 12 30 26 44 26 C56 26 62 18 70 14" />
        <path d="M144 12 C128 12 120 26 106 26 C94 26 88 18 80 14" />
        <path
          d="M75 20 C71 15 65 15 64 20 C63 24 69 28 75 32 C81 28 87 24 86 20 C85 15 79 15 75 20 Z"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
