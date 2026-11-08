import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule], // TokensService — როლის ცვლილებისას სესიების გასაუქმებლად
  controllers: [AdminUsersController, AccountController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
