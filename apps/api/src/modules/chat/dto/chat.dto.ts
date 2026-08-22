import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class StartConversationDto {
  @IsOptional() @IsString() @MaxLength(120)
  subject?: string;

  /**
   * პირველი წერილი.
   *
   * არასავალდებულოა: „ჩატის დაწყებაზე" საუბარი მაშინვე იხსნება და
   * მშობელს ავტომატური მისალმება ხვდება, ტექსტის აკრეფამდე.
   */
  @IsOptional() @IsString() @MaxLength(4000)
  message?: string;
}

export class SendMessageDto {
  // ტექსტი არასავალდებულოა, თუ ფოტო ან ვიდეო მიმაგრებულია
  @IsOptional() @IsString() @MaxLength(4000)
  body?: string;

  /** მიმაგრებული ფოტო/ვიდეო — `/media/chat-attachment`-ის პასუხიდან */
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  assetIds?: string[];
}

export class RateConversationDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating!: number;

  @IsOptional() @IsString() @MaxLength(1000)
  comment?: string;
}
