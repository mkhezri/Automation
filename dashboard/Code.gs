// ============================================================
// KAU SOK CO. LIMITED — Procurement Automation Platform
// Google Apps Script Backend
// ============================================================

// === CONFIG ===
const SS_ID = PropertiesService.getScriptProperties().getProperty("SS_ID");
const AGENT_URL = PropertiesService.getScriptProperties().getProperty("AGENT_URL");

// Sheet names
const SHEET_USERS               = "Users";
const SHEET_PROJECTS            = "Projects";
const SHEET_PURCHASE_CONDITIONS = "PurchaseConditions";
const SHEET_VESSEL_NOMINATIONS  = "VesselNominations";
const SHEET_AUDIT_LOG           = "AuditLog";

// Role hierarchy
const ROLE_HIERARCHY = {
  super_admin : 5,
  admin       : 4,
  manager     : 3,
  member      : 2,
  viewer      : 1
};

// ============================================================
// === ROUTING ===
// ============================================================

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : "dashboard";

  const pageMap = {
    dashboard            : "dashboard",
    purchase_condition   : "form-purchase-condition",
    purchase_conditions  : "form-purchase-condition",
    vessel_nomination    : "form-vessel-nomination",
    vessel_nominations   : "form-vessel-nomination",
    projects             : "dashboard",
    users                : "dashboard",
    settings             : "dashboard"
  };

  const file = pageMap[page] || "dashboard";

  return HtmlService.createTemplateFromFile(file)
    .evaluate()
    .setTitle("KAU SOK — سامانه تدارکات")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// === SPREADSHEET HELPER ===
// ============================================================

function getSpreadsheet() {
  return SpreadsheetApp.openById(SS_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ============================================================
// === AUTH (RBAC) ===
// ============================================================

function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  if (!email) return null;

  const sheet = getSheet(SHEET_USERS);
  const users = sheetToObjects(sheet);
  const user  = users.find(u => String(u.email).toLowerCase() === email.toLowerCase() && u.active !== false && u.active !== "FALSE" && u.active !== 0);
  if (!user) return null;

  return {
    email      : user.email,
    name       : user.name,
    role       : user.role,
    department : user.department,
    active     : true
  };
}

function checkRole(requiredRole) {
  const user = getCurrentUser();
  if (!user) return false;
  const userLevel     = ROLE_HIERARCHY[user.role]      || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole]   || 999;
  return userLevel >= requiredLevel;
}

function requireRole(requiredRole) {
  if (!checkRole(requiredRole)) {
    throw new Error("دسترسی غیرمجاز — سطح دسترسی کافی ندارید.");
  }
}

// ============================================================
// === PROJECTS ===
// ============================================================

function getProjects() {
  requireRole("viewer");
  const sheet    = getSheet(SHEET_PROJECTS);
  const projects = sheetToObjects(sheet);
  const user     = getCurrentUser();

  if (checkRole("manager")) {
    return projects;
  }
  // member/viewer sees only their department projects
  return projects.filter(p => p.department === user.department);
}

function createProject(data) {
  requireRole("manager");
  const user  = getCurrentUser();
  const sheet = getSheet(SHEET_PROJECTS);

  // Ensure header row exists
  _ensureHeader(sheet, ["id", "name", "department", "status", "created_by", "created_at", "description"]);

  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    data.name,
    data.department || user.department,
    data.status || "active",
    user.email,
    new Date(),
    data.description || ""
  ]);

  logAudit("CREATE", "Project", id, data.name);
  return { success: true, id };
}

// ============================================================
// === PURCHASE CONDITIONS ===
// ============================================================

const PC_HEADERS = [
  "doc_number", "date", "created_by", "supplier", "product",
  "quantity", "quantity_tolerance", "port_loading", "delivery_time", "lsd", "freight",
  "spec_fe_min", "spec_fe_max", "spec_sio2", "spec_al2o3", "spec_s", "spec_p", "spec_moisture", "spec_size",
  "price_formula", "platts_index", "premium", "qp_type", "qp_detail",
  "payment_terms", "payment_bank", "status", "drive_file_id", "project_id"
];

function getPurchaseConditions() {
  requireRole("viewer");
  const sheet = getSheet(SHEET_PURCHASE_CONDITIONS);
  const rows  = sheetToObjects(sheet);
  const user  = getCurrentUser();

  if (checkRole("manager")) return rows;
  return rows.filter(r => r.created_by === user.email);
}

