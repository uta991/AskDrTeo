import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * პირდაპირი ატვირთვის მოთხოვნა.
 *
 * ფაილი ჩვენამდე არ მოდის, ამიტომ ტიპსა და ზომას ბრაუზერი აცხადებს.
 * სიზუსტეს `UploadPolicyService.assertDeclaredAllowed` ამოწმებს.
 */
export class VideoTicketDto {
  @IsOptional() @IsString() @MaxLength(150)
  title?: string;

  @IsString() @IsNotEmpty({ message: 'ფაილის ტიპი უცნობია' })
  mimeType!: string;

  @IsInt({ message: 'ფაილის ზომა უცნობია' }) @Min(1, { message: 'ფაილი ცარიელია' })
  sizeBytes!: number;
}
