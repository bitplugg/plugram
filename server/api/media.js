const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const tgClient = require('../telegram/client');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ path: req.file.path, filename: req.file.filename, originalname: req.file.originalname });
});

router.post('/send', upload.single('file'), async (req, res) => {
  try {
    const { dialogId, replyTo } = req.body;
    if (!req.file || !dialogId) return res.status(400).json({ error: 'Missing file or dialogId' });
    const result = await tgClient.sendMedia(dialogId, req.file.path, replyTo || null);
    res.json({ success: true, id: result?.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:dialogId/:messageId', async (req, res) => {
  try {
    const { dialogId, messageId } = req.params;
    const client = tgClient.getClient();
    if (!client) return res.status(401).json({ error: 'Not connected' });
    const peer = await client.getEntity(Number(dialogId));
    const msgs = await client.getMessages(peer, { ids: [Number(messageId)] });
    if (!msgs || msgs.length === 0 || !msgs[0].media) return res.status(404).json({ error: 'No media' });
    const ext = '.bin';
    const outPath = path.join(uploadsDir, `media-${messageId}${ext}`);
    await tgClient.downloadMedia(msgs[0], outPath);
    res.sendFile(outPath);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
