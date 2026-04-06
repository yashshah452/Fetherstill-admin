import React, { useEffect, useState } from 'react';
import { watchAuth, loginWithGoogle, completeRedirectSignIn, logout, getIdToken } from './services/authService';
import { checkAdminAccess, uploadFirmwareFile } from './services/adminApi';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [authError, setAuthError] = useState('');

  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // handle redirect flow (no-op for popup flow)
    completeRedirectSignIn().catch(() => null);

    const unsub = watchAuth(async (authUser) => {
      setUser(authUser || null);
      setIsAdmin(false);
      setUploadMessage('');
      setAuthError('');

      if (!authUser) return;

      setCheckingAdmin(true);
      try {
        const token = await getIdToken(true);
        const result = await checkAdminAccess(token);
        if (result.ok && result?.data?.data?.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setAuthError(result?.data?.error || 'Admin access required');
        }
      } catch (e) {
        setIsAdmin(false);
        setAuthError(e?.message || 'Admin check failed');
      } finally {
        setCheckingAdmin(false);
      }
    });

    return () => unsub();
  }, []);

  const onGoogleLogin = async () => {
    setAuthError('');
    try {
      await loginWithGoogle();
    } catch (e) {
      setAuthError(e?.message || 'Google sign-in failed');
    }
  };

  const onLogout = async () => {
    await logout();
    setVersion('');
    setChangelog('');
    setFile(null);
    setUploadMessage('');
  };

  const onUpload = async (e) => {
    e.preventDefault();
    setUploadMessage('');

    if (!file) return setUploadMessage('Please select a .bin file');
    if (!version.trim()) return setUploadMessage('Please enter a firmware version');

    setUploading(true);
    try {
      const token = await getIdToken(true);
      const result = await uploadFirmwareFile({
        token,
        version: version.trim(),
        changelog: changelog.trim(),
        file,
      });

      if (result.ok) {
        setUploadMessage('Firmware uploaded successfully');
      } else {
        setUploadMessage(result?.data?.error || `Upload failed (HTTP ${result.status})`);
      }
    } catch (err) {
      setUploadMessage(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 420, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h2>Featherstill Admin Login</h2>
        <button onClick={onGoogleLogin}>Sign in with Google</button>
        {authError ? <p style={{ color: 'crimson' }}>{authError}</p> : null}
      </div>
    );
  }

  if (checkingAdmin) {
    return <div style={{ margin: 24, fontFamily: 'sans-serif' }}>Checking admin access...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ margin: 24, fontFamily: 'sans-serif' }}>
        <h3>Access denied</h3>
        <p>{authError || 'You are not an admin user.'}</p>
        <button onClick={onLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '30px auto', fontFamily: 'sans-serif' }}>
      <h2>Firmware Upload (Admin)</h2>
      <p>Logged in as: {user.email}</p>

      <form onSubmit={onUpload}>
        <input
          placeholder="Version (e.g. 1.0.0)"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />
        <textarea
          placeholder="Changelog (optional)"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8, minHeight: 90 }}
        />
        <input
          type="file"
          accept=".bin,application/octet-stream"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 10 }}
        />
        <div>
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Firmware'}
          </button>
          {' '}
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </form>

      {uploadMessage ? <p>{uploadMessage}</p> : null}
    </div>
  );
}
