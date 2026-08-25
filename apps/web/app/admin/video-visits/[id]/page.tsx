import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { VisitRoom } from '../../../video-visit/VisitRoom';
import { apiFetch } from '@/lib/session';
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

  const [joined, detail] = await Promise.all([
    joinAsStaff(id),
    // ასაკი დოზის დათვლას სჭირდება — ექიმი დასკვნას ოთახშივე წერს
    apiFetch<{ ageMonths: number | null }>(`/admin/video-visits/${id}`),
  ]);

  if (!joined.data) {
    redirect(
      `/admin/video-visits?error=${encodeURIComponent(joined.error ?? 'ჩართვა ვერ მოხერხდა')}`,
    );
  }

  return (
    <VisitRoom
      visitId={id}
      call={{
        appId: joined.data.appId,
        channel: joined.data.channel,
        token: joined.data.token,
        uid: joined.data.uid,
      }}
      admin
      meId={user.id}
      title="ვიდეო ვიზიტი"
      ageMonths={detail?.ageMonths ?? null}
    />
  );
}
