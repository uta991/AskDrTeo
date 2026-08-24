import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { joinVisit } from '../actions';
import { VisitRoom } from '../VisitRoom';

export const metadata = { title: 'ვიდეო ვიზიტი — AskDrTeo' };

/**
 * ოთახი მშობლისთვის.
 *
 * ჩართვა თავად გვერდის გახსნისას ხდება — ცალკე „შესვლის" ღილაკი
 * ზედმეტი ნაბიჯი იქნებოდა: მშობელი აქ სწორედ ჩასართავად შემოდის.
 */
export default async function VisitRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const joined = await joinVisit(id);

  if (!joined.data) redirect('/video-visit');

  return (
    <VisitRoom
      visitId={id}
      roomUrl={joined.data.roomUrl}
      admin={false}
      meId={user.id}
      title="ვიდეო ვიზიტი ექიმთან"
    />
  );
}
