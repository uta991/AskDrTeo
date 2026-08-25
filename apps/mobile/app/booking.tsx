import { Redirect } from 'expo-router';

/**
 * ვიზიტი და ვიდეო ზარი ერთი სერვისია — ორი ცალკე ეკრანი მშობელს
 * მხოლოდ აბნევდა. ძველი ბმულები ახალ ეკრანზე გადადის.
 */
export default function BookingRedirect() {
  return <Redirect href="/video-visit" />;
}
