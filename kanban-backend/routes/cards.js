const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 아까 만든 db.js를 불러옵니다.

// 카드 전체 조회
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Cards ORDER BY card_id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  // 클라이언트가 보낸 데이터들을 받아옵니다.
  const { column_id, title, description, priority } = req.body;
  
  try {
    const [result] = await db.query(
      'INSERT INTO Cards (column_id, title, description, priority) VALUES (?, ?, ?, ?)',
      [column_id, title, description, priority]
    );
    // 성공하면 생성된 카드의 ID를 돌려줍니다.
    res.json({ success: true, cardId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 여기에 나중에 PATCH(상태변경), POST(생성) 코드를 추가할 겁니다!
module.exports = router;