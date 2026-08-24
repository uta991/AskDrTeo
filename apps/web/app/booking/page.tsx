import { redirect } from 'next/navigation';

/**
 * ვიზიტი და ვიდეო ზარი ერთი და იგივე სერვისია — ორი ცალკე გვერდი
 * მშობელს მხოლოდ აბნევდა. ძველი ბმულები ახალ გვერდზე გადადის.
 */
export default function BookingPage() {
  redirect('/video-visit');
}
