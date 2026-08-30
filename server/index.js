import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateAdmin, invalidateToken, requireAdminAuth, verifySessionToken } from './auth.js';
import { deleteSubmission, exportSubmissionsCSV, listSubmissions, saveSubmission } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const uploadsDir = path.join(rootDir, 'data', 'submissions');

const app = express();

// Configure body parser and multer
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max frame image upload
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/* ==========================================================================
   PUBLIC KIOSK ENDPOINTS
   ========================================================================== */

/**
 * Save new kiosk visitor submission (no login required for kiosk)
 */
app.post('/api/submissions', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Framed image file is required.' });
    }

    const details = JSON.parse(req.body.details || '{}');
    const frameId = req.body.frameId || '';
    const mirror = req.body.mirror === 'true';

    if (!details.fullName || !details.age || !details.branch || !details.whatsappNumber) {
      return res.status(400).json({ message: 'Missing required visitor details (Full Name, Age, Branch, WhatsApp Number).' });
    }

    const saved = await saveSubmission({
      details,
      frameId,
      mirror,
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype || 'image/png'
    });

    res.status(201).json({ success: true, submission: saved });
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   ADMIN AUTHENTICATION ENDPOINTS
   ========================================================================== */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const result = authenticateAdmin(password);

  if (result.success) {
    return res.json({ success: true, token: result.token });
  }

  res.status(401).json({ success: false, message: result.message || 'Invalid admin credentials.' });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  invalidateToken(token);
  res.json({ success: true });
});

app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const valid = verifySessionToken(token);
  res.json({ authenticated: valid });
});

/* ==========================================================================
   PROTECTED ADMIN ENDPOINTS (Requires Auth)
   ========================================================================== */

app.get('/api/admin/submissions', requireAdminAuth, async (_req, res, next) => {
  try {
    const submissions = await listSubmissions();
    res.json({ submissions });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/submissions/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSubmission(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Submission record not found.' });
    }

    res.json({ success: true, message: 'Submission deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/export/csv', requireAdminAuth, async (_req, res, next) => {
  try {
    const csvContent = await exportSubmissionsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sncf-blood-drive-submissions-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   STATIC FILE SERVING & SPA FALLBACK
   ========================================================================== */

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Error handling middleware
app.use((error, _req, res, _next) => {
  console.error('[SERVER ERROR]', error);
  res.status(500).json({
    message: error.message || 'Internal server error.'
  });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[SNCF Kiosk Server] Running on http://localhost:${port}`);
});
