import React, { useEffect, useState } from 'react';
import { watchAuth, loginWithGoogle, completeRedirectSignIn, logout, getIdToken } from './services/authService';
import { checkAdminAccess, uploadFirmwareFile } from './services/adminApi';
import './App.css';

const FlashIcon = ({ size = 48, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512">
    <path fill={color} d="M315.27 33L96 304h128l-31.51 173.23a2.36 2.36 0 002.33 2.77h0a2.36 2.36 0 001.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 00-2.4-2.82h0a2.4 2.4 0 00-1.99 1.07z"/>
  </svg>
);

const BrandHeader = () => (
  <div className="brand-section">
    <div className="logo-container">
      <FlashIcon size={48} />
    </div>
    <div className="brand-title">Fetherstill</div>
    <div className="brand-subtitle">BMS Monitor</div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [authError, setAuthError] = useState('');

  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
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
    setFileName('');
    setUploadMessage('');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');
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
        setUploadMessage('SUCCESS: Firmware uploaded successfully');
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
      <div className="app-container">
        <div className="card login-card">
          <BrandHeader />
          <div className="action-section">
            <button className="btn btn-google" onClick={onGoogleLogin}>
              <svg style={{ marginRight: 12 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Sign in with Google
            </button>
            {authError ? <div className="message">{authError}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  if (checkingAdmin) {
    return (
      <div className="app-container">
        <div className="card login-card" style={{ textAlign: 'center' }}>
          <div className="brand-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
             <BrandHeader />
             <div className="title" style={{ marginTop: 24 }}>Authorizing...</div>
             <p className="subtitle" style={{ margin: 0 }}>Verifying admin credentials</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app-container">
        <div className="card login-card">
          <BrandHeader />
          <h3 className="title text-center">Access Denied</h3>
          <p className="subtitle text-center" style={{ marginBottom: 24 }}>{authError || 'You do not have administrative privileges.'}</p>
          <div className="action-section">
             <button className="btn btn-secondary" onClick={onLogout} style={{ width: '100%' }}>
               Logout
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="card upload-card">
        <div className="upload-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div className="logo-container-small">
               <FlashIcon size={24} />
             </div>
             <div>
               <h2 className="title" style={{ marginBottom: 4 }}>Firmware OTA Upload</h2>
               <p className="subtitle" style={{ margin: 0 }}>Secure Admin Portal</p>
             </div>
           </div>
           <button className="btn btn-secondary btn-sm" type="button" onClick={onLogout}>
             Logout
           </button>
        </div>

        <div className="user-badge">
           Logged in as: <strong>{user.email}</strong>
        </div>

        <form onSubmit={onUpload} className="upload-form">
          <div className="form-group">
            <label className="form-label">Version Number</label>
            <input
              className="input-field"
              placeholder="e.g. 1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Changelog Notes (Optional)</label>
            <textarea
              className="input-field"
              placeholder="What's new in this release? (Included in OTA metadata)"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Firmware Binary (.bin)</label>
            <div className="file-input-wrapper">
              <input
                className="file-input"
                type="file"
                id="file-upload"
                accept=".bin,application/octet-stream"
                onChange={handleFileChange}
              />
               <label htmlFor="file-upload" className={`file-upload-label ${file ? 'has-file' : ''}`}>
                 <div className="icon">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                 </div>
                 <div className="text text-primary" style={{ marginBottom: 4 }}>
                   {fileName ? fileName : 'Click to select a file or drag and drop'}
                 </div>
                 <div className="text text-secondary">
                   {fileName ? 'Binary file selected ready for upload' : 'ESP32 .bin file only (max 2MB)'}
                 </div>
               </label>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 24 }}>
            <button className="btn btn-primary" type="submit" disabled={uploading}>
              {uploading ? <><span className="spinner"></span> Uploading to Device...</> : 'Deploy Firmware'}
            </button>
          </div>
        </form>

        {uploadMessage ? (
          <div className={`message ${uploadMessage.startsWith('SUCCESS') ? 'success' : ''}`}>
            {uploadMessage.replace('SUCCESS: ', '')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
