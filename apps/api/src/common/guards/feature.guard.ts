import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

const STAFF_ROLES: UserRole[] = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException('საჭიროა ავტორიზაცია');

    // პერსონალს გამოწერა არ სჭირდება — ისინი სისტემას ემსახურებიან
    if (STAFF_ROLES.includes(user.role)) return true;

    if (!(await this.entitlements.can(user.id, featureKey))) {
      throw new ForbiddenException({
        message: 'ეს ფუნქცია თქვენს პაკეტში არ შედის',
        requiredFeature: featureKey,
        upgradeRequired: true,
      });
    }

    return true;
  }
}
