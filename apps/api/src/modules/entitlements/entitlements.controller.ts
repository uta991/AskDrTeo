import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { EntitlementsService } from './entitlements.service';

@ApiTags('entitlements')
@Controller('me/entitlements')
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get()
  @ApiOperation({
    summary: 'მიმდინარე მომხმარებლის უფლებები',
    description:
      'აპლიკაცია ამის მიხედვით მალავს/აჩვენებს ფუნქციებს. ' +
      'წვდომის ლოგიკა კლიენტში არ დუბლირდება — სერვერი აბრუნებს მზა პასუხს.',
  })
  get(@CurrentUser('id') userId: string) {
    return this.entitlements.resolve(userId);
  }
}
