/* =========================================================================
   DRM Survey - Google Apps Script Backend (PERMA + 5대 핵심 가치 적용)
   Sheets: Responses, Episodes, Diagnoses
   - PERMA 웰빙: P(긍정정서), E(몰입), R(관계), M(의미), A(성취), N(부정정서)
   - 5대 핵심 가치: cv_A~cv_J (10개 영역)
   - Q11: 학교 경험 성찰, Q12: 가장 변화 필요한 가치, Q13: 이상적 하루
   ========================================================================= */

const ADMIN_PASSWORD = 'drm2026admin';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const respondentId = Utilities.getUuid();
    const timestamp = new Date().toISOString();

    const episodes = data.episodes || [];
    const diagnoses = data.diagnoses || [];
    const reflection = data.globalReflection || {};

    // 1. Responses Sheet
    const respHeaders = [
      'Timestamp', 'RespondentID', 'PhoneNumber', 'EpisodeCount', 'DiagnosisCount',
      'Barrier',
      'InfoAccess1', 'InfoAccess2', 'InfoAccess3', 'InfoSources', 'InfoDesert',
      'TimeUse1', 'TimeUse2', 'TimeUse3', 'TimeUse4', 'TimeDesign',
      'OppAccess1', 'OppAccess2', 'OppAccess3', 'OppAccess4', 'OppImprove',
      'WB_P', 'WB_E', 'WB_R', 'WB_M', 'WB_A', 'WB_N',
      'CV_A', 'CV_B', 'CV_C', 'CV_D', 'CV_E', 'CV_F', 'CV_G', 'CV_H', 'CV_I', 'CV_J',
      'SchoolReflection', 'MostNeededValue', 'IdealDay'
    ];

    var respSheet = getOrCreateSheet(ss, 'Responses', respHeaders);

    respSheet.appendRow([
      timestamp,
      respondentId,
      data.phoneNumber || '',
      episodes.length,
      diagnoses.length,
      reflection.biggestBarrier || '',
      reflection.infoAccess1 || '', reflection.infoAccess2 || '', reflection.infoAccess3 || '',
      Array.isArray(reflection.infoSources) ? reflection.infoSources.join(', ') : '',
      reflection.infoDesertExperience || '',
      reflection.timeUse1 || '', reflection.timeUse2 || '', reflection.timeUse3 || '', reflection.timeUse4 || '',
      reflection.timeDesignSuggestion || '',
      reflection.oppAccess1 || '', reflection.oppAccess2 || '', reflection.oppAccess3 || '', reflection.oppAccess4 || '',
      reflection.oppImproveSuggestion || '',
      reflection.wb_P || '', reflection.wb_E || '', reflection.wb_R || '',
      reflection.wb_M || '', reflection.wb_A || '', reflection.wb_N || '',
      reflection.cv_A || '', reflection.cv_B || '', reflection.cv_C || '', reflection.cv_D || '', reflection.cv_E || '',
      reflection.cv_F || '', reflection.cv_G || '', reflection.cv_H || '', reflection.cv_I || '', reflection.cv_J || '',
      reflection.schoolExperienceReflection || '',
      reflection.mostNeededValue || '',
      reflection.idealDay || ''
    ]);

    // 2. Episodes Sheet
    var epHeaders = ['RespondentID', 'EpisodeNum', 'StartTime', 'EndTime', 'Activity', 'Location', 'Companion'];
    var epSheet = getOrCreateSheet(ss, 'Episodes', epHeaders);
    episodes.forEach(function(ep, i) {
      epSheet.appendRow([
        respondentId, i + 1, ep.startTime || '', ep.endTime || '',
        ep.activity || '', ep.location || '', ep.companion || ''
      ]);
    });

    // 3. Diagnoses Sheet (PERMA)
    var diagHeaders = [
      'RespondentID', 'EpisodeID', 'Activity', 'Information', 'InformationSources', 'InformationSourceEtc',
      'TimePerception', 'OpportunityChosen', 'OpportunityFlexible',
      'WB_P', 'WB_E', 'WB_R', 'WB_M', 'WB_A', 'WB_N'
    ];
    var diagSheet = getOrCreateSheet(ss, 'Diagnoses', diagHeaders);
    diagnoses.forEach(function(d) {
      var infoSrc = Array.isArray(d.informationSources) ? d.informationSources.join(', ') : (d.informationSource || '');
      var infoSrcEtc = d.informationSourceEtc || '';
      diagSheet.appendRow([
        respondentId, d.episodeId, d.activity || '',
        d.information || '', infoSrc, infoSrcEtc, d.time || '',
        d.opportunityChosen || '', d.opportunityFlexible || '',
        d.wellbeing_P, d.wellbeing_E, d.wellbeing_R, d.wellbeing_M, d.wellbeing_A, d.wellbeing_N
      ]);
    });

    return createJsonResponse({ success: true, respondentId: respondentId });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  if (e.parameter.pw !== ADMIN_PASSWORD) {
    return createJsonResponse({ error: 'Unauthorized' });
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  ['Responses', 'Episodes', 'Diagnoses'].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) result[name] = sheet.getDataRange().getValues();
  });
  return createJsonResponse(result);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
