import { Module } from '@nestjs/common';
import { AdminChildrenController } from './admin-children.controller';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';

@Module({
  controllers: [ChildrenController, AdminChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
