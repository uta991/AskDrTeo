import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestVideoVisitDto {
  /** მშობლის არჩეული დღე — YYYY-MM-DD */
  @IsDateString({}, { message: 'აირჩიეთ ვიზიტის დღე' })
  date!: string;

  @IsOptional() @IsUUID()
  childId?: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class ScheduleVideoVisitDto {
  /** ექიმის დანიშნული ზუსტი დრო */
  @IsDateString({}, { message: 'მიუთითეთ ვიზიტის დრო' })
  scheduledAt!: string;

  @IsOptional() @IsString() @MaxLength(500)
  staffNote?: string;
}
