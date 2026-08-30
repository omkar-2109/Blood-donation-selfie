import React, { useEffect, useMemo, useRef, useState } from 'react';
import ASSETS from './config/assets.js';
import { FRAME_CONFIGS } from './config/frames.js';
import { SNCF_BRANCHES } from './config/branches.js';
import { formatName, formatDate, validateAndNormalizePhone } from './utils/formatters.js';
import { clampOffsets, loadImage, renderFramedSelfie, canvasToBlob } from './utils/imageEngine.js';
import { saveOfflineSubmission, getOfflineSubmissions, deleteOfflineSubmission } from './utils/offlineStore.js';
import {
  saveSubmissionToFirebase,
  getSubmissionsFromFirebase,
  deleteSubmissionFromFirebase
} from './config/firebase.js';

/* ==========================================================================
   HEADER COMPONENT
   ========================================================================== */
function Header() {
  return (
    <header className="kiosk-header">
      <div className="brand-badge">
        <img
          src={ASSETS.sncfLogo}
          alt="SNCF Logo"
          className="brand-badge__logo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = ASSETS.sncfEmblem;
          }}
        />
        <div className="brand-badge__text">
          <h1>Sant Nirankari Charitable Foundation</h1>
          <p>Humanness Blood Drive Kiosk</p>
        </div>
      </div>
      <div className="kiosk-tag">
        <span className="kiosk-tag__dot" />
        <span>Live Event</span>
      </div>
    </header>
  );
}

/* ==========================================================================
   STEP INDICATOR COMPONENT
   ========================================================================== */
