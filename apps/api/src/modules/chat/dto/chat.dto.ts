import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
