import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** multer-ის დროებითი საქაღალდე — საბოლოო ადგილს პროვაიდერი წყვეტს. */
const TMP_DIR = join(tmpdir(), 'askdrteo-uploads');
mkdirSync(TMP_DIR, { recursive: true });

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const VIDEO_ALLOWED = ['.mp4', '.mov', '.m4v'];
// 500 MB — ლოკალური დისკის ლიმიტი. Mux/Cloudflare-ზე გადასვლისას
// ფაილი საერთოდ აღარ გაივლის ჩვენს სერვერზე.
const VIDEO_MAX_BYTES = 500 * 1024 * 1024;

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('avatar')
  @ApiOperation({
    summary: 'ავატარის ატვირთვა',
    description:
      'ფაილი ლოკალურ დისკზე ინახება. პროდაქშენზე ეს ადგილი S3-ით ჩანაცვლდება — ' +
      'გამომძახებელი კოდი მხოლოდ დაბრუნებულ URL-ს იყენებს, ამიტომ ცვლილება მასზე არ აისახება.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // multer მხოლოდ დროებით ინახავს; საბოლოო ადგილს პროვაიდერი წყვეტს
      storage: diskStorage({
        destination: TMP_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomBytes(16).toString('hex')}${ext}`);
        },
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED.includes(ext)) {
          cb(new BadRequestException('დაშვებულია მხოლოდ JPG, PNG და WEBP'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('ფაილი არ არის მიმაგრებული');
    return this.media.uploadImage(file, userId);
  }

  @Post('video')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'ვიდეოს ატვირთვა და Video ჩანაწერის შექმნა',
    description: 'აბრუნებს videoId-ს, რომელიც სიახლეს მიება.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: TMP_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomBytes(16).toString('hex')}${ext}`);
        },
      }),
      limits: { fileSize: VIDEO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!VIDEO_ALLOWED.includes(ext)) {
          cb(new BadRequestException('დაშვებულია მხოლოდ MP4 და MOV'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadVideo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('ფაილი არ არის მიმაგრებული');
    return this.media.createVideoFromUpload(file, title, userId);
  }
}
