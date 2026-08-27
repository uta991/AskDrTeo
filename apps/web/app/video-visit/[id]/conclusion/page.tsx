import { redirect } from 'next/navigation';

/**
 * ძველი SMS-ების ბმული.
 *
 * თავიდან დასკვნა ამ მისამართზე იგზავნებოდა და გვერდი არ არსებობდა.
 * უკვე გაგზავნილი შეტყობინებები ვეღარ გამოვასწორეთ, ამიტომ ეს გზა
 * რჩება და დოკუმენტზე გადაჰყავს — ავტორიზაციის შემოწმებით.
 */
export default async function OldConclusionLink({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/api/conclusion/${id}`);
}
