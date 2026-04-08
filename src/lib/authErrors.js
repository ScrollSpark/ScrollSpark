/**
 * Map Supabase Auth errors to short, actionable copy for the UI.
 */
export function formatAuthError(err) {
  if (!err) return 'Something went wrong. Please try again.';
  const msg = String(err.message || '').toLowerCase();
  const code = err.code || err.status;

  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Your email is not confirmed yet. Open the link we sent you, or use “Resend confirmation email” below.';
  }
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials') ||
    code === 'invalid_credentials'
  ) {
    return 'Wrong email or password. Double-check both, or sign up if you do not have an account yet.';
  }
  if (msg.includes('too many requests') || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (msg.includes('already registered') || msg.includes('user already exists')) {
    return 'That email already has an account. Try logging in instead.';
  }
  return err.message || 'Could not sign in. Please try again.';
}
