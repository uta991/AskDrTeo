# Baby Pediatry

მშობლებისთვის განკუთვნილი პედიატრიული აპლიკაცია — ვიდეო ბიბლიოთეკა,
კონსულტანტთან ჩატი და გამოწერის პაკეტები.

არქიტექტურის სრული აღწერა: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## სტრუქტურა

```
apps/api      NestJS + PostgreSQL + Prisma
apps/mobile   React Native + Expo
apps/admin    Next.js (მე-2 ეტაპი)
```

---

## გაშვება

### 1. მოთხოვნები
- Node.js 20+
- PostgreSQL 15+
- Expo Go (ტელეფონზე) ან iOS/Android სიმულატორი

### 2. დამოკიდებულებები
```bash
npm install
```

### 3. Backend
```bash
cd apps/api
cp .env.example .env          # შეავსე DATABASE_URL და JWT_ACCESS_SECRET
npx prisma migrate dev        # ბაზის შექმნა
npm run prisma:seed           # პაკეტები, ფუნქციები, კატეგორიები
npm run start:dev
```

> **ამ კომპიუტერზე უკვე მოწყობილია.** PostgreSQL 17 დაინსტალირებულია
> Homebrew-ით და ავტომატურად ეშვება სისტემის ჩართვისას:
> ```bash
> brew services start postgresql@17   # თუ გაჩერებულია
> psql -d baby_pediatry               # ბაზასთან პირდაპირი წვდომა
> ```
> `.env` შევსებულია, მიგრაცია და seed გაშვებულია (30 ცხრილი).
> სატესტო ანგარიში: `nino@example.ge` / `Test1234`

API: `http://localhost:3000/api/v1`
Swagger: `http://localhost:3000/api/v1/docs`

> `SMS_PROVIDER=console` რეჟიმში SMS არ იგზავნება — დადასტურების კოდი
> backend-ის ტერმინალში იბეჭდება. ეს საკმარისია განვითარებისთვის.

### 4. Mobile
```bash
cd apps/mobile
npm start
```

> ფიზიკურ ტელეფონზე `localhost` არ იმუშავებს. `app.json`-ში
> `extra.apiUrl` შეცვალე კომპიუტერის ლოკალურ IP-ზე, მაგ:
> `http://192.168.1.10:3000/api/v1`

---

## ავტორიზაციის ნაკადი

```
რეგისტრაცია → SMS კოდი → დადასტურება → ტოკენები → მთავარი ეკრანი
                                ↑
შესვლა (დაუდასტურებელი ნომერი) ─┘

პაროლის დავიწყება → SMS კოდი → ახალი პაროლი → ყველა სესია უქმდება
```

### უსაფრთხოების გადაწყვეტილებები

| გადაწყვეტილება | რატომ |
|---|---|
| პაროლი — argon2id | bcrypt-ზე მედეგია GPU-შეტევის მიმართ |
| Refresh token — შემთხვევითი, ბაზაში hash-ით | ბაზის გაჟონვისას მოქმედი ტოკენი არავის რჩება |
| Refresh-ის როტაცია | მოპარული ტოკენი ერთჯერადად თუ გამოიყენება, ჩანს |
| JWT ვალიდაცია სესიის შემოწმებით | logout და ბლოკირება მაშინვე მოქმედებს |
| Login-ის ერთი შეტყობინება | არ ვამხელთ, ანგარიში არსებობს თუ პაროლია არასწორი |
| OTP — hash-ით, 5 წთ, 5 მცდელობა, 60 წმ cooldown | brute-force და SMS-ის ხარჯის კონტროლი |
| Rate limit ყველა auth ენდპოინტზე | ავტომატური შეტევების შეზღუდვა |

---

## სოციალური ავტორიზაცია

### Apple ID
სრულად ჩართულია. Backend `identityToken`-ს ამოწმებს Apple-ის JWKS-ით
(ხელმოწერა + `iss` + `aud`) — კლიენტისგან მოსულ ველებს არ ენდობა.

1. Apple Developer → Identifiers → აპლიკაციის Bundle ID → ჩართე **Sign In with Apple**
2. `.env`: `APPLE_CLIENT_IDS="ge.babycare.app"`
3. მუშაობს მხოლოდ iOS 13+-ზე. ღილაკი ავტომატურად იმალება სხვაგან

> Apple სახელს **მხოლოდ პირველი** ავტორიზაციისას აბრუნებს და მხოლოდ კლიენტს.
> თუ ტესტირებისას ანგარიშს წაშლი, სახელი აღარ მოვა — გამორთე აპისთვის წვდომა:
> Settings → Apple ID → Sign in with Apple → აპი → Stop Using.

