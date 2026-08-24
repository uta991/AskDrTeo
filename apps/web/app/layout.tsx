import type { Metadata, Viewport } from 'next';
import { getSessionUser } from '@/lib/session';
import { ChatDock } from './components/ChatDock';
import './globals.css';

export const metadata: Metadata = {
  title: 'AskDrTeo — პედიატრი ყოველთვის ხელთ',
  description:
    'სპეციალისტის რჩევები, ვიდეო ბიბლიოთეკა და კონსულტაცია — ბავშვის ასაკის მიხედვით.',
  openGraph: {
    title: 'AskDrTeo',
    description: 'პედიატრი ყოველთვის ხელთ',
    type: 'website',
    locale: 'ka_GE',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // საუბრის ღილაკები მხოლოდ მშობელს — პერსონალი პანელიდან პასუხობს
  const user = await getSessionUser();

  return (
    <html lang="ka">
      <body>
        {children}
        {user?.role === 'PARENT' && <ChatDock />}
      </body>
    </html>
  );
}
