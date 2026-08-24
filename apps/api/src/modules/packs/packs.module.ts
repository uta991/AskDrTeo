import { Global, Module } from '@nestjs/common';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';

// @Global — გადახდებსაც სჭირდება და ჩატსაც
@Global()
@Module({
  controllers: [PacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
