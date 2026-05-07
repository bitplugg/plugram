const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');

router.get('/', async (req, res) => {
  try {
    const contacts = await tgClient.getContacts();
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
