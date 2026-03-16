/* =========================================================================
   DRM Survey - Google Apps Script Backend
   Sheets: Responses, Episodes, Diagnoses
   - PERMA 웰빙 (에피소드별): P(긍정정서), E(몰입), R(관계), M(의미), A(성취), N(부정정서)
   - 종합 의견: Q1~Q6
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
      'InfoAccess1', 'InfoAccess2', 'InfoAccess3', 'InfoSources',
      'TimeUse1', 'TimeUse2', 'TimeUse3', 'TimeUse4',
      'OppAccess1', 'OppAccess2', 'OppAccess3', 'OppAccess4',
      'IdealDay'
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
      reflection.timeUse1 || '', reflection.timeUse2 || '', reflection.timeUse3 || '', reflection.timeUse4 || '',
      reflection.oppAccess1 || '', reflection.oppAccess2 || '', reflection.oppAccess3 || '', reflection.oppAccess4 || '',
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
      'P1', 'P2', 'P3', 'E1', 'E2', 'E3', 'R1', 'R2', 'R3',
      'M1', 'M2', 'M3', 'A1', 'A2', 'A3', 'N1', 'N2', 'N3'
    ];
    var diagSheet = getOrCreateSheet(ss, 'Diagnoses', diagHeaders);
    diagnoses.forEach(function(d) {
      var infoSrc = Array.isArray(d.informationSources) ? d.informationSources.join(', ') : (d.informationSource || '');
      var infoSrcEtc = d.informationSourceEtc || '';
      diagSheet.appendRow([
        respondentId, d.episodeId, d.activity || '',
        d.information || '', infoSrc, infoSrcEtc, d.time || '',
        d.opportunityChosen || '', d.opportunityFlexible || '',
        d.wellbeing_P1, d.wellbeing_P2, d.wellbeing_P3,
        d.wellbeing_E1, d.wellbeing_E2, d.wellbeing_E3,
        d.wellbeing_R1, d.wellbeing_R2, d.wellbeing_R3,
        d.wellbeing_M1, d.wellbeing_M2, d.wellbeing_M3,
        d.wellbeing_A1, d.wellbeing_A2, d.wellbeing_A3,
        d.wellbeing_N1, d.wellbeing_N2, d.wellbeing_N3
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
