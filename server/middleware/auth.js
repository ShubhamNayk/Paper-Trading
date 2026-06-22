const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '987814597203-qq2p1gqpe7pc6q26ldidqsvjt2k45chn.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
    req.user = ticket.getPayload(); // { email, name, picture, sub, ... }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
