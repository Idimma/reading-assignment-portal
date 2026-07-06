import { redirect } from 'next/navigation';

export default function Home() {
  // Proxy handles role-based redirects. If proxy has not run, default to /login.
  redirect('/login');
}
