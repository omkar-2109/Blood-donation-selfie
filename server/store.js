import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(dataDir, 'submissions');
const indexPath = path.join(dataDir, 'submissions.json');

async function ensureStorage() {
  await fs.mkdir(uploadsDir, { recursive: true });
  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(indexPath, '[]', 'utf8');
  }
}

async function readIndex() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries) {
  await ensureStorage();
  const tempPath = `${indexPath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(entries, null, 2), 'utf8');
  try {
    await fs.rename(tempPath, indexPath);
  } catch (error) {
    if (error.code === 'EEXIST' || error.code === 'EPERM') {
      await fs.rm(indexPath, { force: true });
      await fs.rename(tempPath, indexPath);
      return;
    }
    throw error;
  }
}

function cleanText(value, maxLen = 200) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLen);
}

export async function listSubmissions() {
  const entries = await readIndex();
  return entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function saveSubmission({ details, frameId, mirror, imageBuffer, mimeType }) {
  await ensureStorage();
  const id = crypto.randomUUID();
  const imageExtension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const fileName = `${id}.${imageExtension}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, imageBuffer);

  const entry = {
    id,
    createdAt: new Date().toISOString(),
    details: {
      fullName: cleanText(details.fullName, 120),
      formattedName: cleanText(details.formattedName || details.fullName, 140),
      age: cleanText(details.age, 10),
      gender: cleanText(details.gender || 'Not specified', 30),
      branch: cleanText(details.branch, 100),
      customBranch: cleanText(details.customBranch, 100),
      whatsappNumber: cleanText(details.whatsappNumber || details.phone, 30),
      notes: cleanText(details.notes, 300)
    },
    frameId: cleanText(frameId, 80),
    mirror: Boolean(mirror),
    imageFile: fileName,
    imageUrl: `/uploads/${fileName}`,
    imageMimeType: mimeType,
    imageSizeBytes: imageBuffer.length,
    status: 'Verified'
  };

  const entries = await readIndex();
  entries.push(entry);
  await writeIndex(entries);
  return entry;
}

export async function deleteSubmission(id) {
  if (!id) return false;
  const entries = await readIndex();
  const targetIndex = entries.findIndex((e) => e.id === id);
  if (targetIndex === -1) return false;

  const [removed] = entries.splice(targetIndex, 1);
  await writeIndex(entries);

  // Attempt to delete stored image file
  if (removed && removed.imageFile) {
    try {
      await fs.unlink(path.join(uploadsDir, removed.imageFile));
    } catch {
      // Ignore if file was already removed
    }
  }

  return true;
}

export async function exportSubmissionsCSV() {
  const entries = await listSubmissions();

  const headers = [
    'ID',
    'Created At',
    'Full Name',
    'Formatted Name (With Ji)',
    'Age',
    'Gender',
    'Branch',
    'Custom Branch',
    'WhatsApp Number',
    'Frame ID',
    'Mirror Mode',
    'Status',
    'Image URL'
  ];

  const escapeCSV = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const rows = entries.map((entry) => [
    escapeCSV(entry.id),
    escapeCSV(entry.createdAt),
    escapeCSV(entry.details?.fullName),
    escapeCSV(entry.details?.formattedName),
    escapeCSV(entry.details?.age),
    escapeCSV(entry.details?.gender),
    escapeCSV(entry.details?.branch),
    escapeCSV(entry.details?.customBranch),
    escapeCSV(entry.details?.whatsappNumber),
    escapeCSV(entry.frameId),
    escapeCSV(entry.mirror ? 'ON' : 'OFF'),
    escapeCSV(entry.status || 'Verified'),
    escapeCSV(entry.imageUrl)
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
