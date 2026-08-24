import { UserRole } from '@prisma/client';

/**
 * უფლებების კატალოგი.
 *
 * ეს არის *ერთადერთი* ადგილი, სადაც უფლებების სია იწერება. ბაზაში
 * seed-ით ხვდება, კოდში კი მხოლოდ key-ებით ვსარგებლობთ.
 */
export const PERMISSIONS = [
  // ── ვიდეო ──────────────────────────────────────────────────────
  { key: 'video.create', group: 'video', name: 'ვიდეოს ატვირთვა' },
  { key: 'video.update', group: 'video', name: 'ვიდეოს რედაქტირება' },
  { key: 'video.delete', group: 'video', name: 'ვიდეოს წაშლა' },
  { key: 'video.publish', group: 'video', name: 'ვიდეოს გამოქვეყნება' },

  // ── ჩატი ───────────────────────────────────────────────────────
  { key: 'chat.view', group: 'chat', name: 'ჩატების ნახვა' },
  { key: 'chat.reply', group: 'chat', name: 'ჩატში პასუხი' },
  { key: 'chat.assign', group: 'chat', name: 'ჩატის მიბმა ოპერატორზე' },

  // ── ვიდეო ვიზიტი ───────────────────────────────────────────────
  // ჩანიშვნა ადმინსაც შეუძლია; თავად შეხვედრას მხოლოდ Super Admin
  // ატარებს, ამიტომ „ატარებს" უფლება აქ განზრახ არ არის — ის როლზეა
  // მიბმული და პანელიდან ვერავის გადაეცემა.
  { key: 'video_visit.view', group: 'video_visit', name: 'ვიდეო ჯავშნების ნახვა' },
  { key: 'video_visit.schedule', group: 'video_visit', name: 'ვიდეო ვიზიტის დანიშვნა' },

  // ── მედია ──────────────────────────────────────────────────────
  { key: 'media.view_private', group: 'media', name: 'კერძო ფაილების ნახვა' },
  { key: 'media.delete', group: 'media', name: 'ფაილის წაშლა' },

  // ── შეტყობინებები ──────────────────────────────────────────────
  { key: 'notification.send', group: 'notification', name: 'შეტყობინების გაგზავნა' },
  { key: 'sms.send', group: 'notification', name: 'SMS-ის გაგზავნა' },

  // ── გამოწერები ─────────────────────────────────────────────────
  { key: 'subscription.view', group: 'subscription', name: 'გამოწერების ნახვა' },
  { key: 'subscription.manage', group: 'subscription', name: 'გამოწერების მართვა' },

  // ── მომხმარებლები ──────────────────────────────────────────────
  { key: 'user.view', group: 'user', name: 'მომხმარებლების ნახვა' },
  { key: 'user.manage', group: 'user', name: 'ანგარიშების მართვა' },

  // ── ბავშვები ───────────────────────────────────────────────────
  { key: 'child.view', group: 'child', name: 'ბავშვის პროფილების ნახვა' },
  { key: 'child.manage', group: 'child', name: 'ბავშვის პროფილების მართვა' },

  // ── ადმინისტრირება ─────────────────────────────────────────────
  { key: 'admin.view', group: 'admin', name: 'სამართავ პანელზე წვდომა' },
  { key: 'admin.manage', group: 'admin', name: 'სისტემური პარამეტრების მართვა' },
  { key: 'audit.view', group: 'admin', name: 'ცვლილებების ისტორია' },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

/**
 * ნაგულისხმევი უფლებები როლების მიხედვით.
 *
 * SUPER_ADMIN აქ არ არის — მას ყველა უფლება კოდით აქვს, ბაზისგან
 * დამოუკიდებლად. ეს განზრახ არჩევანია: ახალი უფლების დამატებისას
 * მისი მიბმის დავიწყება Super Admin-ს ვერ შეზღუდავს.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  Exclude<UserRole, 'SUPER_ADMIN' | 'PARENT'>,
  PermissionKey[]
> = {
  // ოპერატორი: ჩატი და შეტყობინებები. კონტენტსა და გამოწერებს არ ეხება.
  OPERATOR: [
    'chat.view',
    'chat.reply',
    'child.view',
    'media.view_private',
    'notification.send',
    'admin.view',
  ],

  // ადმინი: კონტენტი, გამოწერები, სტატისტიკა.
  // ანგარიშების მართვა (user.manage) განზრახ არ აქვს — თორემ თავს
  // თვითონ აიმაღლებდა Super Admin-ად.
  ADMIN: [
    'video.create',
    'video.update',
    'video.delete',
    'video.publish',
    'chat.view',
    'chat.reply',
    'chat.assign',
    'video_visit.view',
    'video_visit.schedule',
    'media.view_private',
    'media.delete',
    'notification.send',
    'sms.send',
    'subscription.view',
    'subscription.manage',
    'user.view',
    'child.view',
    'child.manage',
    'admin.view',
  ],
};
