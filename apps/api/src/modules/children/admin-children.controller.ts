import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ChildrenService } from './children.service';

export class ListChildrenQueryDto {
  /**
   * თავისუფალი ძებნა: ბავშვის, დედის, მამის ან ანგარიშის სახელი/გვარი,
   * რეგისტრაციის ტელეფონი და ელ. ფოსტა.
   */
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  /** ბავშვის დაბადების თარიღი — YYYY-MM-DD ან ISO */
  @IsOptional() @IsDateString()
  birthDate?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;
}

/**
 * ბავშვების პროფილები პერსონალისთვის.
 *
 * ოპერატორსაც სჭირდება — კონსულტაციისას ბავშვის ასაკი და ეტაპი
 * მისი მუშაობის საფუძველია. ამიტომ სამივე როლს აქვს წვდომა.
 *
 * მშობლების ბოლო სახელები და ტელეფონი განზრახ ჩანს: ოპერატორმა
 * ჩატში მიმართვისას უნდა იცოდეს, ვისთან საუბრობს.
 */
@ApiTags('admin/children')
@Roles(UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/children')
export class AdminChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @ApiOperation({ summary: 'ყველა ბავშვის პროფილი მშობლის მონაცემებთან ერთად' })
  list(@Query() query: ListChildrenQueryDto) {
    return this.children.listAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.children.findForStaff(id);
  }
}
