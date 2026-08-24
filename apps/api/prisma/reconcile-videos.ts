import { MediaSource, MediaStatus, MediaType, MediaVisibility, PrismaClient, StorageProvider } from '@prisma/client';

/**
 * ვიდეოების შეჯერება Bunny-სთან.
 *
 * webhook ერთადერთი გზაა, რომლითაც ვიგებთ, რომ გადაშიფვრა დასრულდა.
 * თუ ის არ მოვიდა (მისამართი არ იყო მითითებული, სერვისი ეძინა), ვიდეო
 * სამუდამოდ „მუშავდება" რჩება — Bunny-ში კი დიდი ხნის მზადაა.
 *
 * ეს სკრიპტი პირდაპირ Bunny-ს ეკითხება და ბაზას ასწორებს: მზა ვიდეოს
 * READY უყენებს, ხოლო ფაილს მოწყვეტილ ჩანაწერს სათაურით პოულობს და
 * უბრუნებს. უსაფრთხოა — ხელახლა გაშვება არაფერს აფუჭებს.
 */

const prisma = new PrismaClient();

const LIBRARY = process.env.BUNNY_LIBRARY_ID!;
const KEY = process.env.BUNNY_API_KEY!;
const CDN = process.env.BUNNY_CDN_HOST;

/** Bunny-ს სტატუსები: 3 და 4 = დამუშავებული. */
const READY_STATUSES = [3, 4];

interface BunnyVideo {
  guid: string;
  title: string;
  status: number;
  length: number;
  width: number;
  height: number;
  storageSize: number;
  thumbnailFileName?: string;
}

async function bunnyVideos(): Promise<BunnyVideo[]> {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY}/videos?page=1&itemsPerPage=100`,
    { headers: { AccessKey: KEY, accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`Bunny დააბრუნა ${res.status}`);

  const data = (await res.json()) as { items: BunnyVideo[] };
  return data.items ?? [];
}

async function main(): Promise<void> {
  const remote = await bunnyVideos();
  console.log(`Bunny-ში ${remote.length} ვიდეოა\n`);

  const byGuid = new Map(remote.map((video) => [video.guid, video]));
  const byTitle = new Map(remote.map((video) => [video.title.trim(), video]));

  const videos = await prisma.video.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      mediaAssetId: true,
      mediaAsset: { select: { id: true, status: true, storageKey: true, playbackId: true } },
    },
  });

  let fixed = 0;
  let linked = 0;

  for (const video of videos) {
    const asset = video.mediaAsset;

    // ფაილი მიბმულია — მხოლოდ სტატუსს ვასწორებთ
    if (asset) {
      const match = byGuid.get(asset.playbackId ?? asset.storageKey);
      if (!match || !READY_STATUSES.includes(match.status)) continue;
      if (asset.status === MediaStatus.READY) continue;

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: MediaStatus.READY,
          duration: match.length || null,
          width: match.width || null,
          height: match.height || null,
          failureReason: null,
        },
      });

      console.log(`✓ „${video.title}" — მუშავდებოდან მზადაზე`);
      fixed += 1;
      continue;
    }

    // ფაილი მოწყვეტილია — სათაურით ვპოულობთ და ვაბრუნებთ
    const match = byTitle.get(video.title.trim());
    if (!match || !READY_STATUSES.includes(match.status)) {
      console.log(`— „${video.title}" — Bunny-ში ვერ მოიძებნა`);
      continue;
    }

    const created = await prisma.mediaAsset.create({
      data: {
        type: MediaType.VIDEO,
        source: MediaSource.ADMIN,
        visibility: MediaVisibility.PRIVATE,
        status: MediaStatus.READY,
        provider: StorageProvider.BUNNY,
        storageKey: match.guid,
        playbackId: match.guid,
        mimeType: 'video/mp4',
        sizeBytes: match.storageSize || null,
        duration: match.length || null,
        width: match.width || null,
        height: match.height || null,
        publicUrl:
          CDN && match.thumbnailFileName
            ? `https://${CDN}/${match.guid}/${match.thumbnailFileName}`
            : null,
      },
      select: { id: true },
    });

    await prisma.video.update({
      where: { id: video.id },
      data: { mediaAssetId: created.id },
    });

    console.log(`✓ „${video.title}" — ფაილი დაუბრუნდა`);
    linked += 1;
  }

  console.log(`\nსტატუსი გასწორდა: ${fixed} | ფაილი დაუბრუნდა: ${linked}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
