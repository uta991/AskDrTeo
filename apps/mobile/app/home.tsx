import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { BottomTabBar, type TabDescriptor } from '@/components/BottomTabBar';
import { AdviceTab } from '@/screens/advice';
import { BookingTab } from '@/screens/booking';
import { HomeTab } from '@/screens/home';
import { ProfileTab } from '@/screens/profile';
import { AdminDashboardTab } from '@/screens/admin/dashboard';
import { CalculatorTab } from '@/screens/calculator';
import { DevelopmentTab } from '@/screens/development';
import { AdminNewsTab } from '@/screens/admin/news';
import { colors } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useTabs } from '@/features/tabs';
import { useActiveChild, useChildren } from '@/features/children/children.store';

/**
 * აპლიკაციის მთავარი ეკრანი: გვერდები ქვედა მენიუთი.
 *
 * ტაბების ნაკრები როლზეა დამოკიდებული — მშობელი და პერსონალი
 * სხვადასხვა აპლიკაციას იყენებენ ერთი და იმავე ბილდში.
 *
 * გადასვლა ორი გზითაა: მენიუზე დაჭერით და თითის გადაფურცვლით.
 */
export default function MainScreen() {
  const t = useT();
  const pager = useRef<PagerView>(null);
  const [index, setIndex] = useState(0);

  const user = useAuth((s) => s.user);
  const children = useChildren((s) => s.children);
  const activeChild = useActiveChild();

  const isStaff = !!user && user.role !== 'PARENT';
  const needsChildProfile = !!user && user.role === 'PARENT' && children.length === 0;

  const tabs = useMemo<TabDescriptor[]>(() => {
    if (isStaff) {
      return [
        { key: 'dashboard', label: t('admin', 'dashboard'), icon: 'home' },
        { key: 'news', label: t('admin', 'news'), icon: 'bulb' },
        { key: 'development', label: t('tabs', 'development'), icon: 'growth' },
        { key: 'calculator', label: t('tabs', 'calculator'), icon: 'calculator' },
        { key: 'profile', label: t('tabs', 'profile'), icon: 'user' },
      ];
    }

    return [
      { key: 'home', label: t('tabs', 'home'), icon: 'home' },
      { key: 'advice', label: t('tabs', 'advice'), icon: 'bulb' },
      { key: 'booking', label: t('tabs', 'booking'), icon: 'calendar' },
      { key: 'development', label: t('tabs', 'development'), icon: 'growth' },
      { key: 'calculator', label: t('tabs', 'calculator'), icon: 'calculator' },
      {
        key: 'profile',
        label: t('tabs', 'profile'),
        icon: 'user',
        badge: needsChildProfile,
        avatarUrl: activeChild?.avatarUrl ?? null,
      },
    ];
  }, [t, isStaff, needsChildProfile, activeChild?.avatarUrl]);

  // ფილიდან მოთხოვნილი ტაბი — ინდექსს იმავე სიიდან ვიღებთ, რომ
  // ტაბების გადალაგებისას აღარაფერი დაგვჭირდეს
  const requested = useTabs((state) => state.requested);
  const clearRequest = useTabs((state) => state.clear);

  useEffect(() => {
    if (!requested) return;

    const index = tabs.findIndex((tab) => tab.key === requested);
    if (index >= 0) pager.current?.setPage(index);
    clearRequest();
  }, [requested, tabs, clearRequest]);

  const handleSelect = useCallback((next: number) => {
    // setPage ანიმაციით გადადის; index-ს onPageSelected დააყენებს
    pager.current?.setPage(next);
  }, []);

  return (
    <View style={styles.root}>
      <PagerView
        // key — როლის შეცვლისას (გასვლა/შესვლა) pager თავიდან უნდა აეწყოს,
        // თორემ ძველი გვერდები რჩება
        key={isStaff ? 'staff' : 'parent'}
        ref={pager}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setIndex(e.nativeEvent.position)}
      >
        {isStaff
          ? [
              <View key="dashboard" style={styles.page}>
                <AdminDashboardTab />
              </View>,
              <View key="news" style={styles.page}>
                <AdminNewsTab />
              </View>,
              <View key="development" style={styles.page}>
                <DevelopmentTab />
              </View>,
              <View key="calculator" style={styles.page}>
                <CalculatorTab />
              </View>,
              <View key="profile" style={styles.page}>
                <ProfileTab />
              </View>,
            ]
          : [
              <View key="home" style={styles.page}>
                <HomeTab />
              </View>,
              <View key="advice" style={styles.page}>
                <AdviceTab />
              </View>,
              <View key="booking" style={styles.page}>
                <BookingTab />
              </View>,
              <View key="development" style={styles.page}>
                <DevelopmentTab />
              </View>,
              <View key="calculator" style={styles.page}>
                <CalculatorTab />
              </View>,
              <View key="profile" style={styles.page}>
                <ProfileTab />
              </View>,
            ]}
      </PagerView>

      <BottomTabBar tabs={tabs} activeIndex={index} onSelect={handleSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skyBottom },
  pager: { flex: 1 },
  page: { flex: 1 },
});
