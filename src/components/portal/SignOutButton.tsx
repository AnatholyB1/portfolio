import { LogOut } from 'lucide-react';
import { signOutAction } from '@/lib/server/auth/signOut';

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="pt-btn-ghost">
        <LogOut size={16} aria-hidden="true" />
        Se déconnecter
      </button>
    </form>
  );
}
