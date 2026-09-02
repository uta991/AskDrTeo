import { apiFetchPublic } from './session';

/**
 * ონლაინ ვიზიტი ჩართულია თუ არა.
 *
 * გადამრთველი სერვერზეა, რომ საიტიც და აპლიკაციაც ერთსა და იმავეს
 * ეკითხებოდნენ — ორ ადგილას ცვლილება ადრე თუ გვიან ერთს დაავიწყდებოდა.
 *
 * გამორთვისას ჯავშანი ქრება, უკვე გაცემული დასკვნები კი რჩება:
 * ისინი სამედიცინო დოკუმენტია და სერვისის შეჩერებას არ უნდა გაჰყვეს.
 */
export async function videoVisitsEnabled(): Promise<boolean> {
  const config = await apiFetchPublic<{ enabled: boolean }>('/video-visits/config');
  return config?.enabled ?? false;
}