function savePurchaseCondition(data) {
  requireRole("member");
  const user      = getCurrentUser();
  const sheet     = getSheet(SHEET_PURCHASE_CONDITIONS);
  const docNumber = getNextDocNumber("PC");
  const now       = new Date();

  _ensureHeader(sheet, PC_HEADERS);

  // Create Drive doc
  let driveFileId = "";
  try {
    const doc       = createPurchaseConditionDoc(data, docNumber);
    driveFileId     = doc.getId();
  } catch (err) {
    Logger.log("Drive doc creation failed: " + err.message);
  }

  sheet.appendRow([
    docNumber,
    now,
    user.email,
    data.supplier          || "",
    data.product           || "",
    data.quantity          || "",
    data.quantity_tolerance|| "",
    data.port_loading      || "",
    data.delivery_time     || "",
    data.lsd               || "",
    data.freight           || "",
    data.spec_fe_min       || "",
    data.spec_fe_max       || "",
    data.spec_sio2         || "",
    data.spec_al2o3        || "",
    data.spec_s            || "",
    data.spec_p            || "",
    data.spec_moisture     || "",
    data.spec_size         || "",
    data.price_formula     || "",
    data.platts_index      || "",
    data.premium           || "",
    data.qp_type           || "",
    data.qp_detail         || "",
    data.payment_terms     || "",
    data.payment_bank      || "",
    data.status            || "pending",
    driveFileId,
    data.project_id        || ""
  ]);

  logAudit("CREATE", "PurchaseCondition", docNumber, "تعداد: " + (data.quantity || "-") + " | تأمین‌کننده: " + (data.supplier || "-"));
  return { success: true, doc_number: docNumber, drive_file_id: driveFileId };
}

function getNextDocNumber(type) {
  const year  = new Date().getFullYear();
  let sheet, prefix;

  if (type === "PC") {
    sheet  = getSheet(SHEET_PURCHASE_CONDITIONS);
    prefix = "KS-" + year + "-";
  } else {
    sheet  = getSheet(SHEET_VESSEL_NOMINATIONS);
    prefix = "KS-VN-" + year + "-";
  }

  const rows = sheetToObjects(sheet);
  const nums = rows
    .map(r => String(r.doc_number || ""))
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix, ""), 10))
    .filter(n => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return prefix + String(next).padStart(4, "0");
}

// ============================================================
// === VESSEL NOMINATIONS ===
// ============================================================

const VN_HEADERS = [
  "doc_number", "date", "created_by", "to_company", "to_port",
  "vessel_name", "laycan_start", "laycan_end", "port_loading",
  "product", "quantity", "draft_limit", "loa", "beam",
  "status", "drive_file_id", "project_id"
];

function getVesselNominations() {
  requireRole("viewer");
  const sheet = getSheet(SHEET_VESSEL_NOMINATIONS);
  const rows  = sheetToObjects(sheet);
  const user  = getCurrentUser();

  if (checkRole("manager")) return rows;
  return rows.filter(r => r.created_by === user.email);
}

function saveVesselNomination(data) {
  requireRole("member");
  const user      = getCurrentUser();
  const sheet     = getSheet(SHEET_VESSEL_NOMINATIONS);
  const docNumber = getNextDocNumber("VN");
  const now       = new Date();

  _ensureHeader(sheet, VN_HEADERS);

  // Create Drive doc
  let driveFileId = "";
  try {
    const doc   = createVesselNominationDoc(data, docNumber);
    driveFileId = doc.getId();
  } catch (err) {
    Logger.log("Drive doc creation failed: " + err.message);
  }

  sheet.appendRow([
    docNumber,
    now,
    user.email,
    data.to_company    || "",
    data.to_port       || "",
    data.vessel_name   || "",
    data.laycan_start  || "",
    data.laycan_end    || "",
    data.port_loading  || "",
    data.product       || "",
    data.quantity      || "",
    data.draft_limit   || "",
    data.loa           || "",
    data.beam          || "",
    data.status        || "pending",
    driveFileId,
    data.project_id    || ""
  ]);

  logAudit("CREATE", "VesselNomination", docNumber, "کشتی: " + (data.vessel_name || "-") + " | لیکن: " + (data.laycan_start || "-"));
  return { success: true, doc_number: docNumber, drive_file_id: driveFileId };
}

// ============================================================
// === AUDIT LOG ===
// ============================================================

