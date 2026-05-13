# 🔧 إعداد الـ Backend - خطوة بخطوة

## المشكلة اللي عندك:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'cors'
```

**السبب:** الـ dependencies مش منصبة

---

## ✅ الحل الكامل:

### الخطوة 1: نصب الـ Dependencies
```bash
cd backend
npm install
```

**انتظر حتى يخلص** (ممكن ياخد 2-5 دقائق)

### الخطوة 2: تحقق من التنصيب
لما يخلص، لازم تشوف:
```
added XXX packages
```

### الخطوة 3: شغل الـ Backend
```bash
npm run dev
```

**لازم تشوف:**
```
Server running on port 5000
```

---

## 🔍 إذا npm install فشل:

### الحل 1: امسح node_modules وحاول تاني
```bash
cd backend
rmdir /s /q node_modules
del package-lock.json
npm install
```

### الحل 2: استخدم --legacy-peer-deps
```bash
npm install --legacy-peer-deps
```

### الحل 3: استخدم --force
```bash
npm install --force
```

---

## 📋 تحقق من Node.js و npm

### تأكد إنهم منصبين:
```bash
node --version
npm --version
```

**لازم تشوف:**
```
v18.x.x أو أعلى
9.x.x أو أعلى
```

**لو مش منصبين:**
1. روح على https://nodejs.org
2. نزل LTS version
3. نصبه
4. أعد تشغيل terminal
5. جرب تاني

---

## 🎯 الخطوات بالترتيب:

```bash
# 1. روح لمجلد backend
cd "C:\Users\Mega Store\OneDrive\Documentos\GitHub\Geo-Attendance\backend"

# 2. نصب الـ dependencies
npm install

# 3. انتظر حتى يخلص (2-5 دقائق)

# 4. شغل الـ backend
npm run dev

# 5. لازم تشوف: "Server running on port 5000"
```

---

## ✅ علامات النجاح:

عند تشغيل `npm run dev`، لازم تشوف:
```
[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node src/app.js`
Server running on port 5000
```

---

## ❌ أخطاء شائعة:

### خطأ 1: `npm: command not found`
**الحل:** نصب Node.js

### خطأ 2: `EACCES: permission denied`
**الحل:** شغل terminal كـ Administrator

### خطأ 3: `Port 5000 already in use`
**الحل:**
```bash
netstat -ano | findstr :5000
taskkill /F /PID [رقم_العملية]
```

### خطأ 4: `Cannot find module 'firebase'`
**الحل:** الـ npm install لسه مخلصش، انتظر

---

## 🔥 الحل السريع (إذا كل حاجة فشلت):

```bash
# 1. امسح كل حاجة
cd backend
rmdir /s /q node_modules
del package-lock.json

# 2. نصب من جديد
npm cache clean --force
npm install --legacy-peer-deps

# 3. شغل
npm run dev
```

---

## 📝 ملاحظات مهمة:

1. **npm install لازم يخلص الأول** قبل ما تشغل npm run dev
2. **لو الـ terminal معلق** على npm install، استنى شوية (عادي ياخد وقت)
3. **لو فيه أخطاء warnings** أثناء npm install، عادي، المهم يخلص
4. **Backend لازم يفضل شغال** طول ما بتستخدم الشات بوت

---

## 🎉 بعد ما Backend يشتغل:

1. ✅ Backend شغال على port 5000
2. ✅ افتح المتصفح على http://localhost:3000
3. ✅ افتح الشات بوت
4. ✅ لازم يشتغل عادي بدون "Connection Error"

---

## 🆘 لو لسه مش شغال:

1. تأكد إن npm install خلص
2. تأكد إن مفيش أخطاء حمراء في terminal
3. تأكد إن Backend شغال (لازم تشوف "Server running on port 5000")
4. جرب تفتح http://localhost:5000 في المتصفح
5. لو شفت أي حاجة (حتى لو خطأ) → Backend شغال ✅
6. لو شفت "This site can't be reached" → Backend مش شغال ❌

---

**دلوقتي: خلي npm install يخلص، بعدين شغل npm run dev** 🚀
