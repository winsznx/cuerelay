import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

function destinationPath(fromUrl) {
  if (!fromUrl) return '/app';
  try {
    const url = new URL(fromUrl);
    return `${url.pathname}${url.search}` || '/app';
  } catch {
    return '/app';
  }
}

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = destinationPath(searchParams.get('from_url'));

  const [mode, setMode] = useState('signin'); // signin | signup | verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function finishLogin() {
    const { access_token } = await base44.auth.loginViaEmailPassword(email, password);
    base44.auth.setToken(access_token, true);
    navigate(destination, { replace: true });
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await finishLogin();
    } catch (err) {
      setError(err?.message ?? 'Could not sign in with that email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await base44.auth.register({ email, password });
      setMode('verify');
    } catch (err) {
      setError(err?.message ?? 'Could not create that account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await base44.auth.verifyOtp({ email, otpCode });
      await finishLogin();
    } catch (err) {
      setError(err?.message ?? 'That code didn’t work. Check your email and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <Card elevated className="w-full max-w-sm p-7">
        <BrandMark className="mb-6" />

        {mode !== 'verify' ? (
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            <p className="font-display text-xl text-ink">{mode === 'signin' ? 'Sign in' : 'Create your account'}</p>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="w-full text-center text-xs text-muted hover:text-ink"
            >
              {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="font-display text-xl text-ink">Check your email</p>
            <p className="text-sm text-muted">We sent a verification code to {email}.</p>
            <div className="space-y-1.5">
              <Label htmlFor="otp">Verification code</Label>
              <Input id="otp" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required autoFocus />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