> „Hide My Email" რეჟიმში მისამართი `@privaterelay.appleid.com`-ია.
> ასეთ მისამართზე არსებულ ანგარიშთან შერწყმას **არ** ვახდენთ — თორემ
> სხვისი ანგარიშის მითვისება გახდებოდა შესაძლებელი.

### Google
კოდი მზადაა ორივე მხარეს, დარჩა client ID-ების შევსება:

1. Google Cloud Console → OAuth client ID: iOS, Android და Web
2. `apps/mobile/app.json` → `extra.googleClientIds`
3. `apps/api/.env` → `GOOGLE_CLIENT_IDS` (სამივე, მძიმით)

სანამ ველები ცარიელია, ღილაკი ჩანს და გასაგებ შეტყობინებას აჩვენებს.

---

## API ენდპოინტები (auth)

| მეთოდი | გზა | აღწერა |
|---|---|---|
| POST | `/auth/register` | რეგისტრაცია, აგზავნის SMS კოდს |
| POST | `/auth/verify-otp` | კოდის დადასტურება → ტოკენები |
| POST | `/auth/resend-otp` | კოდის ხელახლა გაგზავნა |
| POST | `/auth/login` | შესვლა ელ. ფოსტით ან ტელეფონით |
| POST | `/auth/google` | შესვლა Google-ით |
| POST | `/auth/apple` | შესვლა Apple ID-ით |
| POST | `/auth/refresh` | ტოკენის განახლება |
| POST | `/auth/forgot-password` | აღდგენის კოდის გამოთხოვა |
| POST | `/auth/reset-password` | ახალი პაროლის დაყენება |
| POST | `/auth/change-password` | პაროლის შეცვლა (ავტორიზებული) |
| POST | `/auth/logout` | მიმდინარე სესიიდან გასვლა |
| POST | `/auth/logout-all` | ყველა მოწყობილობიდან გასვლა |
| GET | `/auth/me` | მიმდინარე მომხმარებელი |

## API ენდპოინტები (მომხმარებელი)

| მეთოდი | გზა | აღწერა |
|---|---|---|
| GET | `/me/entitlements` | ჩემი უფლებები პაკეტის მიხედვით |
| GET | `/plans` | აქტიური პაკეტები (საჯარო) |
| GET/POST/PATCH/DELETE | `/children` | ბავშვის პროფილები (`max_children` ლიმიტით) |

## API ენდპოინტები (ადმინი)

`ADMIN` და `SUPER_ADMIN`:

| მეთოდი | გზა | აღწერა |
|---|---|---|
| GET | `/admin/users` | სია — ჩანს ვის რა პაკეტი აქვს |
| GET | `/admin/users?planCode=premium` | ფილტრი პაკეტით |
| GET | `/admin/users?search=&role=&status=` | ძებნა და ფილტრები |
| GET | `/admin/users/:id` | დეტალები + ბავშვები + გამოწერების ისტორია |
| POST | `/admin/users/:id/grant-subscription` | პაკეტის გაცემა/შეცვლა |
| POST | `/admin/users/:id/cancel-subscription` | გაუქმება → უფასოზე დაბრუნება |
| PATCH | `/admin/users/:id/status` | ბლოკირება / განბლოკვა / წაშლა |

მხოლოდ `SUPER_ADMIN`:

| მეთოდი | გზა | აღწერა |
|---|---|---|
| POST | `/admin/users/staff` | ოპერატორის/ადმინის/super admin-ის შექმნა |
| PATCH | `/admin/users/:id/role` | როლის შეცვლა |
| GET | `/admin/users/audit-logs` | ვინ რა შეცვალა |
| GET/POST/PATCH | `/admin/plans` | პაკეტების და ფასების მართვა |
| GET/POST/PATCH | `/admin/plans/features` | ფუნქციების კატალოგი |
| PATCH | `/admin/plans/:id/publish` \| `/default` \| `/archive` | სტატუსები |

### უფლებების საზღვრები

| წესი | რატომ |
|---|---|
| როლების მართვა მხოლოდ SUPER_ADMIN-ს | თორემ ADMIN საკუთარ თავს აიმაღლებდა |
| ბოლო SUPER_ADMIN-ის ჩამოქვეითება/დაბლოკვა აკრძალულია | სისტემა უმართავი დარჩებოდა |
| საკუთარი როლის/სტატუსის შეცვლა აკრძალულია | თვითდაბლოკვის თავიდან აცილება |
| როლის ცვლილებისას ყველა სესია უქმდება | ძველი ტოკენი ძველ უფლებებს ატარებს |
| პაკეტის გაუქმებისას → ნაგულისხმევი პაკეტი | მომხმარებელი უპაკეტოდ არ რჩება |
