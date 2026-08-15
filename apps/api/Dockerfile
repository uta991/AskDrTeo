# Backend-ის კონტეინერი Railway-სთვის.
#
# Dockerfile განზრახ ავირჩიეთ ავტომატური აღმოჩენის ნაცვლად: monorepo-ში
# ორი აპლიკაციაა და build-ს ზუსტად უნდა ეთქვას, რომელი ააწყოს.

# ─── 1. დამოკიდებულებები და build ────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma-ს alpine-ზე OpenSSL სჭირდება
RUN apk add --no-cache openssl

# ჯერ მხოლოდ manifest-ები — კოდის ცვლილება npm ci-ს ქეშს არ ამტვრევს
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/

# --ignore-scripts — მობილურის ნატიური სკრიპტები სერვერზე ზედმეტია
RUN npm ci --ignore-scripts --workspace=@baby/api --include-workspace-root

COPY apps/api apps/api

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
 && npm run build --workspace=@baby/api

# ─── 2. გასაშვები ხატი ───────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json package.json
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/apps/api/prisma apps/api/prisma

WORKDIR /app/apps/api

# Railway PORT-ს თავად აყენებს; 3000 მხოლოდ ლოკალური გაშვებისთვისაა
EXPOSE 3000

# მიგრაცია ყოველ გაშვებაზე — ახალი ვერსიის deploy ბაზასაც აახლებს.
# `migrate deploy` (და არა `dev`) — პროდაქშენში ახალ მიგრაციას არ ქმნის.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
