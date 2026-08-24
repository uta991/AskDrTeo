import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class ToggleChecklistDto {
  @IsString() @MaxLength(50)
  itemKey!: string;

  @IsBoolean()
  done!: boolean;
}
