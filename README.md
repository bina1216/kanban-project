
1. 실험의 목적 및 범위

1.1 목적
본 프로젝트는 게임 개발 파이프라인(기획, 에셋 제작, 스크립트 작성 등)에서 발생하는 복잡한 작업 과정을 시각적으로 체계화하여 관리할 수 있는 시각적 협업 툴을 개발하는 것을 목적으로 함.

React와 REST API를 활용한 비동기 데이터 통신을 통해 사용자에게 끊김 없는 작업 환경을 제공하고, 개발 지연 요소를 실시간으로 파악하여 게임 개발의 생산성을 극대화하고자 함.

1.2 범위 (구현 기능)
1) 카드 데이터 구성
- 기본 정보: 카드 제목, 상세 설명, 카드 색상
- 일정 관리: 진행 예정일, 목표 마감일, D-day
- 분류 및 우선순위: 담당자, 태그, 중요도(우선순위) 설정
- 에셋 관리: 외부 첨부 링크, 에셋 이미지 업로드 및 미리보기

2) 시스템 주요 기능
- 카드 상세 내용 보기 패널: 카드 클릭 시 우측 슬라이드 패널을 통해 상세 정보를 조회 및 수정할 수 있는 기능.
- 작업 단계 이동(드래그 앤 드롭): 드래그 앤 드롭 방식을 이용한 카드의 작업 상태(To Do, In Progress, Done) 변경 기능.
- 맞춤형 정렬 및 필터링: 카드 제작순, 마감일순, 중요도순으로 카드를 정렬하거나, 특정 담당자 및 태그를 선택하여 필요한 작업만 골라볼 수 있는 기능.
- 진행 현황 시각화: 전체 작업 진행률을 시각화하고, 마감 기한에 따라 4단계로 변하는 D-day 기능.

1.3 제외 범위 (불포함 내용)
- 검색 기능: 키워드를 통한 카드 검색 기능.
- 로그인 기능: 개인용 도구 목적에 따른 사용자 인증 및 회원가입 기능.
- 

2. 분석

2.1 개발 및 운영 환경 
- 언어 및 프레임워크: JavaScript, React, Node.js
- 데이터베이스: MySQL
- 통신 방식: REST API
   
2.2 유스케이스
![유스케이스 다이어그램](usecase.png)
  
2.3 시스템 상세 명세

| 기능명 | 세부 요구사항 및 동작 명세 | 중요도 |
| :--- | :--- | :---: |
| **카드 관리 (CRUD)** | 새로운 작업을 등록하고 내용을 수정하거나 삭제함. 모든 데이터는 DB와 실시간으로 연동됨. | 상 |
| **상세 정보** | 제목, 마감일, 담당자, 우선순위, 참고 링크, 에셋 이미지 등 프로젝트 관리에 필요한 정보를 카드에 저장. | 상 |
| **드래그 앤 드롭** | 드래그 앤 드롭을 통한 상태 변경(To Do/In Progress/Done) 및 상세 정보 패널 제공 | 상 |
| **정렬 및 필터링** | 카드 제작순, 마감일순, 중요도순 정렬 및 담당자/태그별 필터링 기능 | 중 |
| **D-day 및 진행률** | 마감 기에 따른 4단계 D-day 색상 알림 및 전체 작업 진행률 시각화 | 상 |


3. 설계

3.1 클래스 다이어그램

```mermaid
classDiagram
    class App_React {
        +cards: Array
        +fetchCards()
        +handleSave()
        +onDrop(columnId)
        +getDDayInfo(dueDate)
    }
    class Column {
        +label: String (To Do / In Progress / Done)
        +id: int (1, 2, 3)
    }
    class Card {
        +title: String
        +description: String
        +assignee: String
        +priority: String
        +due_date: Date
        +tag: String
        +color: String
    }
    class Express_Server {
        +app.get('/cards')
        +app.post('/cards')
        +app.put('/cards/:id')
    }
    class MySQL_DB {
        <<Table>>
        cards
    }

    App_React "1" --* "3" Column : 관리 및 렌더링
    Column "1" --* "n" Card : 데이터 매핑
    App_React ..> Express_Server : Axios 통신
    Express_Server --> MySQL_DB : SQL 쿼리 실행
```

3.2 순서 다이어그램
```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as App.jsx (React)
    participant B as server.js (Node.js)
    participant D as MySQL

    U->>F: 카드를 다른 컬럼으로 드롭 (onDrop)
    F->>B: axios.put('/cards/:id', { ...draggedCard, column_id })
    B->>D: UPDATE cards SET column_id = ? WHERE id = ?
    D-->>B: Query Success
    B-->>F: res.json({ message: '수정 완료' })
    F->>F: fetchCards() 호출 (화면 갱신)
```

3.3 순서도
```mermaid
graph TD
    Start([카드가 드롭됨]) --> Check{유효한 구역인가?}
    Check -- No --> Rollback[원래 위치로 복구]
    Check -- Yes --> UpdateUI[화면 상태 변경]
    UpdateUI --> SendAPI[서버에 데이터 전송]
    SendAPI --> Success{응답 성공?}
    Success -- Yes --> Finish([최종 상태 확정])
    Success -- No --> ErrorRollback[에러 알림 및 UI 롤백]
```
