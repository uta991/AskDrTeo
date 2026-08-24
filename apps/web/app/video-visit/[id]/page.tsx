import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { enterVisit } from '../actions';
import { VisitRoom } from '../VisitRoom';

export const metadata = { title: 'ვიზიტი პედიატრთან — AskDrTeo' };

/**
 * ოთახი მშობლისთვის.
 *
 * ჩართვა თავად გვერდის გახსნისას ხდება — ცალკე „შესვლის" ღილაკი
 * ზედმეტი ნაბიჯი იქნებოდა. თუ ვერ მოხერხდა, მიზეზი სიაში გადააქვს:
 * ჩუმად დაბრუნება მშობელს ისე ტოვებდა, თითქოს ღილაკი გაფუჭებულია.
 */
export default async function VisitRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const joined = await enterVisit(id);

  if (!joined.data) {
    redirect(`/video-visit?error=${encodeURIComponent(joined.error ?? 'ჩართვა ვერ მოხერხდა')}`);
  }

  return (
    <VisitRoom
      visitId={id}
      roomUrl={joined.data.roomUrl}
      admin={false}
      meId={user.id}
      title="ვიზიტი პედიატრთან"
    />
  );
}
