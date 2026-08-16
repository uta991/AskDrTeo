import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/navigation/goBack';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import {
  DateFields,
  EMPTY_DATE,
  isEmptyDate,
  partsToISO,
  type DateParts,
} from '@/components/ui/DateFields';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useChildren } from '@/features/children/children.store';
import {
  PermissionDeniedError,
  pickImage,
  uploadAvatar,
  type PickedImage,
} from '@/features/media/upload';

type Gender = 'MALE' | 'FEMALE';

export default function ChildFormScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const createChild = useChildren((s) => s.create);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birth, setBirth] = useState<DateParts>(EMPTY_DATE);
  const [motherBirth, setMotherBirth] = useState<DateParts>(EMPTY_DATE);
  const [fatherBirth, setFatherBirth] = useState<DateParts>(EMPTY_DATE);
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherLastName, setMotherLastName] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherLastName, setFatherLastName] = useState('');
  const [gestationalWeek, setGestationalWeek] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [photo, setPhoto] = useState<PickedImage | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    const next: Record<string, string> = {};

    if (!firstName.trim()) next.firstName = t('child', 'errName');
    if (!photo) next.photo = t('child', 'errPhoto');

    const birthISO = partsToISO(birth);
    if (!birthISO) {
      next.birth = t('child', 'errDate');
    } else if (new Date(birthISO) > new Date()) {
      next.birth = t('child', 'errFuture');
    }

    // მშობლების თარიღები არასავალდებულოა, მაგრამ თუ შეივსო — სწორი უნდა იყოს
    if (!isEmptyDate(motherBirth) && !partsToISO(motherBirth)) {
      next.motherBirth = t('child', 'errDate');
    }
    if (!isEmptyDate(fatherBirth) && !partsToISO(fatherBirth)) {
      next.fatherBirth = t('child', 'errDate');
    }

    setErrors(next);
    return Object.keys(next).length ? null : birthISO;
  };

  const handleSave = async () => {
    setFormError(null);
    const birthISO = validate();
    if (!birthISO) return;

    setLoading(true);
    try {
      // ფოტო ჯერ იტვირთება — ჩავარდნის შემთხვევაში პროფილი არ უნდა შეიქმნას
      const avatarAssetId = photo ? await uploadAvatar(photo) : undefined;

      await createChild({
        firstName: firstName.trim(),
        avatarAssetId,
        lastName: lastName.trim() || undefined,
        birthDate: birthISO,
        gender: gender ?? undefined,
        gestationalWeek: gestationalWeek ? Number(gestationalWeek) : undefined,
        birthWeight: weight ? Number(weight.replace(',', '.')) : undefined,
        birthHeight: height ? Number(height.replace(',', '.')) : undefined,
        motherFirstName: motherFirstName.trim() || undefined,
        motherLastName: motherLastName.trim() || undefined,
        motherBirthDate: partsToISO(motherBirth) ?? undefined,
        fatherFirstName: fatherFirstName.trim() || undefined,
        fatherLastName: fatherLastName.trim() || undefined,
        fatherBirthDate: partsToISO(fatherBirth) ?? undefined,
      });
      goBack('/home');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SkyBackground showDoves={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => goBack('/home')} style={styles.back} hitSlop={12}>
            <Icon name="chevron-left" size={26} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>{t('child', 'addTitle')}</Text>
            <Text style={styles.subtitle}>{t('child', 'addSubtitle')}</Text>
          </View>

          <AuthCard>
            <Pressable
              onPress={async () => {
                setFormError(null);
                try {
                  const picked = await pickImage();
                  if (picked) setPhoto(picked);
                } catch (e) {
                  setFormError(
                    e instanceof PermissionDeniedError
                      ? t('child', 'errPhotoPermission')
                      : t('common', 'error'),
                  );
                }
              }}
              style={styles.photoPicker}
              accessibilityRole="button"
              accessibilityLabel={t('child', 'photo')}
            >
              <View style={[styles.photoCircle, !!errors.photo && styles.photoCircleError]}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                ) : (
                  <Icon name="user" size={30} color={colors.textMuted} strokeWidth={1.6} />
                )}
              </View>
              <Text style={styles.photoLabel}>{t('child', 'photo')}</Text>
              {!!errors.photo && <Text style={styles.photoError}>{errors.photo}</Text>}
            </Pressable>

            <Input
              icon="user"
              placeholder={t('child', 'firstName')}
              value={firstName}
              onChangeText={setFirstName}
              error={errors.firstName}
              autoCapitalize="words"
            />
            <Input
              icon="user"
              placeholder={t('child', 'lastName')}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <View style={styles.genderRow}>
              <GenderPill
                label={t('child', 'male')}
                active={gender === 'MALE'}
                onPress={() => setGender('MALE')}
              />
              <GenderPill
                label={t('child', 'female')}
                active={gender === 'FEMALE'}
                onPress={() => setGender('FEMALE')}
              />
            </View>

            <DateFields
              label={t('child', 'birthDate')}
              value={birth}
              onChange={setBirth}
              error={errors.birth}
            />

            <Input
              icon="calendar"
              placeholder={t('child', 'gestationalWeek')}
              value={gestationalWeek}
              onChangeText={(v) => setGestationalWeek(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.hint}>{t('child', 'gestationalHint')}</Text>

            <View style={styles.measureRow}>
              <View style={styles.measureCell}>
                <Input
                  placeholder={t('child', 'weight')}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.measureCell}>
                <Input
                  placeholder={t('child', 'height')}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('child', 'motherSection')}</Text>
            <Input
              icon="user"
              placeholder={t('child', 'motherFirstName')}
              value={motherFirstName}
              onChangeText={setMotherFirstName}
              autoCapitalize="words"
            />
            <Input
              icon="user"
              placeholder={t('child', 'motherLastName')}
              value={motherLastName}
              onChangeText={setMotherLastName}
              autoCapitalize="words"
            />
            <DateFields
              label={t('child', 'motherBirth')}
              value={motherBirth}
              onChange={setMotherBirth}
              error={errors.motherBirth}
            />

            <Text style={styles.sectionTitle}>{t('child', 'fatherSection')}</Text>
            <Input
              icon="user"
              placeholder={t('child', 'fatherFirstName')}
              value={fatherFirstName}
              onChangeText={setFatherFirstName}
              autoCapitalize="words"
            />
            <Input
              icon="user"
              placeholder={t('child', 'fatherLastName')}
              value={fatherLastName}
              onChangeText={setFatherLastName}
              autoCapitalize="words"
            />
            <DateFields
              label={t('child', 'fatherBirth')}
              value={fatherBirth}
              onChange={setFatherBirth}
              error={errors.fatherBirth}
            />

            {!!formError && <Text style={styles.formError}>{formError}</Text>}

            <Button title={t('child', 'save')} onPress={handleSave} loading={loading} showArrow />
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

function GenderPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.genderPill, active && styles.genderPillActive]}
    >
      <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl },
  back: { alignSelf: 'flex-start', padding: spacing.xs },
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  photoPicker: { alignItems: 'center', marginBottom: spacing.lg },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.input,
  },
  photoCircleError: { borderColor: colors.danger },
  photoImage: { width: '100%', height: '100%' },
  photoLabel: { ...typography.small, color: colors.primaryDeep, marginTop: spacing.sm, fontWeight: '600' },
  photoError: { ...typography.small, color: colors.danger, marginTop: 2 },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  genderPill: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  genderLabel: { ...typography.caption, color: colors.textSecondary },
  genderLabelActive: { color: colors.textPrimary, fontWeight: '600' },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  measureRow: { flexDirection: 'row', gap: spacing.sm },
  measureCell: { flex: 1 },
  formError: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
