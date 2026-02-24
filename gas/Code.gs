// ========================================================
// DRM Survey — Google Apps Script Backend
// 3개 시트에 개별 셀로 저장
//   - Responses : 응답 종합 (1행 = 1명)
//   - Episodes  : 에피소드 (1행 = 1에피소드)
//   - Diagnoses : 진단 결과 (1행 = 1진단)
// ========================================================

// ★ 관리자 비밀번호
const ADMIN_PASSWORD = 'drm2026admin';

// ──────────────── POST: 설문 저장 ────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const respondentId = Utilities.getUuid();
    const timestamp = new Date().toISOString();

    const episodes = data.episodes || [];
    const diagnoses = data.diagnoses || [];
    const barrier = data.globalReflection ? data.globalReflection.biggestBarrier || '' : '';
    const schoolMsg = data.globalReflection ? data.globalReflection.schoolMessage || '' : '';

    // 1) Responses 시트 — 종합 정보
    const respSheet = getOrCreateSheet(ss, 'Responses', [
      '응답시각', '응답자ID', '에피소드수', '진단수', '가장큰장벽', '학교에바라는말'
    ]);
    respSheet.appendRow([
      timestamp, respondentId,
      episodes.length, diagnoses.length,
      barrier, schoolMsg
    ]);

    // 2) Episodes 시트 — 에피소드 상세
    const epSheet = getOrCreateSheet(ss, 'Episodes', [
      '응답자ID', '에피소드번호', '시작시간', '종료시간', '활동내용', '장소', '동행인'
    ]);
    episodes.forEach(function(ep, i) {
      epSheet.appendRow([
        respondentId, i + 1,
        ep.startTime || '', ep.endTime || '',
        ep.activity || '', ep.location || '', ep.companion || ''
      ]);
    });

    // 3) Diagnoses 시트 — 진단 상세
    const diagSheet = getOrCreateSheet(ss, 'Diagnoses', [
      '응답자ID', '에피소드ID', '활동', '정보', '정보원', '시간지각',
      '기회_선택', '기회_유연', '즐거움', '자신감', '불안함', '지루함'
    ]);
    diagnoses.forEach(function(d) {
      diagSheet.appendRow([
        respondentId, d.episodeId || '',
        d.activity || '', d.information || '', d.informationSource || '',
        d.time || '', d.opportunityChosen || '', d.opportunityFlexible || '',
        d.wellbeing_joy != null ? d.wellbeing_joy : '',
        d.wellbeing_confidence != null ? d.wellbeing_confidence : '',
        d.wellbeing_anxiety != null ? d.wellbeing_anxiety : '',
        d.wellbeing_boredom != null ? d.wellbeing_boredom : ''
      ]);
    });

    return createJsonResponse({
      success: true,
      respondentId: respondentId,
      message: 'saved'
    });

  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// ──────────────── GET: 관리자 데이터 조회 ────────────────
function doGet(e) {
  try {
    var password = e.parameter.password;
    if (password !== ADMIN_PASSWORD) {
      return createJsonResponse({ success: false, error: 'auth failed' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) Responses 읽기
    var respSheet = ss.getSheetByName('Responses');
    if (!respSheet || respSheet.getLastRow() <= 1) {
      return createJsonResponse({ success: true, data: [], count: 0 });
    }
    var respData = respSheet.getRange(2, 1, respSheet.getLastRow() - 1, 6).getValues();

    // 2) Episodes 읽기 → respondentId별 그룹
    var episodesMap = {};
    var epSheet = ss.getSheetByName('Episodes');
    if (epSheet && epSheet.getLastRow() > 1) {
      var epRows = epSheet.getRange(2, 1, epSheet.getLastRow() - 1, 7).getValues();
      epRows.forEach(function(row) {
        var rid = row[0];
        if (!episodesMap[rid]) episodesMap[rid] = [];
        episodesMap[rid].push({
          id: row[1], startTime: row[2], endTime: row[3],
          activity: row[4], location: row[5], companion: row[6]
        });
      });
    }

    // 3) Diagnoses 읽기 → respondentId별 그룹
    var diagMap = {};
    var diagSheet = ss.getSheetByName('Diagnoses');
    if (diagSheet && diagSheet.getLastRow() > 1) {
      var dRows = diagSheet.getRange(2, 1, diagSheet.getLastRow() - 1, 12).getValues();
      dRows.forEach(function(row) {
        var rid = row[0];
        if (!diagMap[rid]) diagMap[rid] = [];
        diagMap[rid].push({
          episodeId: row[1], activity: row[2],
          information: row[3], informationSource: row[4], time: row[5],
          opportunityChosen: row[6], opportunityFlexible: row[7],
          wellbeing_joy: row[8], wellbeing_confidence: row[9],
          wellbeing_anxiety: row[10], wellbeing_boredom: row[11]
        });
      });
    }

    // 4) 조합하여 반환
    var responses = respData.map(function(row) {
      var rid = row[1];
      return {
        timestamp: row[0] instanceof Date ? row[0].toISOString() : row[0],
        respondentId: rid,
        episodes: episodesMap[rid] || [],
        diagnoses: diagMap[rid] || [],
        barrier: row[4],
        schoolMessage: row[5]
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

// ──────────────── 유틸리티 ────────────────
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // 헤더 서식
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86c8');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
