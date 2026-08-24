import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { VisitRoom } from '../../../video-visit/VisitRoom';
import { joinAsStaff } from '../actions';

export const metadata = { title: 'ვიდეო ვიზიტი — AskDrTeo' };

export default async function StaffVisitRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role === 'PARENT') redirect('/video-visit');

  const { id } = await params;
  const joined = await joinAsStaff(id);

  if (!joined.data) {
    redirect(
      `/admin/video-visits?error=${encodeURIComponent(joined.error ?? 'ჩართვა ვერ მოხერხდა')}`,
    );
  }

  return (
    <VisitRoom
      visitId={id}
      roomUrl={joined.data.roomUrl}
      admin
      meId={user.id}
      title="ვიდეო ვიზიტი"
    />
  );
}