function logAudit(action, entity, entity_id, detail) {
  const sheet = getSheet(SHEET_AUDIT_LOG);
  _ensureHeader(sheet, ["timestamp", "user_email", "action", "entity", "entity_id", "detail"]);

  let userEmail = "";
  try { userEmail = Session.getActiveUser().getEmail(); } catch (e) {}

  sheet.appendRow([new Date(), userEmail, action, entity, entity_id, detail || ""]);
}

function getAuditLog(limit) {
  requireRole("viewer");
  const sheet = getSheet(SHEET_AUDIT_LOG);
  const rows  = sheetToObjects(sheet);
  const n     = limit || 10;
  return rows.slice(-n).reverse();
}

// ============================================================
// === DRIVE ===
// ============================================================

function getPurchaseConditionFolderId(status) {
  // status: "draft" → Draft folder, otherwise → Final folder
  if (status === "draft") return "1cOmhnMp8IaeIVK16MBnMdFKA7mlm79hz";
  return "1a_oFoPqsCwvTp6meN7MIuwEwKeMzyoYb";
}

function getVesselNominationFolderId(status) {
  if (status === "draft") return "1X8ru5_bYtijU3Y4wzIZcPXZvOtkHtcUv";
  return "1YYOxOoX-hsMy4r3XtPGqA7Ehinezl1tL";
}

function getContractsFolderId(archived) {
  if (archived) return "1kN_QvOU0Eb9_DMbaPmUv1PvCs3YoFems";
  return "1ePIRi5IUd3KhE5Chepi-MoU2yaaNAXGw";
}

function getRfqFolderId(received) {
  if (received) return "1ZjxSnH6W1xqDcnfXS27fksq9_Mg0SkX3";
  return "17Cx0vZYUeW7b--fa1pqwOQY2qelhI3H6";
}

function createPurchaseConditionDoc(data, docNumber) {
  const folder = DriveApp.getFolderById(getPurchaseConditionFolderId(data.status));
  const doc    = DocumentApp.create(docNumber + " — شرایط خرید");
  const body   = doc.getBody();

  body.appendParagraph("KAU SOK CO. LIMITED").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("شرایط خرید — " + docNumber).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph("تاریخ: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd"));
  body.appendParagraph("تأمین‌کننده: " + (data.supplier || ""));
  body.appendParagraph("محصول: " + (data.product || ""));
  body.appendParagraph("مقدار: " + (data.quantity || "") + " MT ±" + (data.quantity_tolerance || "0") + "%");
  body.appendParagraph("بندر بارگیری: " + (data.port_loading || ""));
  body.appendParagraph("زمان تحویل: " + (data.delivery_time || ""));
  body.appendParagraph("آخرین تاریخ حمل (LSD): " + (data.lsd || ""));
  body.appendParagraph("کرایه حمل: " + (data.freight || ""));
  body.appendParagraph("");
  body.appendParagraph("مشخصات فنی").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("Fe (min): " + (data.spec_fe_min || "") + "% | Fe (max): " + (data.spec_fe_max || "") + "%");
  body.appendParagraph("SiO2: " + (data.spec_sio2 || "") + "% | Al2O3: " + (data.spec_al2o3 || "") + "%");
  body.appendParagraph("S: " + (data.spec_s || "") + "% | P: " + (data.spec_p || "") + "%");
  body.appendParagraph("رطوبت: " + (data.spec_moisture || "") + "% | اندازه: " + (data.spec_size || "") + "mm");
  body.appendParagraph("");
  body.appendParagraph("شرایط قیمت‌گذاری").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("فرمول قیمت: " + (data.price_formula || ""));
  body.appendParagraph("شاخص پلاتس: " + (data.platts_index || ""));
  body.appendParagraph("پریمیوم: " + (data.premium || ""));
  body.appendParagraph("نوع QP: " + (data.qp_type || "") + " | جزئیات: " + (data.qp_detail || ""));
  body.appendParagraph("");
  body.appendParagraph("شرایط پرداخت").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("شرایط: " + (data.payment_terms || ""));
  body.appendParagraph("بانک: " + (data.payment_bank || ""));

  doc.saveAndClose();

  // Move to target folder
  const file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return doc;
}

