/*****************************************************************
 * 대진고 학생생활규정 전부개정안 - 의견수렴 백엔드 (v2)
 * 공개 GitHub Pages는 제출만 담당하고, 관리자 열람은 Apps Script가 담당한다.
 *****************************************************************/
var SHEET_NAME = '응답';
var HEADERS = ['제출시각','역할','세부(직책/학년반)','개정동의','제1편총칙','제2편학교생활','제3편생활지도','제4편징계','기타의견'];
var ADMIN_EMAILS_PROPERTY = 'ADMIN_EMAILS';
var SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

function getSheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  var ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}

// 허용된 값만 시트에 기록하기 위한 화이트리스트 / 길이 제한
var ALLOWED_ROLES = ['학생', '학부모', '교직원'];
var ALLOWED_AGREE = ['Y', 'N', '', 'O', 'X'];
var MAX_DETAIL_LEN = 50;
var MAX_COMMENT_LEN = 2000;

function clip_(v, max) {
  return String(v == null ? '' : v).slice(0, max);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'no data' });
    }
    var d = JSON.parse(e.postData.contents);
    var c = d.comments || {};

    var role = ALLOWED_ROLES.indexOf(d.role) !== -1 ? d.role : '';
    var agree = ALLOWED_AGREE.indexOf(d.agree) !== -1 ? d.agree : '';

    getSheet_().appendRow([
      new Date(),                          // 제출시각은 서버 시간으로 강제(클라이언트 ts 신뢰 안 함)
      role,
      clip_(d.detail, MAX_DETAIL_LEN),
      agree,
      clip_(c.c1, MAX_COMMENT_LEN),
      clip_(c.c2, MAX_COMMENT_LEN),
      clip_(c.c3, MAX_COMMENT_LEN),
      clip_(c.c4, MAX_COMMENT_LEN),
      clip_(c.cEtc, MAX_COMMENT_LEN)
    ]);
    return json_({ ok: true });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) || '';
  if (view === 'admin') return adminPage_();
  return json_({ ok: true, msg: '대진고 v2 백엔드 정상 작동 중' });
}

function adminPage_() {
  var check = getAdminCheck_();
  if (!check.ok) {
    var email = check.email || '확인 불가';
    var html = '<!doctype html><html lang="ko"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>접근 불가</title></head><body style="font-family:sans-serif;padding:32px;line-height:1.7">' +
      '<h2>관리자 접근 권한이 없습니다.</h2>' +
      '<p>현재 Google 계정: ' + escapeHtml_(email) + '</p>' +
      '<p>담당자에게 Apps Script의 <code>ADMIN_EMAILS</code> 설정을 확인해 달라고 요청하세요.</p>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(html).setTitle('접근 불가');
  }
  return HtmlService.createHtmlOutputFromFile('Admin').setTitle('대진고 설문 관리자');
}

function getAdminData() {
  assertAdmin_();
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { rows: [] };
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = values.map(function (r) {
    return {
      ts: formatCell_(r[0]),
      role: r[1],
      detail: r[2],
      agree: r[3],
      comments: { c1: r[4], c2: r[5], c3: r[6], c4: r[7], cEtc: r[8] }
    };
  });
  return { rows: rows };
}

function assertAdmin_() {
  var check = getAdminCheck_();
  if (!check.ok) throw new Error('unauthorized');
}

function getAdminCheck_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  var effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  var admins = getAdminEmails_();
  return {
    ok: !!email && email === effectiveEmail && admins.indexOf(email) !== -1,
    email: email
  };
}

function getAdminEmails_() {
  var raw = PropertiesService.getScriptProperties().getProperty(ADMIN_EMAILS_PROPERTY) || '';
  return raw.split(',').map(function (email) {
    return email.trim().toLowerCase();
  }).filter(function (email) {
    return email;
  });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function formatCell_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return v;
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
