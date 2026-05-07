import React, { useState } from 'react';
import { auth } from '../api';

export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState('creds');
  const [phone, setPhone] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setLoading(true); setError('');
    try {
      await auth.sendCode(phone, apiId, apiHash);
      setStep('code');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true); setError('');
    try {
      const res = await auth.signIn(code);
      if (res.need2fa) { setStep('2fa'); return; }
      onLogin(res.user);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handle2FA = async () => {
    setLoading(true); setError('');
    try {
      const res = await auth.twoFA(password);
      onLogin(res.user);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <h1 className="auth-title">Plugram</h1>
        <p className="auth-subtitle">Custom Telegram Client by bitplugg</p>
        {error && <div className="error-msg">{error}</div>}
        {step === 'creds' && (
          <>
            <input className="auth-input" placeholder="API ID" value={apiId} onChange={e => setApiId(e.target.value)} type="number" />
            <input className="auth-input" placeholder="API Hash" value={apiHash} onChange={e => setApiHash(e.target.value)} />
            <input className="auth-input" placeholder="Phone number (+1234567890)" value={phone} onChange={e => setPhone(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSendCode} disabled={loading}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </>
        )}
        {step === 'code' && (
          <>
            <input className="auth-input" placeholder="Code from Telegram" value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSignIn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </>
        )}
        {step === '2fa' && (
          <>
            <input className="auth-input" placeholder="2FA Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="btn btn-primary" onClick={handle2FA} disabled={loading}>
              {loading ? 'Verifying...' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
