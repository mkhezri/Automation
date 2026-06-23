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

function getCommercialDepFolderId() {
  return PropertiesService.getScriptProperties().getProperty("COMMERCIAL_DEP_FOLDER_ID") || "1Z0u5YgT2iPJ0szmZs2g0WIUILMzC0FNc";
}

/**
 * Gets or creates the deal parent folder inside "commercial dep".
 * Name format: YYYY-MM-DD_supplier_quantity_commodity
 */
function getOrCreateDealFolder(date, supplier, quantity, commodity) {
  const parentId = getCommercialDepFolderId();
  if (!parentId) throw new Error("COMMERCIAL_DEP_FOLDER_ID not set in Script Properties");

  const d          = date ? new Date(date) : new Date();
  const dateStr    = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const safeSup    = String(supplier  || "unknown").replace(/[\/\\:*?"<>|]/g, "-").trim();
  const safeQty    = String(quantity  || "0").replace(/,/g, "").trim();
  const safeCom    = String(commodity || "cargo").replace(/[\/\\:*?"<>|]/g, "-").trim();
  const folderName = dateStr + "_" + safeSup + "_" + safeQty + "_" + safeCom;

  const parent = DriveApp.getFolderById(parentId);
  const existing = parent.getFoldersByName(folderName);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(folderName);
}

/**
 * Gets or creates a named subfolder inside a given parent folder.
 */
function getOrCreateSubfolder(parentFolder, name) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

/**
 * Moves a Drive file into the given folder (removes from root).
 */
function moveFileTo(fileId, targetFolder) {
  const file = DriveApp.getFileById(fileId);
  targetFolder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch(e) {}
  return file;
}

function getPurchaseConditionFolderId(status) {
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
  // Build folder structure: commercial dep / DATE_supplier_qty_commodity / opportunity /
  let targetFolder;
  try {
    const dealFolder = getOrCreateDealFolder(data.date, data.supplier, data.quantity, data.product);
    targetFolder = getOrCreateSubfolder(dealFolder, "opportunity");
    // Store the deal folder ID so vessel nominations can reuse it
    data._dealFolderId = dealFolder.getId();
  } catch(e) {
    Logger.log("Deal folder creation failed: " + e.message);
    targetFolder = DriveApp.getFolderById(getPurchaseConditionFolderId(data.status));
  }
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
  moveFileTo(doc.getId(), targetFolder);
  return doc;
}

function createVesselNominationDoc(data, docNumber) {
  // Build folder: commercial dep / deal folder (from linked PC) / MV. VESSEL NAME /
  let targetFolder;
  try {
    let dealFolder;
    // If a deal folder ID was passed (from linked PC), use it; otherwise create new
    if (data._dealFolderId) {
      dealFolder = DriveApp.getFolderById(data._dealFolderId);
    } else {
      dealFolder = getOrCreateDealFolder(data.date, data.recipientCompany, data.quantity, data.commodity);
    }
    const vesselFolderName = data.vesselName ? "MV. " + String(data.vesselName).toUpperCase() : "Vessel";
    targetFolder = getOrCreateSubfolder(dealFolder, vesselFolderName);
  } catch(e) {
    Logger.log("VN deal folder creation failed: " + e.message);
    targetFolder = DriveApp.getFolderById(getVesselNominationFolderId(data.status));
  }

  const doc  = DocumentApp.create(docNumber + " — Vessel Nomination");
  const body = doc.getBody();

  body.appendParagraph("KAU SOK CO. LIMITED").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("Vessel Nomination — " + docNumber).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph("Date: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd"));
  body.appendParagraph("To: " + (data.recipientCompany || ""));
  body.appendParagraph("Contract No.: " + (data.contractNo || ""));
  body.appendParagraph("");
  body.appendParagraph("Sub: Nomination MV. " + (data.vesselName || "")).setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("Cargo: " + (data.commodity || "") + " — Min " + (data.quantity || "") + " MT");
  body.appendParagraph("Load Port: " + (data.loadPort || ""));
  body.appendParagraph("ETA: " + (data.etaDate || ""));
  body.appendParagraph("Laycan: " + (data.laycanStart || "") + " – " + (data.laycanEnd || ""));
  body.appendParagraph("Freight Rate: USD " + (data.freightRate || "") + " / WMT");
  body.appendParagraph("Demurrage: USD " + (data.demurrageRate || "") + " / day");
  body.appendParagraph("");
  body.appendParagraph("VSL PARTICULARS:").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph("M/V " + (data.vesselName || ""));
  body.appendParagraph((data.builtYear || "") + " BLT, " + (data.shipyard || "") + " - " + (data.shipyardLoc || ""));
  body.appendParagraph((data.flag || "") + " FLAG, CLASS " + (data.classNK || ""));
  body.appendParagraph("SUMMER DWT " + (data.summerDwt || "") + " MT / " + (data.draft || "") + " MTRS DRAFT / TPC " + (data.tpc || ""));
  body.appendParagraph("LOA " + (data.loa || "") + " M / BEAM " + (data.beam || "") + " M / DEPTH MOLDED " + (data.depth || "") + " M");
  body.appendParagraph("GRT/NRT: " + (data.grt || "") + " / " + (data.nrt || "") + " MT");
  body.appendParagraph("CAPACITY - GRAIN/BALE: " + (data.grainM3 || "") + " M3 / " + (data.baleM3 || "") + " M3");
  body.appendParagraph((data.hoha || "") + "   " + (data.cranes || ""));
  body.appendParagraph("");
  body.appendParagraph("LOAD PORT AGENT DETAILS:").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph((data.agentCompany || ""));
  body.appendParagraph("WhatsApp: " + (data.agentWhatsapp || ""));
  body.appendParagraph("WeChat: " + (data.agentWechat || ""));
  body.appendParagraph("Email: " + (data.agentEmail || ""));
  body.appendParagraph("");
  body.appendParagraph("KAU SOK CO. LIMITED");

  doc.saveAndClose();
  moveFileTo(doc.getId(), targetFolder);
  return doc;
}

// ============================================================
// === DASHBOARD DATA ===
// ============================================================

function getDashboardStats() {
  requireRole("viewer");
  const user = getCurrentUser();

  // Step 1: return minimal data to verify pipeline
  // Read sheets one by one with error isolation
  var totalProjects = 0, totalPcs = 0, totalVns = 0, pendingPcs = 0;
  var recent = [];

  try {
    const projects = sheetToObjects(getSheet(SHEET_PROJECTS));
    totalProjects = projects.filter(p => p.status === "active").length;
  } catch(e) { Logger.log("projects err: " + e.message); }

  try {
    const pcs = sheetToObjects(getSheet(SHEET_PURCHASE_CONDITIONS));
    const isAdmin = checkRole("manager");
    const myPcs = isAdmin ? pcs : pcs.filter(r => r.created_by === user.email);
    totalPcs = myPcs.length;
    pendingPcs = myPcs.filter(p => p.status === "pending").length;
  } catch(e) { Logger.log("pcs err: " + e.message); }

  try {
    const vns = sheetToObjects(getSheet(SHEET_VESSEL_NOMINATIONS));
    const isAdmin = checkRole("manager");
    const myVns = isAdmin ? vns : vns.filter(r => r.created_by === user.email);
    totalVns = myVns.length;
  } catch(e) { Logger.log("vns err: " + e.message); }

  try {
    const auditRows = sheetToObjects(getSheet(SHEET_AUDIT_LOG));
    recent = auditRows.slice(-10).reverse().map(r => ({
      timestamp  : r.timestamp ? String(r.timestamp) : "",
      user_email : String(r.user_email || ""),
      action     : String(r.action     || ""),
      entity     : String(r.entity     || ""),
      entity_id  : String(r.entity_id  || ""),
      detail     : String(r.detail     || "")
    }));
  } catch(e) { Logger.log("audit err: " + e.message); }

  return {
    total_projects : totalProjects,
    total_pcs      : totalPcs,
    total_vns      : totalVns,
    pending_pcs    : pendingPcs,
    user_role      : String(user.role || "viewer"),
    user_name      : String(user.name || ""),
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
