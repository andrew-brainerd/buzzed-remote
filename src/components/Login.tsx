import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/authStore';

export const Login = () => {
  const signIn = useAuthStore(s => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch {
      setError('Login failed — check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col gap-3 px-6 pt-16">
      <h1 className="text-center text-xl font-semibold text-neutral-100">Buzzed Remote</h1>
      <p className="mb-2 text-center text-xs text-neutral-500">Sign in with your Brainerd account</p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="username"
        className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};