function createVesselNominationDoc(data, docNumber) {
  const folder = DriveApp.getFolderById(getVesselNominationFolderId(data.status));
  const doc    = DocumentApp.create(docNumber + " — معرفی کشتی");
  const body   = doc.getBody();

  body.appendParagraph("KAU SOK CO. LIMITED").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("معرفی کشتی — " + docNumber).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph("تاریخ: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd"));
  body.appendParagraph("گیرنده: " + (data.to_company || ""));
  body.appendParagraph("بندر مقصد: " + (data.to_port || ""));
  body.appendParagraph("");
  body.appendParagraph("مشخصات کشتی").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("نام کشتی: " + (data.vessel_name || ""));
  body.appendParagraph("لیکن شروع: " + (data.laycan_start || ""));
  body.appendParagraph("لیکن پایان: " + (data.laycan_end || ""));
  body.appendParagraph("بندر بارگیری: " + (data.port_loading || ""));
  body.appendParagraph("محصول: " + (data.product || ""));
  body.appendParagraph("مقدار: " + (data.quantity || "") + " MT");
  body.appendParagraph("محدودیت آبخور (Draft): " + (data.draft_limit || "") + " m");
  body.appendParagraph("LOA: " + (data.loa || "") + " m");
  body.appendParagraph("Beam: " + (data.beam || "") + " m");

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return doc;
}

// ============================================================
// === DASHBOARD DATA ===
// ============================================================

function getDashboardStats() {
  requireRole("viewer");
  const user = getCurrentUser();

  const projects = sheetToObjects(getSheet(SHEET_PROJECTS));
  const pcs      = sheetToObjects(getSheet(SHEET_PURCHASE_CONDITIONS));
  const vns      = sheetToObjects(getSheet(SHEET_VESSEL_NOMINATIONS));

  const isAdmin = checkRole("manager");

  const myPcs = isAdmin ? pcs : pcs.filter(r => r.created_by === user.email);
  const myVns = isAdmin ? vns : vns.filter(r => r.created_by === user.email);

  const activeProjects = projects.filter(p => p.status === "active").length;
  const pendingPcs     = myPcs.filter(p => p.status === "pending").length;

  const auditRows = sheetToObjects(getSheet(SHEET_AUDIT_LOG));
  const recent    = auditRows.slice(-10).reverse();

  return {
    total_projects : activeProjects,
    total_pcs      : myPcs.length,
    total_vns      : myVns.length,
    pending_pcs    : pendingPcs,
    user_role      : user.role,
    user_name      : user.name,
    recent_activity: recent
  };
}

// ============================================================
// === USERS (admin only) ===
// ============================================================

function getUsers() {
  requireRole("admin");
  return sheetToObjects(getSheet(SHEET_USERS));
}

function createUser(data) {
  requireRole("admin");
  const sheet = getSheet(SHEET_USERS);
  _ensureHeader(sheet, ["email", "name", "role", "department", "active", "created_at"]);

  sheet.appendRow([
    data.email,
    data.name,
    data.role || "viewer",
    data.department || "",
    true,
    new Date()
  ]);

  logAudit("CREATE", "User", data.email, data.name + " | " + data.role);
  return { success: true };
}

function updateUser(email, updates) {
  requireRole("admin");
  const sheet  = getSheet(SHEET_USERS);
  const data   = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const emailCol = headers.indexOf("email");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === email.toLowerCase()) {
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col >= 0) sheet.getRange(i + 1, col + 1).setValue(updates[key]);
      });
      logAudit("UPDATE", "User", email, JSON.stringify(updates));
      return { success: true };
    }
  }
  throw new Error("کاربر یافت نشد.");
}

// ============================================================
// === INTERNAL HELPERS ===
// ============================================================

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

function _ensureHeader(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (!first[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

// Bootstrap: call once from Apps Script editor to set up sheets
function setupSheets() {
  _ensureHeader(getSheet(SHEET_USERS),               ["email", "name", "role", "department", "active", "created_at"]);
  _ensureHeader(getSheet(SHEET_PROJECTS),            ["id", "name", "department", "status", "created_by", "created_at", "description"]);
  _ensureHeader(getSheet(SHEET_PURCHASE_CONDITIONS), PC_HEADERS);
  _ensureHeader(getSheet(SHEET_VESSEL_NOMINATIONS),  VN_HEADERS);
  _ensureHeader(getSheet(SHEET_AUDIT_LOG),           ["timestamp", "user_email", "action", "entity", "entity_id", "detail"]);
  return "شیت‌ها با موفقیت ایجاد شدند.";
}
