import { API_URL, getAccessToken, getSessionUser } from '@/lib/session';

/**
 * დასკვნის PDF-ის გადაცემა.
 *
 * ბრაუზერი პირდაპირ API-ს ვერ მიმართავს: სესიის ტოკენი httpOnly
 * cookie-შია და `<a href>`-ს Authorization სათაური არ მიაქვს.
 * ამიტომ ფაილს სერვერი იღებს და უცვლელად გადმოსცემს.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response('ავტორიზაცია საჭიროა', { status: 401 });

  const token = await getAccessToken();
  if (!token) return new Response('სესია ამოიწურა', { status: 401 });

  const { id } = await params;

  // პერსონალი ადმინის მისამართით მიდის — მას სხვისი ვიზიტიც უჩანს
  const base = user.role === 'PARENT' ? '/video-visits' : '/admin/video-visits';

  const upstream = await fetch(`${API_URL}${base}/${id}/conclusion.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return new Response('დასკვნა ვერ მოიძებნა', { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="askdrteo-danishnuleba.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
