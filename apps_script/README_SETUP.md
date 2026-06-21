# راهنمای نصب Apps Script

## ۱. ایجاد پروژه Google Apps Script
1. به [script.google.com](https://script.google.com) بروید
2. **New project** بزنید
3. فایل‌های `Code.gs` و `Index.html` را کپی کنید
4. پروژه را **Save** کنید

## ۲. اتصال به Google Sheet
- یک Google Sheet جدید بسازید
- در Apps Script: **Resources > Current project's triggers** — اجرا با Sheet مرتبط است
- Sheet باید شامل دو برگه باشد: `Opportunities` و `Suppliers`

### ستون‌های برگه Suppliers
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| ID | نام شرکت | شماره ثبت | شناسه ملی | نوع تأمین‌کننده | ایمیل | تلفن |

## ۳. تنظیم AGENT_URL
در Apps Script:
- **File > Project properties > Script properties**
- کلید: `AGENT_URL`
- مقدار: آدرس سرور FastAPI (مثلاً `https://your-server.com`)

## ۴. Deploy
- **Deploy > New deployment > Web app**
- Execute as: **Me**
- Access: **Anyone** (یا مطابق سیاست سازمان)
