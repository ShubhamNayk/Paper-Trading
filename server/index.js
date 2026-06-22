const express = require('express');
const cors    = require('cors');
const path    = require('path');
const authenticate = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Public — no auth needed
app.use('/api/prices',  require('./routes/prices'));
app.use('/api/history', require('./routes/history'));

// Protected — must carry a valid Google ID token
app.use('/api/portfolio',    authenticate, require('./routes/portfolio'));
app.use('/api/trade',        authenticate, require('./routes/trade'));
app.use('/api/transactions', authenticate, require('./routes/transactions'));
app.use('/api/orders',       authenticate, require('./routes/orders'));
app.use('/api/wallet',       authenticate, require('./routes/wallet'));
app.use('/api/mutualfunds',  authenticate, require('./routes/mutualfunds'));
app.use('/api/fno',          authenticate, require('./routes/fno'));

// Serve React build in production (single URL for both frontend + backend)
if (process.env.NODE_ENV === 'production') {
  const build = path.join(__dirname, '../client/build');
  app.use(express.static(build));
  app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

require('./workers/orderEngine').startOrderEngine();
