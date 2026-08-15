import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { FeatureGuard } from './common/guards/feature.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { ChildrenModule } from './modules/children/children.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { MediaModule } from './modules/media/media.module';
import { NewsModule } from './modules/news/news.module';
import { PromoModule } from './modules/promo/promo.module';
import { StatsModule } from './modules/stats/stats.module';
import { StorageModule } from './modules/storage/storage.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PlansModule } from './modules/plans/plans.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    EntitlementsModule,
    PermissionsModule,
    AuthModule,
    AdminUsersModule,
    PlansModule,
    ChildrenModule,
    StorageModule,
    MediaModule,
    NewsModule,
    PromoModule,
    StatsModule,
    SmsModule,
  ],
  providers: [
    // რიგი მნიშვნელოვანია: rate-limit → ავთენტიფიკაცია → როლი → პაკეტის ფუნქცია.
    // FeatureGuard ბოლოა, რადგან მას user უკვე დადგენილი სჭირდება.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
  ],
})
export class AppModule {}
