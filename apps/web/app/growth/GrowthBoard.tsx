'use client';

import { useMemo, useState, useTransition } from 'react';
import { addEntry, removeEntry, type GrowthPoint } from './actions';
import type { ChildSummary } from '@/lib/children';
import styles from './growth.module.css';

type Metric = 'weightKg' | 'heightCm' | 'headCm';

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'წონა', unit: 'კგ' },
  { key: 'heightCm', label: 'სიმაღლე', unit: 'სმ' },
  { key: 'headCm', label: 'თავის გარშემოწერილობა', unit: 'სმ' },
];

/** დღევანდელი თარიღი input[type=date]-ის ფორმატში. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * მრუდი.
 *
 * გრაფიკი ხელით იხატება SVG-ით — ერთი წირისთვის ბიბლიოთეკის ჩამოტანა
 * გვერდს უმიზეზოდ ამძიმებდა. პროცენტილის ზოლები განზრახ არ არის:
 * შეფასება პედიატრის საქმეა, ჩვენ ტენდენციას ვაჩვენებთ.
 */
function Chart({ points, metric }: { points: GrowthPoint[]; metric: Metric }) {
  const data = points
    .filter((point) => point[metric] !== null)
    .map((point) => ({ x: point.ageMonths, y: point[metric] as number }));

  if (data.length < 2) {
    return (
      <p className={styles.chartEmpty}>
        მრუდისთვის ორი გაზომვა მაინც არის საჭირო.
      </p>
    );
  }

  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // ერთნაირი მნიშვნელობებისას ბრტყელი მასშტაბი ნულზე გაყოფას იძლევა
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const px = (x: number) =>
    pad.left + ((x - minX) / spanX) * (width - pad.left - pad.right);
  const py = (y: number) =>
    height - pad.bottom - ((y - minY) / spanY) * (height - pad.top - pad.bottom);

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(d.x)} ${py(d.y)}`).join(' ');

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart} role="img">
        <line
          x1={pad.left}
          y1={height - pad.bottom}
          x2={width - pad.right}
          y2={height - pad.bottom}
          className={styles.axis}
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={height - pad.bottom}
          className={styles.axis}
        />

        <path d={path} className={styles.line} />

        {data.map((d) => (
          <circle key={`${d.x}-${d.y}`} cx={px(d.x)} cy={py(d.y)} r={4} className={styles.dot} />
        ))}

        <text x={pad.left} y={pad.top + 4} className={styles.tick}>
          {maxY}
        </text>
        <text x={pad.left} y={height - pad.bottom - 4} className={styles.tick}>
          {minY}
        </text>
        <text x={width - pad.right} y={height - 8} textAnchor="end" className={styles.tick}>
          {maxX} თვე
        </text>
        <text x={pad.left} y={height - 8} className={styles.tick}>
          {minX} თვე
        </text>
      </svg>
    </div>
  );
}

export function GrowthBoard({
  children,
  initialChildId,
  points,
}: {
  children: ChildSummary[];
  initialChildId: string | null;
  points: GrowthPoint[];
}) {
  const [childId, setChildId] = useState(initialChildId);
  const [metric, setMetric] = useState<Metric>('weightKg');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = METRICS.find((m) => m.key === metric)!;

  const latest = useMemo(() => {
    const withValue = points.filter((point) => point[metric] !== null);
    return withValue[withValue.length - 1] ?? null;
  }, [points, metric]);

  const previous = useMemo(() => {
    const withValue = points.filter((point) => point[metric] !== null);
    return withValue[withValue.length - 2] ?? null;
  }, [points, metric]);

  const delta =
    latest && previous
      ? ((latest[metric] as number) - (previous[metric] as number)).toFixed(1)
      : null;

  return (
    <div className={styles.board}>
      {children.length > 1 && (
        <div className={styles.childRow}>
          {children.map((child) => (
            <a
              key={child.id}
              href={`/growth?child=${child.id}`}
              className={`${styles.childChip} ${child.id === childId ? styles.childChipActive : ''}`}
              onClick={() => setChildId(child.id)}
            >
              {child.firstName} · {child.ageLabel}
            </a>
          ))}
        </div>
      )}

      <div className={styles.metricRow}>
        {METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetric(item.key)}
            className={`${styles.metricTab} ${item.key === metric ? styles.metricTabActive : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!!latest && (
        <div className={styles.summary}>
          <div>
            <span className={styles.summaryValue}>
              {latest[metric]} {active.unit}
            </span>
            <span className={styles.summaryMeta}>
              ბოლო გაზომვა · {latest.measuredAt.slice(0, 10)} · {latest.ageMonths} თვე
            </span>
          </div>

          {!!delta && (
            <span className={styles.delta}>
              {Number(delta) >= 0 ? '+' : ''}
              {delta} {active.unit} წინა გაზომვიდან
            </span>
          )}
        </div>
      )}

      <Chart points={points} metric={metric} />

      <form
        className={styles.form}
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await addEntry(childId!, formData);
            if (result.error) setError(result.error);
          });
        }}
      >
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>თარიღი</span>
            <input type="date" name="measuredAt" defaultValue={today()} className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>წონა (კგ)</span>
            <input type="number" step="0.01" name="weightKg" className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>სიმაღლე (სმ)</span>
            <input type="number" step="0.1" name="heightCm" className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>თავი (სმ)</span>
            <input type="number" step="0.1" name="headCm" className={styles.input} />
          </label>
        </div>

        {!!error && <p className={styles.error}>{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={pending || !childId}>
          {pending ? 'ინახება…' : 'გაზომვის დამატება'}
        </button>
      </form>

      {points.length > 0 && (
        <div className={styles.history}>
          <h3 className={styles.historyTitle}>ისტორია</h3>

          {[...points].reverse().map((point) => (
            <div key={point.id} className={styles.historyRow}>
              <span className={styles.historyDate}>{point.measuredAt.slice(0, 10)}</span>
              <span className={styles.historyValues}>
                {point.weightKg !== null && `${point.weightKg} კგ`}
                {point.heightCm !== null && ` · ${point.heightCm} სმ`}
                {point.headCm !== null && ` · თავი ${point.headCm} სმ`}
              </span>

              <button
                type="button"
                className={styles.removeLink}
                onClick={() =>
                  startTransition(async () => {
                    await removeEntry(childId!, point.id);
                  })
                }
              >
                წაშლა
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
