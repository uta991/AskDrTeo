# Baby Pediatry — სისტემის არქიტექტურა

ეს დოკუმენტი არის პროექტის ერთადერთი „წყარო“. კოდის წერამდე აქ ფიქსირდება
სტრუქტურა, რომ მერე გადაკეთება მინიმალური იყოს.

---

## 1. ტექნოლოგიური სტეკი

| ფენა | ტექნოლოგია | რატომ |
|---|---|---|
| Mobile | React Native + Expo (TypeScript) | ერთი კოდი iOS + Android, სწრაფი OTA განახლება |
| Backend | NestJS (TypeScript) | მოდულური, DI, დიდი სისტემისთვის შენარჩუნებადი |
| DB | PostgreSQL + Prisma | მკაცრი სქემა, მიგრაციები, ტიპები |
| Cache / Queue | Redis + BullMQ | სესიები, rate-limit, SMS/Push რიგები |
| Realtime | Socket.IO (NestJS Gateway) | ჩატი |
| Video | Mux ან Cloudflare Stream | HLS, adaptive bitrate, signed URL |
| ფაილები | S3-თავსებადი (avatar, chat attachment) | იაფი, CDN-ის უკან |
| Web / Admin | Next.js (App Router) | იმავე backend-ზე, მე-2 ეტაპზე |

**კრიტიკული წესი:** ვიდეო არასდროს ინახება backend სერვერზე. Backend მხოლოდ
მეტამონაცემებს ინახავს და ხელმოწერილ playback token-ს გასცემს.

---

## 2. Monorepo სტრუქტურა

```
baby-pediatry/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── common/      # guards, filters, decorators, pipes
│   │       ├── config/
│   │       └── modules/     # იხ. თავი 3
│   ├── mobile/              # React Native + Expo
│   │   └── src/
│   │       ├── app/         # expo-router ეკრანები
│   │       ├── components/
│   │       ├── features/    # auth, videos, chat, subscription, profile
│   │       ├── theme/       # ფერები, ტიპოგრაფია, spacing
│   │       ├── api/         # generated client + react-query hooks
│   │       └── store/
│   └── admin/               # Next.js (მე-2 ეტაპი)
├── packages/
│   ├── shared-types/        # API DTO-ები ორივესთვის
│   └── config/              # eslint, tsconfig, prettier
└── docs/
```

---

## 3. Backend მოდულები

| მოდული | პასუხისმგებლობა |
|---|---|
| `auth` | რეგისტრაცია, login, JWT + refresh, Google/Apple, OTP, პაროლის აღდგენა |
| `users` | პროფილი, როლები, ბლოკირება, წაშლა |
| `children` | ბავშვის პროფილები |
| `entitlements` | **წვდომის გამომთვლელი ძრავა** — იხ. თავი 4 |
| `plans` | Feature, Plan, PlanPrice, PlanFeature CRUD (Super Admin) |
| `subscriptions` | გამოწერის სასიცოცხლო ციკლი, ვადის გასვლა, cron |
| `payments` | ჩარჩო + webhook handler (provider მოგვიანებით) |
| `videos` | კატალოგი, კატეგორიები, ძებნა, playback token, progress |
| `chat` | Conversation, Message, WebSocket gateway, ოპერატორზე მიბმა |
| `notifications` | Push (Expo/FCM), in-app, შაბლონები |
| `sms` | SMS provider adapter + რიგი + ლოგი |
| `media` | Upload URL გენერაცია, ავატარები, attachment-ები |
| `audit` | ინტერცეპტორი — ავტომატურად წერს ყველა ადმინის ცვლილებას |
| `admin` | აგრეგირებული ადმინ-ენდპოინტები, დაშბორდის სტატისტიკა |
| `settings` | AppSetting, maintenance mode, min app version |

---

## 4. წვდომის მოდელი — რატომ არ არის პაკეტები კოდში

კოდი **არასდროს** ამბობს `if (plan === 'premium')`. სამაგიეროდ:

```
Feature (კატალოგი)  ──┐
                      ├──> PlanFeature ──> Plan ──> Subscription ──> User
Plan (პაკეტი)       ──┘
```

მოთხოვნისას `EntitlementsService` აგროვებს მომხმარებლის აქტიური გამოწერის
ყველა `PlanFeature`-ს და აბრუნებს რუკას (იქვე Redis-ში ქეშირდება):

