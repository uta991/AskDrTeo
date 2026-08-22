import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartConversationDto {
  @IsOptional() @IsString() @MaxLength(120)
  subject?: string;

  @IsString()
  @IsNotEmpty({ message: 'შეტყობინება ცარიელია' })
  @MaxLength(4000)
  message!: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'შეტყობინება ცარიელია' })
  @MaxLength(4000)
  body!: string;
}

export class RateConversationDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating!: number;

  @IsOptional() @IsString() @MaxLength(1000)
  comment?: string;
}
