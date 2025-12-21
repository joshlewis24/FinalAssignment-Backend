const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/mailer');
const auth = require('../middleware/auth');

// Admin-only test email endpoint
router.post('/test-email', auth('admin'), async (req, res) => {
  try {
    const { to, subject = 'Test Email', text = 'Hello from Fleet Admin', html } = req.body || {};
    if (!to) return res.status(400).json({ message: 'Missing to' });
    const info = await sendEmail({ to, subject, text, html });
    res.json({ message: 'Email attempted', id: info.messageId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
