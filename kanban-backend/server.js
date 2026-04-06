const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 1. 업로드된 파일에 접근할 수 있게 설정
app.use('/uploads', express.static('uploads'));

// 2. Multer 설정 (파일 저장소)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); 
    }
});
const upload = multer({ storage: storage });

// 3. DB 연결 (포트 3307 확인됨)
const db = mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '1234',
    database: 'kanban_db'
});

db.connect((err) => {
    if (err) {
        console.error('DB 연결 실패:', err);
        return;
    }
    console.log('데이터베이스 연결 성공 (3307)');
});

/** --- API 경로 정리 --- **/

// [조회] 전체 카드 가져오기
app.get('/cards', (req, res) => {
    const sql = "SELECT * FROM cards";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// [생성] 카드 정보 + 이미지 업로드 통합
app.post('/cards', upload.single('image'), (req, res) => {
    // 프론트의 formData.append 이름과 100% 일치해야 함
    const { 
        column_id, title, description, priority, 
        assignee, start_date, due_date, tag, link, color
    } = req.body; 
    
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO cards 
        (column_id, title, description, priority, assignee, start_date, due_date, tag, link, image_url, color) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        column_id || 1, 
        title, 
        description || '', 
        priority || '중', 
        assignee || '', 
        start_date || null, 
        due_date || null, 
        tag || '', 
        link || '', 
        image_url,
        color || '#e9ecef'
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('DB 저장 에러:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: '성공', id: result.insertId });
    });
});
// [수정 & 이동] 제목, 상태, 컬럼 위치 변경
app.put('/cards/:id', (req, res) => {
    const { id } = req.params;
    // 기존 필드들 + color 추가
    const { 
        title, status, column_id, description, priority, 
        due_date, assignee, tag, link, color 
    } = req.body;
    

    const sql = `UPDATE cards SET 
        title = ?, status = ?, column_id = ?, description = ?, priority = ?, 
        due_date = ?, assignee = ?, tag = ?, link = ?, color = ? 
        WHERE id = ?`;
    
    const values = [
        title, status, column_id, description, priority, 
        due_date, assignee, tag, link, color, 
        id
    ];
    
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '수정 완료' });
    });
});

// [삭제]
app.delete('/cards/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM cards WHERE id = ?";
    
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '삭제 완료' });
    });
});

// 서버 시작
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});