```ts
// კოდში მხოლოდ ასე
@RequireFeature('chat_with_operator')
@Get('conversations')
async list() { ... }

// ან სერვისში
const max = await entitlements.limit(userId, 'max_children'); // "3" | "unlimited"
```

**შედეგი:** Super Admin ქმნის ახალ პაკეტს, ცვლის ფასს, რთავს/თიშავს ფუნქციას —
პროგრამისტი და ახალი deploy არ სჭირდება.

### ვიდეოზე წვდომა
`Video.accessType` განსაზღვრავს წესს:
- `FREE` — ყველასთვის
- `AUTHENTICATED` — ავტორიზებულს
- `SUBSCRIPTION` — ნებისმიერი აქტიური ფასიანი გამოწერით
- `SPECIFIC_PLANS` — მხოლოდ `VideoPlanAccess`-ში ჩამოთვლილი პაკეტებით

დახურული ვიდეო კატალოგში **ჩანს** (thumbnail + აღწერა), მაგრამ playback token
არ გაიცემა — მომხმარებელი ხედავს paywall-ს. ეს კონვერსიისთვის მუშაობს.

---

## 5. საწყისი ფუნქციების კატალოგი (seed)

| key | ტიპი | აღწერა |
|---|---|---|
| `video_library` | ACCESS | ვიდეო ბიბლიოთეკა |
| `video_download` | BOOLEAN | ოფლაინ ჩამოტვირთვა |
| `chat_with_operator` | BOOLEAN | ჩატი კონსულტანტთან |
| `chat_priority` | BOOLEAN | პრიორიტეტული პასუხი |
| `max_children` | LIMIT | ბავშვის პროფილების რაოდენობა |
| `growth_tracking` | BOOLEAN | წონა/სიმაღლის დინამიკა |
| `vaccination_calendar` | BOOLEAN | აცრების კალენდარი |
| `ad_free` | BOOLEAN | რეკლამის გარეშე |

---

## 6. როლები

| როლი | უფლებები |
|---|---|
| **Parent** | თავისი პროფილი, ბავშვები, ვიდეო (გამოწერის მიხედვით), ჩატი |
| **Operator** | მიბმული ჩატები, მშობლის საბაზისო ინფო. კონტენტს/პაკეტებს ვერ ცვლის |
| **Admin** | ვიდეოები, კატეგორიები, მომხმარებლები, გამოწერის ხელით გაცემა, შეტყობინებები |
| **Super Admin** | ყველაფერი + Plan/Feature/Price, ადმინების მართვა, Audit Log, პარამეტრები |

---

## 7. ვიზუალური იდენტობა

- ძირითადი ფონი: თეთრი + ძალიან ღია ცისფერი (`#EAF4FF` → `#FFFFFF` გრადიენტი)
- აქცენტი: ცისფერი (`#3B82F6` → `#2563EB`)
- ზედა background: მსუბუქი ცის ეფექტი, რბილი ღრუბლები, დეკორატიული მტრედები
- ფორმა: დიდი რადიუსი (16–24px), რბილი ჩრდილები, დიდი მკაფიო ღილაკები
- განცდა: სისუფთავე, უსაფრთხოება, სიმშვიდე — არა ბავშვური, არა გადატვირთული
- ტიპოგრაფია: ქართული ვებ-ფონტი (BPG Nino Mtavruli / Noto Sans Georgian)
- იგივე სტილი გადადის Web-ზეც, რომ ერთ ბრენდად აღიქმებოდეს

---

## 8. ეტაპები

**ეტაპი 1 — Mobile + Backend**
1. ✅ DB სქემა და მოდულების სტრუქტურა
2. ✅ Auth backend (რეგისტრაცია, login, OTP, refresh, Google)
3. ✅ Mobile: თემა + Login / Registration / OTP / პაროლის აღდგენა
4. Plans/Entitlements (`@RequireFeature` guard) — seed უკვე მზადაა
5. ვიდეო კატალოგი + player + progress
6. ჩატი (realtime)
7. Push + SMS
8. Admin-ის საბაზისო ენდპოინტები + Audit Log

**ეტაპი 2 — Web / Admin Panel** (იმავე backend-ზე)

**ეტაპი 3 — Payment provider-ის ჩართვა** (ჩარჩო უკვე ჩადებულია)
