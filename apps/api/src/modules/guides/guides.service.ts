import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { GUIDES } from './content';
import { DISCLAIMER } from './types';

/**
 * მშობლის გზამკვლევები.
 *
 * ტექსტი კოდიდან მოდის, ბაზიდან კი მხოლოდ ის, რაც ოჯახზეა მიბმული:
 * ჩეკლისტის მონიშვნები. ასე გვერდი ბაზის დატვირთვის გარეშე იხსნება.
 */
@Injectable()
export class GuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** ხელმისაწვდომი გზამკვლევების სია — მენიუსა და ბადისთვის. */
  list() {
    return Object.values(GUIDES).map((guide) => ({
      slug: guide.slug,
      title: guide.title,
      intro: guide.intro,
      free: guide.free ?? false,
    }));
  }

  async findOne(slug: string, userId: string) {
    const guide = GUIDES[slug];
    if (!guide) throw new NotFoundException('გზამკვლევი ვერ მოიძებნა');

    await this.assertAccess(guide.free, userId);

    // ჩეკლისტი პირველ ბავშვზეა მიბმული — იმავე ლოგიკით, რითაც მთავარი ეკრანი
    const child = await this.firstChild(userId);

    const checked = guide.checklist && child ? await this.checkedKeys(child.id) : [];

    const videos = await this.prisma.videoCategory.findUnique({
      where: { slug: guide.videoCategorySlug },
      select: { slug: true, name: true, _count: { select: { videos: true } } },
    });

    return {
      slug: guide.slug,
      title: guide.title,
      intro: guide.intro,
      cards: guide.cards,
      checklist: guide.checklist?.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item, done: checked.includes(item.key) })),
      })),
      vaccines: guide.vaccines,
      childName: child?.firstName ?? null,
      // კატეგორია ცარიელი რომ იყოს, ბმულს აზრი არ აქვს
      videos:
        videos && videos._count.videos > 0
          ? { slug: videos.slug, name: videos.name, count: videos._count.videos }
          : null,
      disclaimer: DISCLAIMER,
    };
  }

  /** ერთი პუნქტის მონიშვნა ან მოხსნა. აბრუნებს ახალ მდგომარეობას. */
  async toggle(slug: string, itemKey: string, done: boolean, userId: string) {
    const guide = GUIDES[slug];
    if (!guide?.checklist) throw new NotFoundException('ამ გზამკვლევს ჩეკლისტი არ აქვს');

    const known = guide.checklist.some((group) =>
      group.items.some((item) => item.key === itemKey),
    );
    if (!known) throw new BadRequestException('უცნობი პუნქტი');

    await this.assertAccess(guide.free, userId);

    const child = await this.firstChild(userId);
    if (!child) throw new BadRequestException('ჯერ ბავშვის პროფილი დაამატეთ');

    const current = await this.checkedKeys(child.id);
    const next = done
      ? [...new Set([...current, itemKey])]
      : current.filter((key) => key !== itemKey);

    await this.prisma.travelChecklist.upsert({
      where: { childId: child.id },
      create: { childId: child.id, checked: next },
      update: { checked: next },
    });

    return { checked: next };
  }

  /** უფასო გზამკვლევს პაკეტი არ სჭირდება; დანარჩენს — `parent_guides`. */
  private async assertAccess(free: boolean | undefined, userId: string): Promise<void> {
    if (free) return;
    if (await this.entitlements.can(userId, 'parent_guides')) return;

    throw new ForbiddenException('ეს განყოფილება პრემიუმ პაკეტშია');
  }

  private async checkedKeys(childId: string): Promise<string[]> {
    const row = await this.prisma.travelChecklist.findUnique({
      where: { childId },
      select: { checked: true },
    });
    return row?.checked ?? [];
  }

  private firstChild(userId: string) {
    return this.prisma.child.findFirst({
      where: { parentId: userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true },
    });
  }
}
