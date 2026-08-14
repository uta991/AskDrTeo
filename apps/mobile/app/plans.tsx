import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/navigation/goBack';
import { SkyBackground } from '@/components/SkyBackground';
import { PlanPicker } from '@/components/PlanPicker';
import { Icon } from '@/components/ui/Icon';
import { colors, spacing } from '@/theme';
import { useEntitlements } from '@/features/entitlements/entitlements.store';
import { usePlans } from '@/features/plans/plans.store';

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const loadPlans = usePlans((state) => state.load);
  const snapshot = useEntitlements((state) => state.snapshot);

  useEffect(() => {
    void loadPlans().catch(() => undefined);
  }, [loadPlans]);

  return (
    <SkyBackground showDoves={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => goBack('/home')} style={styles.back} hitSlop={12}>
          <Icon name="chevron-left" size={26} color={colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.body}>
          <PlanPicker currentPlanCode={snapshot?.planCode ?? null} />
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  back: { alignSelf: 'flex-start', padding: spacing.xs },
  // PlanPicker-ს საკუთარი ზედა მანძილი აქვს — აქ დამატება ზედმეტია
  body: { marginTop: -spacing.md },
});
