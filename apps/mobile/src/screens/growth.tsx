import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NumberPad } from '@/components/NumberPad';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useEntitlements } from '@/features/entitlements/entitlements.store';
import { useActiveChild } from '@/features/children/children.store';
import { useGrowth, type GrowthPoint } from '@/features/growth/growth.store';

type Metric = 'weightKg' | 'heightCm' | 'headCm';

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'წონა', unit: 'კგ' },
  { key: 'heightCm', label: 'სიმაღლე', unit: 'სმ' },
  { key: 'headCm', label: 'თავი', unit: 'სმ' },
];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const PADDING = { top: 12, right: 12, bottom: 24, left: 34 };

/**
 * მრუდი.
 *
 * პროცენტილის ზოლები განზრახ არ არის: შეფასება პედიატრის საქმეა და
 * მშობელს ციფრი დასკვნად მოეჩვენებოდა. აქ ბავშვის საკუთარი ტენდენციაა.
 */
function Chart({ points, metric }: { points: GrowthPoint[]; metric: Metric }) {
  const data = points
    .filter((point) => point[metric] !== null)
    .map((point) => ({ x: point.ageMonths, y: point[metric] as number }));

  if (data.length < 2) {
    return <Text style={styles.chartEmpty}>მრუდისთვის ორი გაზომვა მაინც არის საჭირო.</Text>;
  }

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // ერთნაირი მნიშვნელობებისას მასშტაბი ნულზე გაყოფას იძლევა
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const px = (x: number) =>
    PADDING.left + ((x - minX) / spanX) * (CHART_WIDTH - PADDING.left - PADDING.right);
  const py = (y: number) =>
    CHART_HEIGHT - PADDING.bottom - ((y - minY) / spanY) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(d.x)} ${py(d.y)}`).join(' ');

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      <Line
        x1={PADDING.left}
        y1={CHART_HEIGHT - PADDING.bottom}
        x2={CHART_WIDTH - PADDING.right}
        y2={CHART_HEIGHT - PADDING.bottom}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={CHART_HEIGHT - PADDING.bottom}
        stroke={colors.border}
        strokeWidth={1}
      />

      <Path d={path} stroke={colors.primaryText} strokeWidth={2.5} fill="none" />

      {data.map((d) => (
        <Circle key={`${d.x}-${d.y}`} cx={px(d.x)} cy={py(d.y)} r={4} fill={colors.primaryText} />
      ))}

      <SvgText x={4} y={PADDING.top + 4} fontSize={10} fill={colors.textSecondary}>
        {String(maxY)}
      </SvgText>
      <SvgText x={4} y={CHART_HEIGHT - PADDING.bottom} fontSize={10} fill={colors.textSecondary}>
        {String(minY)}
      </SvgText>
      <SvgText
        x={CHART_WIDTH - PADDING.right}
        y={CHART_HEIGHT - 6}
        fontSize={10}
        textAnchor="end"
        fill={colors.textSecondary}
      >
        {`${maxX} თვე`}
      </SvgText>
    </Svg>
  );
}

export default function GrowthScreen() {
  const role = useAuth((state) => state.user?.role);
  const isStaff = !!role && role !== 'PARENT';
  const allowed = useEntitlements((state) => state.can('growth_tracking')) || isStaff;

  const activeChild = useActiveChild();
  const { points, loading, error, load, add } = useGrowth();

  const [metric, setMetric] = useState<Metric>('weightKg');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [editing, setEditing] = useState<'weight' | 'height' | null>(null);

  useEffect(() => {
    if (allowed && activeChild) void load(activeChild.id).catch(() => undefined);
  }, [allowed, activeChild, load]);

  const active = METRICS.find((item) => item.key === metric)!;

  const latest = useMemo(() => {
    const withValue = points.filter((point) => point[metric] !== null);
    return withValue[withValue.length - 1] ?? null;
  }, [points, metric]);

  if (!allowed) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="ზრდის დინამიკა" onBack={goBack} />

        <View style={styles.locked}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={22} color={colors.primaryDeep} strokeWidth={2} />
          </View>

          <Text style={styles.lockedTitle}>ეს ფუნქცია ფასიან პაკეტშია</Text>
          <Text style={styles.lockedText}>
            წონისა და სიმაღლის მრუდი სტანდარტულ და პრემიუმ პაკეტს აქვს.
          </Text>

          <Button title="პაკეტების ნახვა" onPress={() => router.push('/plans')} />
        </View>
      </SkyBackground>
    );
  }

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader
        title="ზრდის დინამიკა"
        subtitle={activeChild ? `${activeChild.firstName} · ${activeChild.ageLabel}` : undefined}
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!activeChild ? (
          <Text style={styles.empty}>ჯერ დაამატეთ ბავშვის პროფილი.</Text>
        ) : (
          <>
            <View style={styles.metricRow}>
              {METRICS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setMetric(item.key)}
                  style={[styles.metricTab, item.key === metric && styles.metricTabActive]}
                >
                  <Text style={styles.metricText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <AuthCard style={styles.card}>
              {loading && !points.length && <ActivityIndicator color={colors.primary} />}

              {!!latest && (
                <View style={styles.summary}>
                  <Text style={styles.summaryValue}>
                    {latest[metric]} {active.unit}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    ბოლო გაზომვა · {latest.measuredAt.slice(0, 10)} · {latest.ageMonths} თვე
                  </Text>
                </View>
              )}

              <Chart points={points} metric={metric} />
            </AuthCard>

            <AuthCard style={styles.card}>
              <Text style={styles.formTitle}>ახალი გაზომვა</Text>

              <View style={styles.formRow}>
                <Pressable style={styles.field} onPress={() => setEditing('weight')}>
                  <Text style={styles.fieldLabel}>წონა (კგ)</Text>
                  <Text style={styles.fieldValue}>{weight || '—'}</Text>
                </Pressable>

                <Pressable style={styles.field} onPress={() => setEditing('height')}>
                  <Text style={styles.fieldLabel}>სიმაღლე (სმ)</Text>
                  <Text style={styles.fieldValue}>{height || '—'}</Text>
                </Pressable>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Button
                title="შენახვა"
                disabled={!weight && !height}
                onPress={() => {
                  void add(activeChild.id, {
                    weightKg: weight ? Number(weight.replace(',', '.')) : undefined,
                    heightCm: height ? Number(height.replace(',', '.')) : undefined,
                  });
                  setWeight('');
                  setHeight('');
                }}
              />
            </AuthCard>

            {points.length > 0 && (
              <AuthCard style={styles.card}>
                <Text style={styles.formTitle}>ისტორია</Text>

                {[...points].reverse().map((point) => (
                  <View key={point.id} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{point.measuredAt.slice(0, 10)}</Text>
                    <Text style={styles.historyValue}>
                      {point.weightKg !== null && `${point.weightKg} კგ`}
                      {point.heightCm !== null && ` · ${point.heightCm} სმ`}
                    </Text>
                  </View>
                ))}
              </AuthCard>
            )}
          </>
        )}
      </ScrollView>

      <NumberPad
        visible={editing !== null}
        label={editing === 'weight' ? 'წონა — კგ' : 'სიმაღლე — სმ'}
        value={editing === 'weight' ? weight : height}
        onChange={(next) => (editing === 'weight' ? setWeight(next) : setHeight(next))}
        onClose={() => setEditing(null)}
      />
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },

  locked: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  lockIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: { ...typography.h2, color: colors.textPrimary },
  lockedText: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },

  empty: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  card: { gap: spacing.sm },

  metricRow: { flexDirection: 'row', gap: spacing.xs },
  metricTab: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  metricTabActive: { borderColor: colors.primary },
  metricText: { ...typography.small, fontSize: 12, color: colors.textPrimary },

  summary: { gap: 2 },
  summaryValue: { ...typography.h2, color: colors.textPrimary },
  summaryMeta: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  chartEmpty: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  formTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  field: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  fieldLabel: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  fieldValue: { ...typography.bodyMedium, color: colors.textPrimary },
  error: { ...typography.small, color: colors.danger },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: { ...typography.small, fontSize: 12, color: colors.textSecondary },
  historyValue: { ...typography.small, fontSize: 12, color: colors.textPrimary },
});
