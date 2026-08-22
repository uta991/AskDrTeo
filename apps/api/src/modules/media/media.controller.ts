import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { UploadPolicyService } from './upload-policy.service';
import { MediaCleanupService } from './media-cleanup.service';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';

/** multer-ის დროებითი საქაღალდე — საბოლოო ადგილს პროვაიდერი წყვეტს. */
const TMP_DIR = join(tmpdir(), 'askdrteo-uploads');
mkdirSync(TMP_DIR, { recursive: true });

/**
 * multer-ის ჭერი სტატიკურია, ჩვენი ლიმიტი კი პაკეტზეა დამოკიდებული.
 * აქ მხოლოდ აბსოლუტურ მაქსიმუმს ვზღუდავთ, რომ დისკი არ გადაივსოს —
 * რეალურ შემოწმებას UploadPolicyService აკეთებს ჩაწერის შემდეგ.
 */
function tempStorage() {
  return diskStorage({
    destination: TMP_DIR,
    filename: (_req, file, cb) => {
      // ორიგინალი სახელი არ გამოიყენება — path traversal-ის რისკია
      cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly policy: UploadPolicyService,
    private readonly cleanup: MediaCleanupService,
  ) {}

  @Post('purge')
  @RequirePermission('media.delete')
  @ApiOperation({
    summary: 'გაწმენდის ხელით გაშვება',
    description:
      'ჩვეულებრივ ავტომატურად მუშაობს 10 წუთში ერთხელ. ' +
      'ეს ენდპოინტი დიაგნოსტიკისა და ხელით გაშვებისთვისაა.',
  })
  runCleanup() {
    return this.cleanup.purgeBatch();
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'სურათის ატვირთვა',
    description: 'ლიმიტი პაკეტიდან მოდის (max_upload_mb_image).',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tempStorage(),
      limits: { fileSize: UploadPolicyService.maxBytesFor('image') },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('ფაილი არ არის მიმაგრებული');

    await this.policy.assertAllowed(file, 'image', actor);
    return this.media.uploadImage(file, actor.id);
  }

  @Post('video')
  @ApiOperation({
    summary: 'ვიდეოს ატვირთვა',
    description:
      'უფლება როლიდან, ლიმიტი პაკეტიდან (max_upload_mb_video). ' +
      'აბრუნებს videoId-ს, რომელიც სიახლეს მიება.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tempStorage(),
      limits: { fileSize: UploadPolicyService.maxBytesFor('video') },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('ფაილი არ არის მიმაგრებული');

    await this.policy.assertAllowed(file, 'video', actor);
    return this.media.createVideoFromUpload(file, title, actor.id);
  }

  @Post('chat-attachment')
  @ApiOperation({
    summary: 'ჩატის დანართი',
    description: 'ფაილი კერძოა — ბმული ხელმოწერით გაიცემა.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tempStorage(),
      // ვიდეოს ჭერი უფრო მაღალია — მშობელი ხშირად კადრს იღებს ადგილზე
      limits: { fileSize: UploadPolicyService.maxBytesFor('video') },
    }),
  )
  async uploadChatAttachment(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('ფაილი არ არის მიმაგრებული');

    const kind = file.mimetype.startsWith('video/') ? 'video' : 'image';
    await this.policy.assertAllowed(file, kind, actor);

    return this.media.uploadChatAttachment(file, actor.id);
  }
}
