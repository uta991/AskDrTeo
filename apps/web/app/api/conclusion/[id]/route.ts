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
  const { id } = await params;

  const user = await getSessionUser();
  const token = user ? await getAccessToken() : null;

  // SMS-ის ბმულს მშობელი ხშირად იმ ბრაუზერში ხსნის, სადაც შესული
  // არაა. ცარიელი შეცდომის ნაცვლად შესვლაზე ვგზავნით და შემდეგ
  // პირდაპირ დოკუმენტზე ვაბრუნებთ.
  if (!user || !token) {
    const next = encodeURIComponent(`/api/conclusion/${id}`);
    return Response.redirect(
      new URL(`/login?next=${next}`, process.env.WEB_URL ?? 'http://localhost:3100'),
      302,
    );
  }

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
