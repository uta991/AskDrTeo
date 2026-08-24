import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional() @IsUUID()
  childId?: string;

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class DecideAppointmentDto {
  /** დადასტურებული დრო — შეიძლება სასურველს არ ემთხვეოდეს */
  @IsOptional() @IsDateString()
  scheduledAt?: string;

  @IsOptional() @IsString() @MaxLength(500)
  staffNote?: string;
}
