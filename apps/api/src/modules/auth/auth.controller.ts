import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { SessionContext } from './tokens.service';
import {
  AppleAuthDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResendLoginCodeDto,
  ResendOtpDto,
  SendPhoneCodeDto,
  VerifyLoginCodeDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'რეგისტრაცია — აგზავნის SMS კოდს ნომრის დასადასტურებლად' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, this.ctx(req));
  }

  @Public()
  @Post('send-phone-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ნომრის დადასტურების კოდის გაგზავნა ანგარიშის შექმნამდე',
    description: 'რეგისტრაციის ფორმა კოდს ადგილზე ითხოვს — ცალკე გვერდი აღარ სჭირდება.',
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendPhoneCode(@Body() dto: SendPhoneCodeDto) {
    return this.auth.sendPhoneCode(dto.phone);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'კოდის დადასტურება — აქტივაცია და ტოკენების გაცემა' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.auth.verifyPhone(dto, this.ctx(req));
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.destination, dto.purpose);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'შესვლა ელ. ფოსტით ან ტელეფონით' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, this.ctx(req));
  }

  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'შესვლის მეორე საფეხური — SMS კოდის დადასტურება',
    description: 'ტოკენები მხოლოდ აქ გაიცემა. `rememberDevice` 30 დღით იმახსოვრებს მოწყობილობას.',
  })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyLoginCode(@Body() dto: VerifyLoginCodeDto, @Req() req: Request) {
    return this.auth.verifyLoginCode(
      dto.challengeId,
      dto.code,
      this.ctx(req),
      dto.rememberDevice ?? false,
    );
  }

  @Public()
  @Post('login/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'შესვლის კოდის ხელახლა გაგზავნა' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendLoginCode(@Body() dto: ResendLoginCodeDto) {
    return this.auth.resendLoginCode(dto.challengeId);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'შესვლა Google-ით (idToken მობილურიდან)' })
  google(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.auth.loginWithGoogle(dto, this.ctx(req));
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'შესვლა Apple ID-ით (identityToken მობილურიდან)' })
  apple(@Body() dto: AppleAuthDto, @Req() req: Request) {
    return this.auth.loginWithApple(dto, this.ctx(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ტოკენის განახლება (refresh-ის როტაციით)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, this.ctx(req));
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('sessionId') sessionId: string) {
    return this.auth.logout(sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser('id') userId: string) {
    return this.auth.logoutAll(userId);
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  private ctx(req: Request): SessionContext {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
