import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * გვერდების პარამეტრები.
 *
 * `@Query('page') page?: number` განზრახ არ გამოიყენება: implicit
 * conversion-ით მითითების გარეშე `NaN` ბრუნდება და Prisma-ს `skip: NaN`
 * მიდის — მოთხოვნა 500-ით ვარდება. DTO-ს გავლისას ცარიელი ველი
 * `undefined` რჩება და ნაგულისხმევი მნიშვნელობა მუშაობს.
 */
export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;
}
