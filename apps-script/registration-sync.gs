/**
 * Registration → Players sync  (Google Apps Script)
 * ---------------------------------------------------
 * The registration Google Form writes answers into its own linked tab
 * ("Form Responses 1" / "การตอบแบบฟอร์ม 1") — never directly into the
 * Players tab. This script copies each submission into Players, including
 * the PDPA consent, which is why column F was staying empty.
 *
 * Install (one time, ~2 minutes):
 *   1. Open the spreadsheet → Extensions → Apps Script.
 *   2. Paste this whole file into Code.gs and save.
 *   3. Left sidebar → Triggers (clock icon) → Add Trigger:
 *        function: onFormSubmit
 *        event source: From spreadsheet
 *        event type: On form submit
 *   4. Approve the permissions prompt.
 *   5. To fill in players who already registered before the trigger
 *      existed, run backfillFromFormResponses() once from the editor.
 *
 * Columns are located by header text, so inserting/reordering columns in
 * Players won't break the sync. Adjust the fragments below if you rename
 * a form question or a Players header.
 */

var PLAYERS_SHEET = 'Players';
var HEADER_ROW = 1;

/* Players headers → matched case-insensitively, whitespace-normalized */
var PLAYERS_COLS = {
  tag:   'player tag',
  pdpa:  'pdpa',
  photo: 'photo consent'
};
/* Fallback column numbers if a header isn't found (D=4, F=6, G=7) */
var PLAYERS_COLS_FALLBACK = { tag: 4, pdpa: 6, photo: 7 };

/* Form question titles → matched case-insensitively by fragment */
var FORM_QUESTIONS = {
  tag:   ['player tag', 'player name', 'ชื่อผู้เล่น', 'ชื่อในเกม', 'ชื่อเล่น'],
  pdpa:  ['pdpa', 'ยินยอม', 'คุ้มครองข้อมูล', 'ข้อมูลส่วนบุคคล'],
  photo: ['photo', 'ภาพถ่าย', 'ถ่ายภาพ', 'ถ่ายรูป']
};

/** Installable trigger: From spreadsheet → On form submit */
function onFormSubmit(e) {
  applyRegistration(readAnswers(e.namedValues));
}

/** Run once manually to sync submissions that arrived before the trigger existed. */
function backfillFromFormResponses() {
  var ss = SpreadsheetApp.getActive();
  var fr = null;
  ss.getSheets().forEach(function (s) {
    if (!fr && /^(form responses|การตอบกลับ|การตอบแบบฟอร์ม)/i.test(s.getName())) fr = s;
  });
  if (!fr) throw new Error('No "Form Responses" tab found — is the form linked to this spreadsheet?');

  var data = fr.getDataRange().getDisplayValues();
  var headers = data[0];
  for (var r = 1; r < data.length; r++) {
    var named = {};
    headers.forEach(function (h, c) { named[h] = [data[r][c]]; });
    applyRegistration(readAnswers(named));
  }
}

/* ------------------------- internals ------------------------- */

function applyRegistration(answers) {
  if (!answers.tag) return; // no player tag to key on
  var sh = SpreadsheetApp.getActive().getSheetByName(PLAYERS_SHEET);
  if (!sh) throw new Error('Sheet not found: ' + PLAYERS_SHEET);

  var cols = findPlayerColumns(sh);
  var row = findOrCreatePlayerRow(sh, cols.tag, answers.tag);

  if (cols.pdpa && answers.pdpa)   sh.getRange(row, cols.pdpa).setValue(yesNo(answers.pdpa));
  if (cols.photo && answers.photo) sh.getRange(row, cols.photo).setValue(yesNo(answers.photo));
}

/** e.namedValues → {tag, pdpa, photo} using FORM_QUESTIONS fragments */
function readAnswers(named) {
  var out = {};
  for (var title in named) {
    var t = String(title).toLowerCase();
    var val = [].concat(named[title]).join(', ').trim();
    if (!val) continue;
    for (var key in FORM_QUESTIONS) {
      if (out[key]) continue;
      var hit = FORM_QUESTIONS[key].some(function (f) { return t.indexOf(f) !== -1; });
      if (hit) out[key] = val;
    }
  }
  return out;
}

/** Locate Players columns by header text; fall back to fixed positions */
function findPlayerColumns(sh) {
  var headers = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var cols = {};
  headers.forEach(function (h, i) {
    var t = String(h).replace(/\s+/g, ' ').toLowerCase();
    for (var key in PLAYERS_COLS) {
      if (!cols[key] && t.indexOf(PLAYERS_COLS[key]) !== -1) cols[key] = i + 1;
    }
  });
  for (var key in PLAYERS_COLS_FALLBACK) {
    if (!cols[key]) cols[key] = PLAYERS_COLS_FALLBACK[key];
  }
  return cols;
}

/**
 * Find the row whose player tag matches (case-insensitive), or claim the
 * first empty tag cell. The Players tab is pre-formatted with checkbox rows,
 * so appendRow() would land far below the real data — reuse blanks instead.
 */
function findOrCreatePlayerRow(sh, tagCol, tag) {
  var want = tag.trim().toLowerCase();
  var last = Math.max(sh.getLastRow(), HEADER_ROW + 1);
  var vals = sh.getRange(HEADER_ROW + 1, tagCol, last - HEADER_ROW, 1).getDisplayValues();
  var firstEmpty = 0;
  for (var i = 0; i < vals.length; i++) {
    var v = String(vals[i][0]).trim();
    if (v && v.toLowerCase() === want) return HEADER_ROW + 1 + i;
    if (!v && !firstEmpty) firstEmpty = HEADER_ROW + 1 + i;
  }
  var row = firstEmpty || last + 1;
  sh.getRange(row, tagCol).setValue(tag.trim());
  return row;
}

/** Map an answer to Y/N; Thai negations ("ไม่ยินยอม") checked before the yes-words */
function yesNo(v) {
  var t = String(v).toLowerCase();
  if (t.indexOf('ไม่') !== -1 || /^n(o)?$/.test(t.trim())) return 'N';
  var yes = ['y', 'yes', 'agree', 'accept', 'consent', 'ยินยอม', 'อนุญาต', 'ตกลง', 'ใช่'];
  return yes.some(function (w) { return t.indexOf(w) !== -1; }) ? 'Y' : 'N';
}
