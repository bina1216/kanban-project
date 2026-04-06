import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [selectedCard, setSelectedCard] = useState(null); 
  const [assigneeList, setAssigneeList] = useState(['이승빈', '김철수', '박지민']);
  const [tagList, setTagList] = useState(['기획', '아트', '프로그래밍', '디자인']);
  
  const [newCard, setNewCard] = useState({ 
    title: '', assignee: '', startDate: '', dueDate: '', tag: '', priority: '중', link: '', description: '' , color: '#e9ecef'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [tempAssignee, setTempAssignee] = useState('');
  const [tempTag, setTempTag] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortType, setSortType] = useState('카드제작순');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewType, setViewType] = useState('전체');
  const [activeColumn, setActiveColumn] = useState(1);
  const [draggedCard, setDraggedCard] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const PALETTE = ['#e9ecef', '#ffc9c9', '#ffd8a8', '#fff3bf', '#d3f9d8', '#c5f6fa', '#d0ebff', '#f3f0ff'];

  const getDDayInfo = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

  const toYYYYMMDD = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000; 
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const initialCardState = {
    title: '', description: '', due_date: '', assignee: '', priority: '하', tag: '기획', color: '#ffffff' 
  };

  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    try {
      const res = await axios.get('http://localhost:4000/cards');
      setCards(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("데이터 로딩 실패:", err); }
  };

  const resetForm = () => {
    setNewCard({ title: '', assignee: '', startDate: '', dueDate: '', tag: '', priority: '중', link: '', description: '', color: '#e9ecef' });
    setSelectedFile(null);
    setIsEditMode(false);
    setIsModalOpen(false);
  };

  const handleEditClick = () => {
    if (!selectedCard) return;
    setNewCard({
      title: selectedCard.title || '',
      assignee: selectedCard.assignee || '',
      startDate: toYYYYMMDD(selectedCard.start_date) || '', // 함수 적용
      dueDate: toYYYYMMDD(selectedCard.due_date) || '',
      tag: selectedCard.tag || '',
      priority: selectedCard.priority || '중',
      link: selectedCard.link || '',
      description: selectedCard.description || '',
      color: selectedCard.color || '#e9ecef'
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // ★ 수정 포인트: JSON과 FormData를 구분해서 전송하여 "저장 실패" 해결
  const handleSave = async () => {
    if (!newCard.title) return alert("제목을 입력해주세요!");
    
    // 전송할 기본 데이터 객체
    const cardData = {
      title: newCard.title,
      description: newCard.description,
      assignee: newCard.assignee,
      start_date: newCard.startDate,
      due_date: newCard.dueDate,
      tag: newCard.tag,
      priority: newCard.priority,
      link: newCard.link,
      column_id: isEditMode ? selectedCard.column_id : activeColumn,
      color: newCard.color
    };

    try {
      if (isEditMode) {
        // [수정 모드]
        if (selectedFile) {
          // 이미지가 있으면 FormData 사용
          const formData = new FormData();
          Object.keys(cardData).forEach(key => formData.append(key, cardData[key]));
          formData.append('image', selectedFile);
          await axios.put(`http://localhost:4000/cards/${selectedCard.id}`, formData);
        } else {
          // 이미지 없으면 JSON으로 전송 (백엔드 호환성 높임)
          await axios.put(`http://localhost:4000/cards/${selectedCard.id}`, cardData);
        }
      } else {
        // [신규 생성 모드]
        const formData = new FormData();
        Object.keys(cardData).forEach(key => formData.append(key, cardData[key]));
        if (selectedFile) formData.append('image', selectedFile);
        await axios.post('http://localhost:4000/cards', formData);
      }
      
      fetchCards();
      setSelectedCard(null); 
      resetForm();
      alert(isEditMode ? "수정이 완료되었습니다!" : "새 카드가 생성되었습니다!");
    } catch (err) {
      console.error(err);
      alert("저장 실패. 서버 로그나 F12 콘솔을 확인하세요.");
    }
  };

  const onDragStart = (card) => { setDraggedCard(card); };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = async (columnId) => {
    if (!draggedCard || draggedCard.column_id === columnId) return;
    try {
      await axios.put(`http://localhost:4000/cards/${draggedCard.id}`, {
        ...draggedCard,
        column_id: columnId,
        start_date: toYYYYMMDD(draggedCard.start_date),
        due_date: toYYYYMMDD(draggedCard.due_date)
      });
      fetchCards();
      setDraggedCard(null);
    } catch (err) { console.error("이동 실패:", err); }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`http://localhost:4000/cards/${id}`);
      setSelectedCard(null);
      fetchCards();
    } catch (err) { alert("삭제 실패"); }
  };

  // --- [필터링/정렬/진행률 로직 동일] ---
  const displayCards = (() => {
    let filtered = [...cards];
    if (viewType !== '전체') filtered = filtered.filter(card => card.tag === viewType || card.assignee === viewType);
    filtered.sort((a, b) => {
      if (sortType === '마감일순') return new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31');
      if (sortType === '중요도순') {
        const priorityMap = { '상': 3, '중': 2, '하': 1 };
        return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      }
      if (sortType === '담당자순') return (a.assignee || '').localeCompare(b.assignee || '');
      return b.id - a.id; 
    });
    return filtered;
  })();

  const total = cards.length;
  const doneCount = cards.filter(c => c.column_id === 3).length;
  const inProgressCount = cards.filter(c => c.column_id === 2).length;
  const todoCount = cards.filter(c => c.column_id === 1).length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const doneWidth = total > 0 ? (doneCount / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgressCount / total) * 100 : 0;
  const todoWidth = total > 0 ? (todoCount / total) * 100 : 0;

  const formatDate = (dateStr) => dateStr ? String(dateStr).split('T')[0] : "-";
  const formatDesc = (text) => text && text.length > 40 ? text.substring(0, 40) + '...' : text || "";

  return (
    <div className="app-container">
      <header className="app-header"><h1 className="project-title">프로젝트 칸반 보드</h1></header>

      <div className="filter-bar">
        <div className="dropdown-wrapper">
          <div className="dropdown" onClick={() => setIsSortOpen(!isSortOpen)}>{sortType} ∨</div>
          {isSortOpen && (
            <ul className="dropdown-menu">
              {['카드제작순', '중요도순', '담당자순', '마감일순'].map(item => (
                <li key={item} onClick={() => { setSortType(item); setIsSortOpen(false); }}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="dropdown-wrapper">
          <div className="dropdown" onClick={() => setIsViewOpen(!isViewOpen)}>{viewType} ∨</div>
          {isViewOpen && (
            <ul className="dropdown-menu">
              <li onClick={() => { setViewType('전체'); setIsViewOpen(false); }}>전체</li>
              {assigneeList.map(item => <li key={item} onClick={() => { setViewType(item); setIsViewOpen(false); }}>{item}</li>)}
              {tagList.map(item => <li key={item} onClick={() => { setViewType(item); setIsViewOpen(false); }}>{item}</li>)}
            </ul>
          )}
        </div>
        <div className="progress-section">
          <div className="multi-progress-bar">
            <div className="progress-segment done" style={{ width: `${doneWidth}%` }}></div>
            <div className="progress-segment in-progress" style={{ width: `${inProgressWidth}%` }}></div>
            <div className="progress-segment todo" style={{ width: `${todoWidth}%` }}></div>
          </div>
          <span className="progress-percentage">{progressPercent}%</span>
        </div>
      </div>

      <div className="board-layout">
        <div className="board-main">
          {[{ id: 1, label: 'To Do' }, { id: 2, label: 'In Progress' }, { id: 3, label: 'Done' }].map((col) => (
            <div key={col.id} className="board-column" onDragOver={onDragOver} onDrop={() => onDrop(col.id)}>
              <header className="column-header">
                <h2 className="column-title">{col.label}</h2>
                <span className="card-count">{displayCards.filter(c => c.column_id === col.id).length}</span>
              </header>
              <div className="card-list">
                {displayCards.filter(c => c.column_id === col.id).map(card => (
                  <div 
                    key={card.id} 
                    className="card-item" 
                    draggable 
                    onDragStart={() => onDragStart(card)} 
                    onClick={() => setSelectedCard(card)} // ★ 태그 안으로 정확히 수정
                  >
                    {/* 2. 상단 색상 줄 추가 */}
                    <div 
                      className="card-color-bar" 
                      style={{ backgroundColor: card.color || '#ffffff' }}
                    ></div>
                
                    <div className="card-row">
                      <h3 className="card-title">{card.title}</h3>
                    </div>

                    <p className="card-desc">{formatDesc(card.description)}</p>

                    <div className="card-date-row">
                      <span className="card-tag">* {card.tag}</span> 
                      {card.column_id !== 3 && (() => { // Done 컬럼이 아닐 때만 표시
                          const diff = getDDayInfo(card.due_date);
                          if (diff === null) return null;

                          if (diff < 0) {
                            // 마감일 지난 경우: 테두리만 있는 빨간 원 + !
                            return <span className="overdue-icon">!</span>;
                          }

                          // 채도 낮은 뮤트톤 색상 설정
                          let dDayColor = "#888"; // 기본 회색 (D-3 이상)
                          if (diff === 0) dDayColor = "#ff7675";      // D-day (뮤트 레드)
                          else if (diff === 1) dDayColor = "#f3a683"; // D-1 (뮤트 오렌지)
                          else if (diff === 2) dDayColor = "#f7d794"; // D-2 (뮤트 옐로)

                          return (
                            <span className="card-date" style={{ color: dDayColor, fontWeight: '600' }}>
                              {diff === 0 ? "D-day" : `D-${diff}`}
                            </span>
                          );
                        })()}
                      </div>
                    <div className="card-footer">
                      <div className="assignee-box">{card.assignee}</div>
                      <div className="footer-icons">
                        <span className="priority-icon">{card.priority}</span>
                        {card.image_url && (
                          <div className="image-hover-container">
                            <span className="image-icon">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                            </span>
                            <img src={`http://localhost:4000${card.image_url}`} className="hover-preview-img" alt="preview" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="add-card-btn-icon" onClick={() => { resetForm(); setActiveColumn(col.id); setIsModalOpen(true); }}>+</button>
            </div>
          ))}
        </div>

        <aside className={`detail-panel ${selectedCard ? 'open' : ''}`}>
          {selectedCard && (
            <>
              <div className="panel-header-actions">
                <button className="panel-edit-btn" onClick={handleEditClick}>수정</button>
                <button className="panel-delete-btn-top" onClick={() => handleDeleteCard(selectedCard.id)}>카드 삭제</button>
                <button className="panel-close-btn" onClick={() => setSelectedCard(null)}>❯</button>
              </div>
              <h2 className="panel-title">{selectedCard.title}</h2>
              <div className="panel-info-grid">
                <div className="info-row"><span>진행상태</span><strong>{selectedCard.column_id === 1 ? 'TODO' : selectedCard.column_id === 2 ? 'IN PROGRESS' : 'DONE'}</strong></div>
                <div className="info-row"><span>담당자</span><strong>{selectedCard.assignee || '-'}</strong></div>
                <div className="info-row"><span>진행예정일</span><strong>{formatDate(selectedCard.start_date)}</strong></div>
                <div className="info-row"><span>목표 마감일</span><strong>{formatDate(selectedCard.due_date)}</strong></div>
                <div className="info-row"><span>태그</span><strong>{selectedCard.tag || '-'}</strong></div>
                <div className="info-row"><span>중요도</span><strong>{selectedCard.priority}</strong></div>
                <div className="info-row"><span>링크</span>{selectedCard.link ? <a href={selectedCard.link} target="_blank" rel="noreferrer" className="panel-link">바로가기</a> : <strong>없음</strong>}</div>
              </div>
              <hr className="panel-divider" /><div className="panel-desc-section"><h3 className="panel-label">상세 설명</h3><div className="panel-desc-box">{selectedCard.description}</div></div>
            </>
          )}
        </aside>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <div style={{marginBottom: '5px', fontSize: '12px', color: '#888'}}>{isEditMode ? "카드 수정하기" : "새 카드 만들기"}</div>
              <input type="text" className="modal-title-input" placeholder="카드 제목" value={newCard.title} onChange={(e) => setNewCard({...newCard, title: e.target.value})} />
              <div className="modal-header-btns">
                <button className="complete-btn" onClick={handleSave}>{isEditMode ? "수정 완료" : "생성 완료"}</button>
                <button className="close-btn" onClick={resetForm}>X</button>
              </div>
            </header>
            <div className="modal-body">
              <div className="form-row">
                <label>담당자</label>
                <select value={newCard.assignee} onChange={(e) => setNewCard({...newCard, assignee: e.target.value})}><option value="">선택</option>{assigneeList.map(a => <option key={a} value={a}>{a}</option>)}</select>
                <input type="text" placeholder="새 이름" value={tempAssignee} onChange={(e) => setTempAssignee(e.target.value)} />
                <button className="mini-add-btn" onClick={() => { if(tempAssignee) setAssigneeList([...assigneeList, tempAssignee]); setTempAssignee(''); }}>+</button>
              </div>
              <div className="form-row"><label>진행 예정일</label><input type="date" className="date-input" value={newCard.startDate} onChange={(e) => setNewCard({...newCard, startDate: e.target.value})} /></div>
              <div className="form-row"><label>목표 마감일</label><input type="date" className="date-input" value={newCard.dueDate} onChange={(e) => setNewCard({...newCard, dueDate: e.target.value})} /></div>
              <div className="form-row">
                <label>태그</label>
                <select value={newCard.tag} onChange={(e) => setNewCard({...newCard, tag: e.target.value})}><option value="">선택</option>{tagList.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <input type="text" placeholder="새 태그" value={tempTag} onChange={(e) => setTempTag(e.target.value)} />
                <button className="mini-add-btn" onClick={() => { if(tempTag) setTagList([...tagList, tempTag]); setTempTag(''); }}>+</button>
              </div>
              <div className="form-row"><label>중요도</label><div className="priority-selector">{['상', '중', '하'].map(p => (<button key={p} className={`priority-btn ${newCard.priority === p ? 'active' : ''}`} onClick={() => setNewCard({...newCard, priority: p})}>{p}</button>))}</div></div>
              <div className="form-row">
                <label>카드 색상</label>
                <div className="priority-selector"> {/* 기존 CSS 재활용 */}
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`priority-btn ${newCard.color === c ? 'active' : ''}`}
                      style={{ 
                        backgroundColor: c, 
                        border: newCard.color === c ? '2px solid #333' : '1px solid #ddd' 
                      }}
                      onClick={() => setNewCard({ ...newCard, color: c })}
                    >
                      {/* 선택된 색상임을 알리는 체크 표시 등을 넣을 수 있습니다 */}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row"><label>첨부 링크</label><input type="text" placeholder="URL 입력" value={newCard.link} onChange={(e) => setNewCard({...newCard, link: e.target.value})} /></div>
              <div className="form-row"><label>에셋 이미지</label><input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} /></div>
              <div className="form-row-vertical"><label>상세 설명</label><textarea rows="6" placeholder="내용 입력" value={newCard.description} onChange={(e) => setNewCard({...newCard, description: e.target.value})}></textarea></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App;