/* =========================================================================
   DRM Survey - Google Apps Script Backend (Updated for Part 3 Revision)
   Sheets: Responses, Episodes, Diagnoses
   - Removed: Policy ranking (Q10), SchoolMessage (Q11)
   - Changed: InformationSource -> InformationSources (checkbox array) + InformationSourceEtc
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
      'WB_Happy', 'WB_Confident', 'WB_Growth', 'WB_Anxious', 'WB_Bored', 'WB_Depressed',
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
      reflection.infoDesertExperience || '',
      reflection.timeUse1 || '', reflection.timeUse2 || '', reflection.timeUse3 || '', reflection.timeUse4 || '',
      reflection.timeDesignSuggestion || '',
      reflection.oppAccess1 || '', reflection.oppAccess2 || '', reflection.oppAccess3 || '', reflection.oppAccess4 || '',
      reflection.oppImproveSuggestion || '',
      reflection.wb_happy || '', reflection.wb_confident || '', reflection.wb_growth || '',
      reflection.wb_anxious || '', reflection.wb_bored || '', reflection.wb_depressed || '',
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

    // 3. Diagnoses Sheet
    var diagHeaders = [
      'RespondentID', 'EpisodeID', 'Activity', 'Information', 'InformationSources', 'InformationSourceEtc',
      'TimePerception', 'OpportunityChosen', 'OpportunityFlexible',
      'Joy', 'Confidence', 'Anxiety', 'Boredom'
    ];
    var diagSheet = getOrCreateSheet(ss, 'Diagnoses', diagHeaders);
    diagnoses.forEach(function(d) {
      var infoSrc = Array.isArray(d.informationSources) ? d.informationSources.join(', ') : (d.informationSource || '');
      var infoSrcEtc = d.informationSourceEtc || '';
      diagSheet.appendRow([
        respondentId, d.episodeId, d.activity || '',
        d.information || '', infoSrc, infoSrcEtc, d.time || '',
        d.opportunityChosen || '', d.opportunityFlexible || '',
        d.wellbeing_joy, d.wellbeing_confidence, d.wellbeing_anxiety, d.wellbeing_boredom
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
