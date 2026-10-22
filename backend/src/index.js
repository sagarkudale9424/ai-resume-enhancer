import 'dotenv/config';
import { checkConfig } from './lib/config.js';
import { createApp } from './app.js';

try {
  checkConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

const PORT = process.env.PORT || 5000;
createApp().listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
