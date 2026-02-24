/**
 * ============================================================
 * DRM 설문 — Google Apps Script 백엔드
 * ============================================================
 * 
 * 【 배포 방법 】
 * 
 * 1. Google Drive (drive.google.com) 접속
 * 2. "새로 만들기" → "Google 스프레드시트" 생성
 *    - 시트 이름을 "Responses"로 변경
 *    - 첫 행(헤더)에 아래 내용 입력:
 *      timestamp | respondentId | episodesJson | diagnosesJson | barrier | schoolMessage | summary
 * 
 * 3. "확장 프로그램" → "Apps Script" 클릭
 * 4. 기존 코드를 모두 지우고 이 파일(Code.gs)의 내용을 붙여넣기
 * 5. 아래 ADMIN_PASSWORD를 원하는 비밀번호로 변경
 * 6. "배포" → "새 배포" 클릭
 *    - 유형: "웹 앱"
 *    - 실행 사용자: "나"
 *    - 액세스 권한: "모든 사용자"
 *    - "배포" 클릭
 * 7. 생성된 URL을 복사하여 js/config.js의 GAS_ENDPOINT에 붙여넣기
 * 
 * 【 업데이트 배포 】
 * - 코드 수정 후 "배포" → "배포 관리" → "새 버전" 으로 업데이트
 * 
 * ============================================================
 */

// ★ 관리자 비밀번호 (반드시 변경하세요!)
const ADMIN_PASSWORD = 'drm2026admin';

// 스프레드시트 시트 이름
const SHEET_NAME = 'Responses';

/**
 * POST 요청 처리 — 학생 응답 저장
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createJsonResponse({ success: false, error: 'Sheet not found' });
    }

    // 고유 응답자 ID 생성
    const respondentId = Utilities.getUuid();
    const timestamp = new Date().toISOString();

    // 요약 정보 계산
    const episodeCount = data.episodes ? data.episodes.length : 0;
    const diagnosisCount = data.diagnoses ? data.diagnoses.length : 0;
    
    // 행 추가
    sheet.appendRow([
      timestamp,
      respondentId,
      JSON.stringify(data.episodes || []),
      JSON.stringify(data.diagnoses || []),
      data.globalReflection ? data.globalReflection.biggestBarrier || '' : '',
      data.globalReflection ? data.globalReflection.schoolMessage || '' : '',
      `에피소드 ${episodeCount}개, 진단 ${diagnosisCount}개`
    ]);

    return createJsonResponse({ 
      success: true, 
      respondentId: respondentId,
      message: '응답이 저장되었습니다.'
    });

  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * GET 요청 처리 — 관리자 데이터 조회
 */
function doGet(e) {
  try {
    const password = e.parameter.password;
    const action = e.parameter.action || 'list';

    // 비밀번호 검증
    if (password !== ADMIN_PASSWORD) {
      return createJsonResponse({ success: false, error: '인증 실패: 비밀번호가 올바르지 않습니다.' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ success: false, error: 'Sheet not found' });
    }

    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return createJsonResponse({ success: true, data: [], count: 0 });
    }

    // 헤더 행 제외하고 데이터 가져오기
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 7);
    const values = dataRange.getValues();

    const responses = values.map(function(row) {
      return {
        timestamp: row[0] instanceof Date ? row[0].toISOString() : row[0],
        respondentId: row[1],
        episodes: tryParse(row[2]),
        diagnoses: tryParse(row[3]),
        barrier: row[4],
        schoolMessage: row[5],
        summary: row[6]
      };
    });

    return createJsonResponse({ 
      success: true, 
      data: responses, 
      count: responses.length 
    });

  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * JSON 안전 파싱
 */
function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

/**
 * CORS 대응 JSON 응답 생성
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
