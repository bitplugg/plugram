import React, { useState } from 'react';
import { auth as authApi } from '../api';

export default function Auth({ onAuth }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [apiId, setApiId] = useState(localStorage.getItem('plugram_apiId') || '');
  const [apiHash, setApiHash] = useState(localStorage.getItem('plugram_apiHash') || '');
  const [step, setStep] = useState('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentials = async () => {
    if (!apiId || !apiHash) return setError('API ID and Hash required');
    localStorage.setItem('plugram_apiId', apiId);
    localStorage.setItem('plugram_apiHash', apiHash);
    setStep('phone');
    setError('');
  };

  const sendCode = async () => {
    if (!phone) return setError('Phone number required');
    setLoading(true); setError('');
    try {
      await authApi.sendCode(phone, apiId, apiHash);
      setStep('code');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (!code) return setError('Code required');
    setLoading(true); setError('');
    try {
      const user = await authApi.signIn(code);
      if (user?._ === 'auth.authorizationSignUpRequired') {
        setStep('signup');
      } else {
        onAuth(user);
      }
    } catch (e) {
      if (e.message.includes('2FA') || e.message.includes('password')) {
        setStep('2fa');
      } else {
        setError(e.message);
      }
    }
    setLoading(false);
  };

  const verify2FA = async () => {
    if (!password) return setError('Password required');
    setLoading(true); setError('');
    try {
      const user = await authApi.twoFA(password);
      onAuth(user);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="auth-header">
          <span style={{ fontSize: 48 }}>⚡</span>
          <h1 style={{ margin: '12px 0', fontSize: 28 }}>Plugram</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Sign in with your Telegram account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {step === 'credentials' && (
          <div className="auth-form">
            <input className="auth-input" placeholder="API ID" value={apiId} onChange={e => setApiId(e.target.value)} type="number" />
            <input className="auth-input" placeholder="API Hash" value={apiHash} onChange={e => setApiHash(e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Get from my.telegram.org/apps</p>
            <button className="btn btn-primary" onClick={handleCredentials} style={{ width: '100%' }}>Continue</button>
          </div>
        )}

        {step === 'phone' && (
          <div className="auth-form">
            <input className="auth-input" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoFocus />
            <button className="btn btn-primary" onClick={sendCode} disabled={loading} style={{ width: '100%' }}>{loading ? 'Sending...' : 'Send Code'}</button>
            <button className="btn btn-ghost" onClick={() => setStep('credentials')} style={{ width: '100%', marginTop: 8 }}>← Back</button>
          </div>
        )}

        {step === 'code' && (
          <div className="auth-form">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Code sent to {phone}</p>
            <input className="auth-input" placeholder="12345" value={code} onChange={e => setCode(e.target.value)} type="text" autoFocus />
            <button className="btn btn-primary" onClick={verifyCode} disabled={loading} style={{ width: '100%' }}>{loading ? 'Verifying...' : 'Verify Code'}</button>
            <button className="btn btn-ghost" onClick={() => setStep('phone')} style={{ width: '100%', marginTop: 8 }}>← Back</button>
          </div>
        )}

        {step === '2fa' && (
          <div className="auth-form">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>2FA password required</p>
            <input className="auth-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" autoFocus />
            <button className="btn btn-primary" onClick={verify2FA} disabled={loading} style={{ width: '100%' }}>{loading ? 'Verifying...' : 'Sign In'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
