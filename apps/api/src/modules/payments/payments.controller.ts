import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/**
 * ბარათით გადახდა.
 *
 * ბანკის გასაღებები აქ არსად ჩანს — ბრაუზერს მხოლოდ გადახდის
 * გვერდის მისამართი უბრუნდება.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'ჩართულია თუ არა ბარათით გადახდა' })
  config() {
    return this.payments.config$();
  }

  @Get()
  @ApiOperation({ summary: 'ჩემი გადახდები' })
  history(@CurrentUser('id') userId: string) {
    return this.payments.history(userId);
  }

  @Post('tbc/create')
  @ApiOperation({ summary: 'გადახდის დაწყება — აბრუნებს ბანკის გვერდის მისამართს' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
    return this.payments.start(dto, userId);
  }

  @Get('tbc/:reference/status')
  @ApiOperation({ summary: 'გადახდის რეალური სტატუსი — სერვერი ბანკს ეკითხება' })
  status(@Param('reference') reference: string, @CurrentUser('id') userId: string) {
    return this.payments.status(reference, userId);
  }

  /**
   * ბანკის შეტყობინება. თავისთავად არაფერს ადასტურებს — მხოლოდ
   * შემოწმებას იწვევს, გადაწყვეტილებას ისევ ბანკის GET პასუხი იღებს.
   */
  @Post('tbc/callback')
  @Public()
  callback(
    @Body() body: Record<string, string> | undefined,
    @Query('PaymentId') queryPayId?: string,
  ) {
    const payId = body?.PaymentId ?? body?.paymentId ?? body?.payId ?? queryPayId;
    return this.payments.handleCallback(payId);
  }
}
