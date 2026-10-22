import express from 'express';
import { chatWithAI } from '../services/groqService.js';

const router = express.Router();
const sessions = new Map();

router.post('/message', async (req, res, next) => {
  try {
    const { message, sessionId, resumeContext } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });
    if (message.length > 4000) return res.status(400).json({ error: 'Message is too long (max 4000 characters)' });
    // Without a session id every visitor would share one conversation
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const sid = String(sessionId);
    if (!sessions.has(sid)) {
      // Keep memory bounded: drop the oldest conversation once there are too many
      if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value);
      sessions.set(sid, []);
    }
    const history = sessions.get(sid);
    const userMessage = { role: 'user', content: message };
    const reply = await chatWithAI([...history.slice(-19), userMessage], String(resumeContext || '').slice(0, 6000));
    // Only remember the exchange once the AI has answered, so a failed call can be retried cleanly
    history.push(userMessage, { role: 'assistant', content: reply });
    if (history.length > 40) history.splice(0, history.length - 40);
    res.json({ success: true, data: { reply, sessionId: sid } });
  } catch (err) {
    next(err);
  }
});

router.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

export default router;
