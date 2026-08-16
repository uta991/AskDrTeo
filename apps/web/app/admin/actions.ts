'use server';

import { revalidatePath } from 'next/cache';
import { apiMutate, getSessionUser } from '@/lib/session';

export interface ActionState {
  error?: string;
  notice?: string;
}

/**
 * ანგარიშების მართვა მხოლოდ Super Admin-ს ეკუთვნის.
 *
 * შემოწმება backend-შიც არის — აქ იმისთვისაა, რომ ღილაკზე დაჭერამდე
 * ბევრად ადრე გაჩერდეს და შეცდომა გასაგები იყოს.
 */
async function assertSuperAdmin(): Promise<void> {
  const user = await getSessionUser();
  if (user?.role !== 'SUPER_ADMIN') {
    throw new Error('ანგარიშების მართვა მხოლოდ მთავარ ადმინისტრატორს შეუძლია');
  }
}

function toState(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : 'ოპერაცია ვერ შესრულდა' };
}

/** პაკეტის ხელით მინიჭება — გადახდის გარეშე. */
export async function grantPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get('userId') ?? '');
  const planCode = String(formData.get('planCode') ?? '');

  try {
    await apiMutate(`/admin/users/${userId}/grant-subscription`, 'POST', { planCode });
    revalidatePath('/admin/users');
    return { notice: 'პაკეტი განახლდა' };
  } catch (error) {
    return toState(error);
  }
}

/** პაროლის დაყენება — ყველა სესია უქმდება. */
export async function setPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get('userId') ?? '');
  const password = String(formData.get('password') ?? '');

  if (password.length < 8) return { error: 'პაროლი მინიმუმ 8 სიმბოლო' };

  try {
    await assertSuperAdmin();
    await apiMutate(`/admin/users/${userId}/password`, 'PATCH', { password });
    return { notice: 'პაროლი შეიცვალა' };
  } catch (error) {
    return toState(error);
  }
}

/**
 * ანგარიშის დაბლოკვა (რბილი წაშლა).
 *
 * მონაცემები რჩება და აღდგენა შესაძლებელია — ამიტომ ეს ნაგულისხმევი
 * ვარიანტია, `purgeAccount` კი გამონაკლისი.
 */
export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get('userId') ?? '');

  try {
    await assertSuperAdmin();
    await apiMutate(`/admin/users/${userId}/status`, 'PATCH', {
      status: 'DELETED',
      reason: 'ვების პანელიდან',
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/staff');
    return { notice: 'ანგარიში წაშლილია' };
  } catch (error) {
    return toState(error);
  }
}

/**
 * სამუდამო წაშლა — ჩანაწერი ბაზიდან ქრება.
 *
 * ელ. ფოსტა და ნომერი თავისუფლდება, აღდგენა შეუძლებელია. ფორმა
 * დამატებით ითხოვს სიტყვის აკრეფას, რომ შემთხვევით არ დაიჭიროს.
 */
export async function purgeAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get('userId') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '').trim();

  if (confirmation !== 'წაშლა') {
    return { error: 'დასადასტურებლად აკრიფეთ სიტყვა „წაშლა"' };
  }

  try {
    await assertSuperAdmin();
    await apiMutate(`/admin/users/${userId}`, 'DELETE');
    revalidatePath('/admin/users');
    revalidatePath('/admin/staff');
    return { notice: 'ანგარიში სამუდამოდ წაშლილია' };
  } catch (error) {
    return toState(error);
  }
}

/** პერსონალის ან მშობლის ანგარიშის შექმნა — SMS დადასტურების გარეშე. */
export async function createStaff(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = {
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    role: String(formData.get('role') ?? 'OPERATOR'),
  };

  if (!input.firstName || !input.lastName) return { error: 'შეავსეთ სახელი და გვარი' };
  if (!input.email) return { error: 'შეიყვანეთ ელ. ფოსტა' };
  if (input.password.length < 8) return { error: 'პაროლი მინიმუმ 8 სიმბოლო' };

  try {
    await assertSuperAdmin();
    await apiMutate('/admin/users/staff', 'POST', input);
    revalidatePath('/admin/staff');
    return { notice: 'ანგარიში შეიქმნა' };
  } catch (error) {
    return toState(error);
  }
}
