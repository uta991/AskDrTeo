import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ChildrenService } from './children.service';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';

@ApiTags('children')
@Controller('children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი ბავშვების პროფილები' })
  list(@CurrentUser('id') userId: string) {
    return this.children.list(userId);
  }

  @Post()
  @ApiOperation({
    summary: 'ახალი პროფილი',
    description: 'რაოდენობის ლიმიტი პაკეტიდან მოდის (max_children).',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateChildDto) {
    return this.children.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.children.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.children.remove(userId, id);
  }
}
