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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '@/common/decorators/current-user.decorator';
import { ChildrenService } from './children.service';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';

@ApiTags('children')
@Controller('children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი ბავშვების პროფილები' })
  list(@CurrentUser() viewer: AuthenticatedUser) {
    return this.children.list(viewer.id, viewer);
  }

  @Post()
  @ApiOperation({
    summary: 'ახალი პროფილი',
    description: 'რაოდენობის ლიმიტი პაკეტიდან მოდის (max_children).',
  })
  create(@CurrentUser() viewer: AuthenticatedUser, @Body() dto: CreateChildDto) {
    return this.children.create(viewer.id, dto, viewer);
  }

  @Patch(':id')
  update(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.children.update(viewer.id, id, dto, viewer);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.children.remove(userId, id);
  }
}
