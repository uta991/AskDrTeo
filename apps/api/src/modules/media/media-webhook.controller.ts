import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { MediaWebhookService, type BunnyWebhookPayload } from './media-webhook.service';

/**
 * პროვაიდერების webhook-ები.
 *
 * `@Public` — Bunny ჩვენს JWT-ს არ ატარებს. ავთენტიფიკაცია საიდუმლოთი
 * ხდება, რომელიც webhook-ის მისამართშია ჩაშენებული.
 *
 * Swagger-ში არ ჩანს: ეს ენდპოინტი მხოლოდ პროვაიდერისთვისაა.
 */
@ApiExcludeController()
@Controller('webhooks')
export class MediaWebhookController {
  constructor(private readonly webhooks: MediaWebhookService) {}

  @Public()
  @Post('bunny')
  @HttpCode(HttpStatus.OK)
  // ვიწრო ლიმიტი — webhook-ის მისამართი საჯაროა და დატვირთვას ექვემდებარება
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async bunny(
    @Body() payload: BunnyWebhookPayload,
    @Query('secret') querySecret: string | undefined,
    @Headers('x-webhook-secret') headerSecret: string | undefined,
  ) {
    // Bunny მომხმარებლის მიერ განსაზღვრულ header-ს ყოველთვის არ უჭერს
    // მხარს, ამიტომ query-ც დაშვებულია — ორივე ერთსა და იმავე საიდუმლოს
    // ამოწმებს მუდმივი დროით
    this.webhooks.assertAuthentic(headerSecret ?? querySecret);

    // ყოველთვის 200 — შეცდომაზე Bunny მოვლენას ხელახლა აგზავნის და
    // იმავე შედეგს მიიღებდა. დამუშავების შედეგი ტვირთშია.
    return this.webhooks.handleBunny(payload);
  }
}
