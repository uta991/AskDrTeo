import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ToggleChecklistDto } from './dto/guide.dto';
import { GuidesService } from './guides.service';

/**
 * გზამკვლევები პრემიუმ პაკეტშია — SOS-ის გარდა, რომელიც ყველას აქვს.
 *
 * წვდომას სერვისი წყვეტს და არა დეკორატორი: გამონაკლისი თავად
 * გზამკვლევის თვისებაა და არა მისამართის.
 */
@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}

  @Get()
  @ApiOperation({ summary: 'გზამკვლევების სია' })
  list() {
    return this.guides.list();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'ერთი გზამკვლევი — ჩეკლისტის მონიშვნებით' })
  findOne(@Param('slug') slug: string, @CurrentUser('id') userId: string) {
    return this.guides.findOne(slug, userId);
  }

  @Patch(':slug/checklist')
  @ApiOperation({ summary: 'ჩეკლისტის პუნქტის მონიშვნა' })
  toggle(
    @Param('slug') slug: string,
    @Body() dto: ToggleChecklistDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.guides.toggle(slug, dto.itemKey, dto.done, userId);
  }
}
