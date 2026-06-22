const express = require('express');
const router = express.Router();
const { getPrice, getPrices } = require('../mockPrices');

router.get('/', async (req, res) => {
  try {
    const data = await getPrices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const data = await getPrice(req.params.symbol);
    if (!data) return res.status(404).json({ error: 'Symbol not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

module.exports = router;
