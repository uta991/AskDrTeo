import type { ImageSourcePropType } from 'react-native';

/**
 * ფოტო-ასეტების ერთადერთი წერტილი.
 *
 * ეს სურათები ვექტორულად ვერ დაიხატება — ნამდვილი ფოტოებია.
 * ჩააგდე ფაილი `assets/images/`-ში და გახსენი შესაბამისი ხაზი:
 *
 *   heroBaby: require('../../assets/images/hero-baby.png'),
 *   doveLeft: require('../../assets/images/dove-left.png'),
 *   doveRight: require('../../assets/images/dove-right.png'),
 *
 * სანამ null-ია, კომპონენტები ვექტორულ ჩანაცვლებას ხატავენ —
 * აპლიკაცია არ ფუჭდება და განლაგება იგივე რჩება.
 *
 * რეკომენდებული ზომები (@3x):
 *   hero-baby   — 1200 × 900,  PNG გამჭვირვალე ან თეთრი ფონით
 *   dove-left   —  480 × 360,  PNG გამჭვირვალე ფონით
 *   dove-right  —  480 × 360,  PNG გამჭვირვალე ფონით
 */
export const images: {
  heroBaby: ImageSourcePropType | null;
  doveLeft: ImageSourcePropType | null;
  doveRight: ImageSourcePropType | null;
  /** სპეციალისტის პორტრეტი — რეგისტრაციის ეკრანის ავატარი */
  doctor: ImageSourcePropType;
} = {
  doctor: require('../../assets/images/doctor.png'),
  // ბავშვის ნაწილი ორიგინალიდან ჩამოჭრილია — ცისფერი ცა და მტრედები მოშორებულია
  heroBaby: require('../../assets/images/hero-baby.png'),
  // მტრედები იმავე ფოტოდანაა ამოჭრილი, ცა გამჭვირვალედ ქცეული
  doveLeft: require('../../assets/images/dove-left.png'),
  doveRight: require('../../assets/images/dove-right.png'),
};

/** ამოჭრილი ფაილების პროპორციები (სიმაღლე / სიგანე). */
export const imageRatios = {
  doveLeft: 430 / 340,
  doveRight: 278 / 390,
} as const;
