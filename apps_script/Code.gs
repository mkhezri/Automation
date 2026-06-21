// ============================================================
// KAU Purchase Opportunity System — Google Apps Script Backend
// Sheets: "Opportunities", "Suppliers"
// ============================================================

var SHEET_OPP  = 'Opportunities';
var SHEET_SUPP = 'Suppliers';

// ---------- Web App Entry Point ----------

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('سامانه فرصت خرید')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- Opportunity CRUD ----------

function saveOpportunity(o) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sh   = ss.getSheetByName(SHEET_OPP) || ss.insertSheet(SHEET_OPP);
  var row  = [
    o.opp_number, o.date,
    o.supplier_id, o.supplier_name, o.registry_no, o.national_id, o.supplier_type, o.supplier_email,
    o.product_type, o.quantity_mt, o.producer_mine,
    o.delivery_term, o.delivery_port, o.dest_country, o.laycan,
    o.base_grade, o.price_type, o.platts_index, o.premium_discount, o.fixed_price,
    JSON.stringify(o.analyses),
    o.bonus_clause, o.penalty_clause, o.reject_clause,
    JSON.stringify(o.payment_stages),
    o.analysis_basis, o.weight_basis,
    o.status, o.mgmt_comments, o.internal_notes,
    new Date().toISOString()
  ];
  sh.appendRow(row);
  return { opp_number: o.opp_number };
}

function getOpportunities() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_OPP);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 31).getValues();
  return data.map(function(r) {
    return {
      opp_number: r[0], date: r[1], supplier_id: r[2], supplier_name: r[3],
      registry_no: r[4], national_id: r[5], supplier_type: r[6], supplier_email: r[7],
      product_type: r[8], quantity_mt: r[9], producer_mine: r[10],
      delivery_term: r[11], delivery_port: r[12], dest_country: r[13], laycan: r[14],
      base_grade: r[15], price_type: r[16], platts_index: r[17],
      premium_discount: r[18], fixed_price: r[19],
      analyses: safeJson(r[20]),
      bonus_clause: r[21], penalty_clause: r[22], reject_clause: r[23],
      payment_stages: safeJson(r[24]),
      analysis_basis: r[25], weight_basis: r[26],
      status: r[27], mgmt_comments: r[28], internal_notes: r[29]
    };
  });
}

function getNextOppNumber() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_OPP);
  var count = (!sh || sh.getLastRow() < 2) ? 0 : sh.getLastRow() - 1;
  var year  = new Date().getFullYear();
  return 'KAU-' + year + '-' + String(count + 1).padStart(4, '0');
}

// ---------- Suppliers ----------

function getSuppliers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_SUPP);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  return data
    .filter(function(r) { return r[0]; })
    .map(function(r) {
      return {
        id: String(r[0]), name: r[1], registry_no: r[2],
        national_id: r[3], supplier_type: r[4], email: r[5], phone: r[6]
      };
    });
}

// ---------- AI Agent Bridge ----------

function callAgentAnalyze(payload) {
  var agentUrl = PropertiesService.getScriptProperties().getProperty('AGENT_URL');
  if (!agentUrl) return { error: 'AGENT_URL تنظیم نشده — لطفاً در Script Properties مقدار آن را وارد کنید.' };
  try {
    var resp = UrlFetchApp.fetch(agentUrl + '/analyze', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var json = JSON.parse(resp.getContentText());
    return json;
  } catch(e) {
    return { error: e.message };
  }
}

// ---------- Email Automation ----------

function sendRfqEmail(payload) {
  var email = payload.supplier_email;
  if (!email) throw new Error('ایمیل تأمین‌کننده در پروفایل ثبت نشده است.');

  var subject = '[KAU RFQ] ' + payload.opp_number + ' — ' + payload.product_type;
  var body    = buildRfqEmailBody(payload);

  GmailApp.sendEmail(email, subject, '', { htmlBody: body });

  // log sent email in Opportunities sheet (column 32)
  logEmailSent(payload.opp_number);

  return { message: 'ایمیل RFQ به «' + email + '» با موفقیت ارسال شد.' };
}

function buildRfqEmailBody(p) {
  var grade    = p.base_grade  ? 'Fe ' + p.base_grade + '%' : '—';
  var price    = p.price_type === 'Fixed'
    ? 'قیمت ثابت: $' + p.fixed_price + '/DMT'
    : 'فرمولی بر مبنای ' + p.platts_index + ' با ' + (p.premium_discount >= 0 ? '+' : '') + p.premium_discount + '$/DMT';
  var laycan   = p.laycan || '—';
  var quantity = p.quantity_mt ? Number(p.quantity_mt).toLocaleString() + ' MT' : '—';

  return '<div dir="ltr" style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">' +
    '<div style="background:#1B3A5C;color:#fff;padding:20px;border-radius:8px 8px 0 0">' +
    '<h2 style="margin:0">Request for Quotation — ' + p.opp_number + '</h2>' +
    '<p style="margin:4px 0 0;opacity:.8">KAU Trading & Mining</p></div>' +
    '<div style="padding:24px;border:1px solid #dde3ea;border-top:none;border-radius:0 0 8px 8px">' +
    '<p>Dear ' + p.supplier_name + ',</p>' +
    '<p>We are pleased to invite you to submit your best offer for the following commodity:</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:16px 0">' +
    row('Product',    p.product_type || '—') +
    row('Quantity',   quantity) +
    row('Base Grade', grade) +
    row('Delivery',   p.delivery_term + ' — ' + (p.delivery_port || '—')) +
    row('Destination', p.dest_country || '—') +
    row('Laycan',     laycan) +
    row('Price Basis', price) +
    '</table>' +
    (p.bonus_clause   ? '<p><b>Bonus:</b> '  + p.bonus_clause   + '</p>' : '') +
    (p.penalty_clause ? '<p><b>Penalty:</b> '+ p.penalty_clause + '</p>' : '') +
    (p.reject_clause  ? '<p><b>Rejection Clause:</b> '+ p.reject_clause + '</p>' : '') +
    '<p>Please respond within <b>48 hours</b> with your offer including quality certificate, loading schedule, and payment terms.</p>' +
    '<p style="margin-top:24px">Best regards,<br><b>KAU Procurement Team</b></p>' +
    '<p style="font-size:11px;color:#999;margin-top:16px">Reference: ' + p.opp_number + ' | Date: ' + p.date + '</p>' +
    '</div></div>';
}

function row(label, value) {
  return '<tr>' +
    '<td style="padding:8px;border:1px solid #dde3ea;background:#f4f6f9;font-weight:600;width:40%">' + label + '</td>' +
    '<td style="padding:8px;border:1px solid #dde3ea">' + value + '</td>' +
    '</tr>';
}

function logEmailSent(oppNumber) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_OPP);
    if (!sh) return;
    var col1 = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < col1.length; i++) {
      if (String(col1[i][0]) === String(oppNumber)) {
        sh.getRange(i + 2, 32).setValue(new Date().toISOString());
        break;
      }
    }
  } catch(e) { /* non-critical */ }
}

// ---------- Helpers ----------

function safeJson(s) {
  try { return JSON.parse(s); } catch(e) { return s || null; }
}
