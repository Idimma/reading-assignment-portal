import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware handles role-based redirects. If middleware hasn't run, default to /login.
  redirect('/login');
}