function StepIndicator({ currentStep }) {
  const steps = [
    { key: 'details', num: '01', label: 'Details' },
    { key: 'camera', num: '02', label: 'Selfie' },
    { key: 'review', num: '03', label: 'Preview' },
    { key: 'share', num: '04', label: 'Share' }
  ];

  const getStepClass = (stepKey, index) => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep);
    if (currentStep === stepKey || (currentStep === 'edit' && stepKey === 'camera')) {
      return 'step-indicator__item step-indicator__item--active';
    }
    if (currentIndex > index || (currentStep === 'share' && index < 3)) {
      return 'step-indicator__item step-indicator__item--completed';
    }
    return 'step-indicator__item';
  };

  return (
    <div className="step-indicator">
      {steps.map((step, idx) => (
        <div key={step.key} className={getStepClass(step.key, idx)}>
          <div className="step-indicator__num">{step.num}</div>
          <span className="step-indicator__label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   STEP 1: VISITOR DETAILS FORM
   ========================================================================== */
function DetailsStep({ form, setForm, onNext }) {
  const [error, setError] = useState('');

  const formattedPreviewName = useMemo(() => {
    return form.fullName ? formatName(form.fullName) : '';
  }, [form.fullName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!form.age || Number(form.age) < 1 || Number(form.age) > 120) {
      setError('Please enter a valid Age.');
      return;
    }
    if (!form.branch) {
      setError('Please select your Branch.');
      return;
    }
    if (form.branch === 'Other' && !form.customBranch.trim()) {
      setError('Please specify your Custom Branch.');
      return;
    }

    const phoneVal = validateAndNormalizePhone(form.whatsappNumber);
    if (!phoneVal.valid) {
      setError(phoneVal.message);
      return;
    }

    if (!form.consent) {
      setError('Please accept the privacy notice to proceed.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      normalizedPhone: phoneVal.normalized
    }));

    onNext();
  };

  return (
    <div className="kiosk-card">
      <div className="kiosk-card__header">
        <div>
          <h2 className="kiosk-card__title">Step 1: Your Details</h2>
          <p className="kiosk-card__subtitle">
            Enter your information to personalize your Humanness Blood Drive selfie.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="form-grid form-grid--two">
        <div className="form-group form-group--full">
          <label htmlFor="fullName">
            Full Name <span className="req">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            className="form-input"
            placeholder="e.g. Rahul Kumar"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            required
            autoComplete="name"
          />
          {formattedPreviewName ? (
            <p style={{ fontSize: '0.84rem', color: '#8B0000', fontWeight: 600, marginTop: '4px' }}>
              Will appear as: "{formattedPreviewName}"
            </p>
          ) : null}
        </div>

        <div className="form-group">
          <label htmlFor="age">
            Age <span className="req">*</span>
          </label>
          <input
            id="age"
            type="number"
            min="1"
            max="120"
            className="form-input"
            placeholder="e.g. 28"
            value={form.age}
            onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender (Optional)</label>
          <select
            id="gender"
            className="form-select"
            value={form.gender}
            onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="branch">
            SNCF Branch <span className="req">*</span>
          </label>
          <select
            id="branch"
            className="form-select"
            value={form.branch}
            onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
            required
          >
            <option value="">Select Branch</option>
            {SNCF_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {form.branch === 'Other' ? (
          <div className="form-group">
            <label htmlFor="customBranch">
              Specify Branch <span className="req">*</span>
            </label>
            <input
              id="customBranch"
              type="text"
              className="form-input"
              placeholder="Enter your branch name"
              value={form.customBranch}
              onChange={(e) => setForm((prev) => ({ ...prev, customBranch: e.target.value }))}
              required
            />
          </div>
        ) : null}

        <div className="form-group form-group--full">
          <label htmlFor="whatsappNumber">
            WhatsApp Number <span className="req">*</span>
          </label>
          <input
            id="whatsappNumber"
            type="tel"
            className="form-input"
            placeholder="10-digit mobile number (e.g. 9876543210)"
            value={form.whatsappNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
            required
          />
        </div>

        <div className="form-group form-group--full privacy-notice">
          <label className="privacy-checkbox">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm((prev) => ({ ...prev, consent: e.target.checked }))}
            />
            <span>
              Your details and photo are collected for participation in the Humanness Blood Drive selfie experience.
              I agree to the collection of my details for this event.
            </span>
          </label>
        </div>

        <div className="form-group form-group--full" style={{ marginTop: '12px' }}>
          <button type="submit" className="btn btn--primary btn--lg btn--full">
            Proceed to Selfie Camera →
          </button>
        </div>
      </form>
    </div>
  );
}

/* ==========================================================================
   STEP 2: CAMERA CAPTURE & POSITION ADJUSTMENT
   ========================================================================== */
function CameraAndAdjustStep({
  form,
  selectedFrame,
  setSelectedFrame,
  mirror,
  setMirror,
  editorState,
  setEditorState,
  onCaptured,
  onRenderPreview,
  onBack
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const editorViewportRef = useRef(null);
  const dragRef = useRef(null);

  const [facingMode, setFacingMode] = useState('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedSelfie, setCapturedSelfie] = useState(null);

  const formattedName = useMemo(() => formatName(form.fullName), [form.fullName]);

  const startCamera = async () => {
    try {
      setCameraError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError('Camera access is required to take your selfie. Please allow camera access and try again.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (!capturedSelfie) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, capturedSelfie]);

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const takeSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera stream is not ready. Please try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw unmirrored video onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png', 0.95);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    const selfieObj = { src: dataUrl, width: canvas.width, height: canvas.height };
    // Synchronize editor mirror with camera mirror setting
    setEditorState((prev) => ({ ...prev, mirror: Boolean(mirror) }));
    setCapturedSelfie(selfieObj);
    onCaptured(selfieObj, Boolean(mirror));
  };

  const retakeSelfie = () => {
    setCapturedSelfie(null);
    setEditorState((prev) => ({ ...prev, offsetX: 0, offsetY: 0, zoom: 1.0, rotationDeg: 0 }));
  };

  const handlePointerDown = (e) => {
    if (!capturedSelfie) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: editorState.offsetX,
      initialY: editorState.offsetY
    };
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    setEditorState((prev) => ({
      ...prev,
      offsetX: drag.initialX + deltaX,
      offsetY: drag.initialY + deltaY
    }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const frameAspectRatioStyle = selectedFrame.aspectRatio || '1448 / 2048';
  const photoCenter = {
    x: (selectedFrame.normalized.photoArea.x + selectedFrame.normalized.photoArea.width / 2) * 100,
    y: (selectedFrame.normalized.photoArea.y + selectedFrame.normalized.photoArea.height / 2) * 100
  };

  return (
    <div className="kiosk-card">
      <div className="kiosk-card__header">
        <div>
          <h2 className="kiosk-card__title">Step 2: Capture & Adjust Photo</h2>
          <p className="kiosk-card__subtitle">
            {!capturedSelfie
              ? 'Position yourself in the center and click Take Selfie.'
              : 'Drag to move, zoom slider to fit your photo inside the campaign frame.'}
          </p>
        </div>
        <button className="btn btn--ghost" onClick={onBack}>
          ← Back
        </button>
      </div>

      {cameraError ? <div className="alert alert--error">{cameraError}</div> : null}

      {!capturedSelfie ? (
        /* CAMERA LIVE VIEW */
        <div className="camera-container">
          <div className="camera-preview-shell" style={{ aspectRatio: frameAspectRatioStyle }}>
            <video
              ref={videoRef}
              className="camera-video"
              playsInline
              muted
              autoPlay
              style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
            />
            {selectedFrame ? (
              <img src={selectedFrame.src} alt="Frame Overlay Guide" className="frame-overlay-guide" />
            ) : null}
          </div>

          <div className="camera-controls-bar">
            <button className="btn btn--secondary" onClick={() => setMirror((prev) => !prev)}>
              {mirror ? '✓ Mirror Selfie ON' : 'Mirror Selfie OFF'}
            </button>
            <button className="btn btn--secondary" onClick={switchCamera}>
              Flip Camera
            </button>
            <button className="btn btn--primary btn--lg" onClick={takeSelfie} disabled={!cameraActive}>
              📷 Take Selfie
            </button>
          </div>
        </div>
      ) : (
        /* PHOTO ADJUSTMENT EDITOR */
        <div>
          {/* Frame Selection */}
          <div className="frame-selector">
            {FRAME_CONFIGS.map((frame) => (
              <div
                key={frame.id}
                className={`frame-card-chip ${selectedFrame.id === frame.id ? 'frame-card-chip--selected' : ''}`}
                onClick={() => setSelectedFrame(frame)}
              >
                <h4>{frame.name}</h4>
                <p>{frame.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Interactive Frame Viewport */}
          <div
            ref={editorViewportRef}
            className="editor-viewport"
            style={{ aspectRatio: frameAspectRatioStyle }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
          >
            {/* User Photo positioned in cutout center */}
            <img
              src={capturedSelfie.src}
              alt="Selfie"
              className="editor-user-photo"
              style={{
                left: `${photoCenter.x}%`,
                top: `${photoCenter.y}%`,
                width: `${selectedFrame.normalized.photoArea.width * 100}%`,
                height: `${selectedFrame.normalized.photoArea.height * 100}%`,
                objectFit: 'cover',
                transform: `translate(-50%, -50%) translate(${editorState.offsetX}px, ${editorState.offsetY}px) scale(${editorState.zoom}) ${editorState.mirror ? 'scaleX(-1)' : 'scaleX(1)'} rotate(${editorState.rotationDeg}deg)`
              }}
            />
            {/* Frame Overlay */}
            <img src={selectedFrame.src} alt="Campaign Frame" className="editor-frame-image" />

            {/* Name Overlay Preview positioned directly inside light-pink banner for Frame 2 */}
            {selectedFrame.hasNameArea && selectedFrame.normalized.nameArea ? (
              <div
                className="editor-name-preview"
                style={{
                  top: `${selectedFrame.normalized.nameArea.y * 100}%`,
                  left: `${selectedFrame.normalized.nameArea.x * 100}%`,
                  width: `${selectedFrame.normalized.nameArea.width * 100}%`,
                  height: `${selectedFrame.normalized.nameArea.height * 100}%`
                }}
              >
                {formattedName}
              </div>
            ) : null}
          </div>

          {/* Controls Bar */}
          <div className="editor-toolbar">
            <div className="slider-group">
              <label>Zoom:</label>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={editorState.zoom}
                onChange={(e) => setEditorState((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{Math.round(editorState.zoom * 100)}%</span>
            </div>

            <div className="camera-controls-bar">
              <button
                className="btn btn--secondary"
                onClick={() => setEditorState((prev) => ({ ...prev, mirror: !prev.mirror }))}
              >
                {editorState.mirror ? '✓ Mirror ON' : 'Mirror OFF'}
              </button>
              <button
                className="btn btn--secondary"
                onClick={() =>
                  setEditorState((prev) => ({
                    ...prev,
                    rotationDeg: (prev.rotationDeg + 90) % 360
                  }))
                }
              >
                Rotate 90°
              </button>
              <button className="btn btn--ghost" onClick={retakeSelfie}>
                ↻ Retake Photo
              </button>
            </div>

            <button
              className="btn btn--primary btn--lg btn--full"
              style={{ marginTop: '16px', marginBottom: '20px' }}
              onClick={onRenderPreview}
            >
              Generate Final Frame Preview →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   STEP 3: FINAL PREVIEW SCREEN
   ========================================================================== */
function ReviewStep({
  previewUrl,
  form,
  selectedFrame,
  onAccept,
  onRetake,
  onAdjust,
  saving,
  error
}) {
  const formattedName = useMemo(() => formatName(form.fullName), [form.fullName]);

  return (
    <div className="kiosk-card">
      <div className="kiosk-card__header">
        <div>
          <h2 className="kiosk-card__title">Step 3: Preview Your Selfie</h2>
          <p className="kiosk-card__subtitle">
            Review your final Humanness Blood Drive selfie before completing.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {selectedFrame.hasNameArea ? (
        <div className="formatted-name-banner">
          <p>Personalized Campaign Name:</p>
          <strong>{formattedName}</strong>
        </div>
      ) : null}

      <div className="preview-display-card" style={{ aspectRatio: selectedFrame.aspectRatio }}>
        {previewUrl ? (
          <img src={previewUrl} alt="Final Framed Selfie Preview" className="preview-image" />
        ) : (
          <p style={{ padding: '40px', textAlign: 'center' }}>Generating high-res preview...</p>
        )}
      </div>

      <div className="camera-controls-bar" style={{ paddingBottom: '30px' }}>
        <button className="btn btn--secondary" onClick={onAdjust}>
          ✎ Adjust Photo
        </button>

        <button className="btn btn--ghost" onClick={onRetake}>
          ↻ Retake
        </button>

        <button className="btn btn--primary btn--lg" onClick={onAccept} disabled={saving || !previewUrl}>
          {saving ? 'Saving to Cloud...' : '✓ ACCEPT & CONTINUE'}
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   STEP 4: SUCCESS / SHARE SCREEN (DIRECT WHATSAPP CHAT PREFILL)
   ========================================================================== */
function SuccessStep({
  previewUrl,
  previewBlob,
  form,
  selectedFrame,
  onStartNew
}) {
  const [resetCountdown, setResetCountdown] = useState(30);
  const [shareMsg, setShareMsg] = useState('');
  const formattedName = useMemo(() => formatName(form.fullName), [form.fullName]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onStartNew();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onStartNew]);

  const downloadPng = () => {
    if (!previewBlob) return;
    const url = URL.createObjectURL(previewBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SNCF-Humanness-Selfie-${formattedName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareWhatsApp = async () => {
    setShareMsg('');
    const whatsappText = `DHAN NIRANKAR JI 🙏\n\nI participated in the Humanness Blood Drive selfie campaign! Blood should flow in Veins, Not in Drains.\n\n- ${formattedName}`;

    // 1. Download image automatically so user can attach it
    downloadPng();

    // 2. Clean up target phone number (extract digits & add 91 country code if 10-digit)
    let cleanPhone = (form.normalizedPhone || form.whatsappNumber || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    setShareMsg('Framed selfie downloaded to your device! Opening WhatsApp chat...');

    // 3. Open WhatsApp directly targeting the participant's chat
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="kiosk-card">
      <div className="kiosk-card__header">
        <div>
          <h2 className="kiosk-card__title" style={{ color: '#2E7D32' }}>
            🎉 Your Selfie is Ready!
          </h2>
          <p className="kiosk-card__subtitle">
            Thank you for supporting the SNCF Humanness Blood Drive.
          </p>
        </div>
      </div>

      {shareMsg ? <div className="alert alert--success">{shareMsg}</div> : null}

      <div className="preview-display-card" style={{ aspectRatio: selectedFrame.aspectRatio }}>
        {previewUrl ? <img src={previewUrl} alt="Final Selfie" className="preview-image" /> : null}
      </div>

      <div className="camera-controls-bar">
        <button className="btn btn--primary btn--lg" onClick={downloadPng}>
          📥 Download Image (PNG)
        </button>

        <button className="btn btn--whatsapp btn--lg" onClick={shareWhatsApp}>
          📲 Share on WhatsApp
        </button>
      </div>

      <div className="kiosk-auto-reset-banner">
        <p>
          Kiosk will auto-reset in <strong>{resetCountdown}s</strong> for the next donor.
        </p>
        <button
          className="btn btn--secondary"
          style={{ marginTop: '10px', minHeight: '42px', fontSize: '0.9rem' }}
          onClick={onStartNew}
        >
          Start New Selfie Now
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   HIDDEN ADMIN SYSTEM (POWERED BY FIREBASE FIRESTORE + STORAGE)
   ========================================================================== */
function AdminSystem() {
  const [token, setToken] = useState(() => localStorage.getItem('sncf_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [frameFilter, setFrameFilter] = useState('');

  const [activeItem, setActiveItem] = useState(null);

  const verifyAndLoad = async (authToken) => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch from Firebase Firestore
      const firebaseData = await getSubmissionsFromFirebase();
      if (firebaseData && firebaseData.length > 0) {
        setSubmissions(firebaseData);
        return;
      }

      // 2. Fallback to local IndexedDB
      const offlineData = await getOfflineSubmissions();
      setSubmissions(offlineData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyAndLoad(token);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (passwordInput === 'sncf2026') {
      localStorage.setItem('sncf_admin_token', 'firebase_admin_token');
      setToken('firebase_admin_token');
      setPasswordInput('');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('sncf_admin_token', data.token);
        setToken(data.token);
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Invalid password.');
      }
    } catch {
      setAuthError('Invalid admin password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sncf_admin_token');
    setToken('');
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete the record for ${sub.details?.fullName || 'this participant'}?`)) return;
    try {
      // Delete from Firebase Firestore
      await deleteSubmissionFromFirebase(sub.id, sub.firestoreId);
      // Delete from IndexedDB
      await deleteOfflineSubmission(sub.id);

      setSubmissions((prev) => prev.filter((item) => item.id !== sub.id));
      if (activeItem?.id === sub.id) setActiveItem(null);
    } catch {
      alert('Error deleting submission.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Name', 'Formatted Name', 'Age', 'Gender', 'Branch', 'WhatsApp', 'Frame', 'Image URL'];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.createdAt,
      s.details?.fullName,
      s.details?.formattedName,
      s.details?.age,
      s.details?.gender,
      s.details?.branch,
      s.details?.whatsappNumber,
      s.frameId,
      s.imageUrl
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sncf-blood-drive-submissions-${Date.now()}.csv`;
    a.click();
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        sub.details?.fullName?.toLowerCase().includes(q) ||
        sub.details?.whatsappNumber?.toLowerCase().includes(q) ||
        sub.details?.branch?.toLowerCase().includes(q);

      const matchBranch = !branchFilter || sub.details?.branch === branchFilter;
      const matchFrame = !frameFilter || sub.frameId === frameFilter;

      return matchQuery && matchBranch && matchFrame;
    });
  }, [submissions, searchQuery, branchFilter, frameFilter]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = submissions.filter((s) => s.createdAt?.slice(0, 10) === todayStr).length;
    const frame1 = submissions.filter((s) => s.frameId === 'frame-1').length;
    const frame2 = submissions.filter((s) => s.frameId === 'frame-2').length;
    return { total, today, frame1, frame2 };
  }, [submissions]);

  if (!token) {
    return (
      <div className="admin-shell" style={{ maxWidth: '440px', paddingTop: '80px' }}>
        <div className="kiosk-card">
          <h2 className="kiosk-card__title" style={{ textAlign: 'center' }}>
            🔒 Admin Security Login
          </h2>
          <p className="kiosk-card__subtitle" style={{ textAlign: 'center', marginBottom: '20px' }}>
            SNCF Humanness Blood Drive Management System (Firebase Cloud)
          </p>

          {authError ? <div className="alert alert--error">{authError}</div> : null}

          <form onSubmit={handleLogin} className="form-grid">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter admin password (default: sncf2026)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full btn--lg">
              Unlock Dashboard
            </button>
            <a href="/" className="btn btn--ghost btn--full" style={{ marginTop: '8px' }}>
              ← Return to Public Kiosk
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div>
          <h2>SNCF Admin Portal</h2>
          <p style={{ color: 'var(--sncf-muted)', fontSize: '0.9rem' }}>
            Humanness Blood Drive Firebase Cloud Database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn--secondary" onClick={() => verifyAndLoad(token)}>
            ↻ Refresh
          </button>
          <button className="btn btn--primary" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="btn btn--ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card__num">{stats.total}</div>
          <div className="stat-card__label">Total Participants</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__num">{stats.today}</div>
          <div className="stat-card__label">Today's Registrations</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__num">{stats.frame1}</div>
          <div className="stat-card__label">Photo Frame Count</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__num">{stats.frame2}</div>
          <div className="stat-card__label">Name Frame Count</div>
        </div>
      </div>

      <div className="admin-controls-card">
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: '280px', minHeight: '44px' }}
          placeholder="Search name, phone, branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ maxWidth: '180px', minHeight: '44px' }}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>
            {SNCF_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ maxWidth: '160px', minHeight: '44px' }}
            value={frameFilter}
            onChange={(e) => setFrameFilter(e.target.value)}
          >
            <option value="">All Frames</option>
            <option value="frame-1">Frame 1 (Photo)</option>
            <option value="frame-2">Frame 2 (Name)</option>
          </select>
        </div>
      </div>

      {loading ? <p style={{ textAlign: 'center', padding: '20px' }}>Loading submissions from Firebase...</p> : null}
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Full Name</th>
              <th>Formatted Name</th>
              <th>Age</th>
              <th>Branch</th>
              <th>WhatsApp Number</th>
              <th>Frame</th>
              <th>Date & Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((sub) => (
              <tr key={sub.id}>
                <td>
                  <img
                    src={sub.imageUrl}
                    alt={sub.details?.fullName}
                    className="admin-thumb"
                    onClick={() => setActiveItem(sub)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ fontWeight: '600' }}>{sub.details?.fullName}</td>
                <td style={{ color: 'var(--sncf-red)', fontWeight: '600' }}>
                  {sub.details?.formattedName || formatName(sub.details?.fullName)}
                </td>
                <td>{sub.details?.age}</td>
                <td>{sub.details?.branch === 'Other' ? sub.details?.customBranch : sub.details?.branch}</td>
                <td>{sub.details?.whatsappNumber || sub.details?.phone}</td>
                <td>{sub.frameId === 'frame-2' ? 'Photo + Name' : 'Photo Only'}</td>
                <td>{formatDate(sub.createdAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn--secondary"
                      style={{ padding: '4px 10px', minHeight: '34px', fontSize: '0.8rem' }}
                      onClick={() => setActiveItem(sub)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: '4px 10px', minHeight: '34px', fontSize: '0.8rem', color: '#C62828' }}
                      onClick={() => handleDelete(sub)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSubmissions.length === 0 && !loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--sncf-muted)' }}>
                  No submission records found in Firebase Firestore.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {activeItem ? (
        <div className="modal-overlay" onClick={() => setActiveItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit', color: 'var(--sncf-red-burgundy)', marginBottom: '8px' }}>
              {activeItem.details?.formattedName || formatName(activeItem.details?.fullName)}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--sncf-muted)', marginBottom: '16px' }}>
              Branch: {activeItem.details?.branch} | Age: {activeItem.details?.age} | Phone:{' '}
              {activeItem.details?.whatsappNumber}
            </p>
            <img
              src={activeItem.imageUrl}
              alt="Framed Selfie"
              style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--sncf-border)', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <a href={activeItem.imageUrl} download target="_blank" rel="noreferrer" className="btn btn--primary">
                Download PNG
              </a>
              <button className="btn btn--secondary" onClick={() => setActiveItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   MAIN KIOSK APPLICATION CONTAINER
   ========================================================================== */
export default function App() {
  const isAdminPath = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/secure-management');

  if (isAdminPath) {
    return <AdminSystem />;
  }

  return <KioskContainer />;
}

function KioskContainer() {
  const [step, setStep] = useState('welcome');

  const [form, setForm] = useState({
    fullName: '',
    age: '',
    gender: '',
    branch: '',
    customBranch: '',
    whatsappNumber: '',
    normalizedPhone: '',
    consent: false
  });

  const [selectedFrame, setSelectedFrame] = useState(FRAME_CONFIGS[0]);
  const [mirror, setMirror] = useState(true);

  const [capturedSelfie, setCapturedSelfie] = useState(null);

  const [editorState, setEditorState] = useState({
    offsetX: 0,
    offsetY: 0,
    zoom: 1.0,
    rotationDeg: 0,
    mirror: true,
    viewportWidth: 400
  });

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generatePreviewCanvas = async () => {
    if (!capturedSelfie) return;
    try {
      setError('');
      const formattedName = formatName(form.fullName);
      const canvas = await renderFramedSelfie({
        selfieSrc: capturedSelfie.src,
        selfieSize: capturedSelfie,
        editorState,
        frameConfig: selectedFrame,
        formattedName
      });

      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setStep('review');
    } catch (err) {
      setError(err.message || 'Error generating frame preview.');
    }
  };

  const handleAcceptAndSave = async () => {
    if (!previewBlob) return;
    try {
      setSaving(true);
      setError('');

      const formattedName = formatName(form.fullName);
      const details = {
        fullName: form.fullName,
        formattedName,
        age: form.age,
        gender: form.gender,
        branch: form.branch,
        customBranch: form.customBranch,
        whatsappNumber: form.normalizedPhone || form.whatsappNumber
      };

      // 1. Upload framed image to Firestore & save document
      let savedRecord = null;
      try {
        savedRecord = await saveSubmissionToFirebase({
          details,
          frameId: selectedFrame.id,
          mirror: editorState.mirror,
          imageBlob: previewBlob
        });
      } catch (firebaseErr) {
        console.warn('Firebase save warning:', firebaseErr);
      }

      // 2. Save to local IndexedDB backup
      const backupRecord = savedRecord || {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        details,
        frameId: selectedFrame.id,
        imageUrl: previewUrl,
        status: 'Verified'
      };
      await saveOfflineSubmission(backupRecord);

      // 3. Move to Step 4 (Success / Share)
      setStep('share');
    } catch (err) {
      setError(err.message || 'Save error.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartNew = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewBlob(null);
    setCapturedSelfie(null);
    setForm({
      fullName: '',
      age: '',
      gender: '',
      branch: '',
      customBranch: '',
      whatsappNumber: '',
      normalizedPhone: '',
      consent: false
    });
    setSelectedFrame(FRAME_CONFIGS[0]);
    setEditorState({ offsetX: 0, offsetY: 0, zoom: 1.0, rotationDeg: 0, mirror: true, viewportWidth: 400 });
    setStep('welcome');
  };

  return (
    <main className="kiosk-shell">
      <Header />

      {step === 'welcome' ? (
        <div className="hero-card">
          <div className="hero-card__decor" />
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-content__eyebrow">
                <img src={ASSETS.medicalCross} alt="Cross" style={{ width: '16px', height: '16px' }} />
                <span>Sant Nirankari Charitable Foundation</span>
              </div>

              <h1 className="hero-content__title">HUMANNESS BLOOD DRIVE</h1>

              <div className="hero-content__slogan">
                "Blood should flow in Veins, Not in Drains."
              </div>

              <p className="hero-content__sub">
                Donate blood, serve humanity. Create your personalized event selfie frame in 4 easy steps.
              </p>

              <div className="hero-cta-group">
                <button className="btn btn--primary btn--lg" onClick={() => setStep('details')}>
                  CREATE YOUR SELFIE →
                </button>
                <p style={{ fontSize: '0.85rem', color: 'var(--sncf-muted)', marginTop: '4px' }}>
                  Capture • Frame • Preview • Share
                </p>
              </div>
            </div>

            <div className="hero-illustration">
              <img
                src={ASSETS.bloodBag}
                alt="Blood Drive Illustration"
                className="hero-illustration__art floating-drop"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = ASSETS.sncfEmblem;
                }}
              />
              <img src={ASSETS.heartbeat} alt="Heartbeat line" className="heartbeat-line" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <StepIndicator currentStep={step} />

          {step === 'details' ? (
            <DetailsStep form={form} setForm={setForm} onNext={() => setStep('camera')} />
          ) : null}

          {step === 'camera' || step === 'edit' ? (
            <CameraAndAdjustStep
              form={form}
              selectedFrame={selectedFrame}
              setSelectedFrame={setSelectedFrame}
              mirror={mirror}
              setMirror={setMirror}
              editorState={editorState}
              setEditorState={setEditorState}
              onCaptured={(selfie, isMirrored) => {
                setCapturedSelfie(selfie);
                setEditorState((prev) => ({ ...prev, mirror: isMirrored }));
                setStep('edit');
              }}
              onRenderPreview={generatePreviewCanvas}
              onBack={() => setStep('details')}
            />
          ) : null}

          {step === 'review' ? (
            <ReviewStep
              previewUrl={previewUrl}
              form={form}
              selectedFrame={selectedFrame}
              onAccept={handleAcceptAndSave}
              onRetake={() => setStep('camera')}
              onAdjust={() => setStep('edit')}
              saving={saving}
              error={error}
            />
          ) : null}

          {step === 'share' ? (
            <SuccessStep
              previewUrl={previewUrl}
              previewBlob={previewBlob}
              form={form}
              selectedFrame={selectedFrame}
              onStartNew={handleStartNew}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
