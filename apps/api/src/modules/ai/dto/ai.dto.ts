import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty({ message: 'შეკითხვა ცარიელია' })
  // გრძელი ტექსტი ხარჯია და კითხვასაც ბუნდოვანს ხდის
  @MaxLength(2000, { message: 'შეკითხვა 2000 სიმბოლოზე გრძელია' })
  message!: string;

  /** არსებული საუბრის გაგრძელება; ცარიელი = ახალი საუბარი */
  @IsOptional() @IsUUID()
  conversationId?: string;

  /** რომელ ბავშვზეა საუბარი — ასაკი პასუხს არსებითად ცვლის */
  @IsOptional() @IsUUID()
  childId?: string;
}
