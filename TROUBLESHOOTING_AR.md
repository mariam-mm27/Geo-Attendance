# دليل حل المشاكل - الشات بوت

## 🔴 المشكلة: Port 3000 مشغول

### الأعراض:
```
Something is already running on port 3000
Would you like to run the app on another port instead?
```

### الحل السريع:

#### الطريقة 1: استخدام ملف restart-chatbot.bat
1. اذهب إلى مجلد المشروع
2. انقر مرتين على `restart-chatbot.bat`
3. انتظر حتى يغلق كل البرامج
4. شغل Backend ثم Frontend

#### الطريقة 2: يدوياً
```bash
# 1. اقتل العملية على port 3000
netstat -ano | findstr :3000
taskkill /F /PID [رقم_العملية]

# 2. اقتل العملية على port 5000
netstat -ano | findstr :5000
taskkill /F /PID [رقم_العملية]

# 3. شغل Backend
cd backend
npm run dev

# 4. شغل Frontend (في terminal جديد)
cd frontend/Web
npm start
```

## 🔴 المشكلة: Connection Error في الشات بوت

### الأعراض:
```
❌ Connection Error
Unable to connect to the server
```

### الحل:

#### 1. تحقق من Backend
```bash
cd backend
npm run dev
```
**يجب أن ترى:**
```
Server running on port 5000
```

#### 2. تحقق من الاتصال
افتح المتصفح واذهب إلى:
```
http://localhost:5000/api/chatbot/welcome/test
```

**إذا رأيت JSON response** → Backend يعمل ✅
**إذا رأيت خطأ** → Backend لا يعمل ❌

#### 3. تحقق من Firebase
تأكد من وجود ملف:
```
backend/serviceAccount.json
```

## 🔴 المشكلة: User not found

### الأعراض:
```
❌ Account Not Found
Your user account doesn't exist in the system
```

### الحل:

#### 1. تحقق من Firebase Console
1. اذهب إلى Firebase Console
2. افتح Firestore Database
3. تحقق من collection "users"
4. ابحث عن المستخدم بـ UID

#### 2. أضف المستخدم إذا لم يكن موجوداً
في Firebase Console → Firestore:
```javascript
Collection: users
Document ID: [USER_UID]
Data:
{
  name: "Student Name",
  email: "student@example.com",
  role: "student",  // أو "professor" أو "admin"
  createdAt: [timestamp]
}
```

## 🔴 المشكلة: Role not assigned

### الأعراض:
```
❌ Role Not Assigned
Your account doesn't have a role assigned
```

### الحل:
1. اذهب إلى Firebase Console
2. افتح Firestore Database
3. افتح collection "users"
4. افتح document المستخدم
5. أضف field:
```javascript
role: "student"  // أو "professor" أو "admin"
```

## 🔴 المشكلة: No courses enrolled

### الأعراض:
```
📚 No Courses Enrolled
You're not enrolled in any courses yet
```

### الحل:

#### للطلاب:
1. اذهب إلى Firebase Console
2. افتح collection "courses"
3. افتح أي course
4. أضف UID الطالب إلى array "enrolledStudents":
```javascript
enrolledStudents: ["STUDENT_UID_1", "STUDENT_UID_2"]
```

#### للأساتذة:
1. اذهب إلى Firebase Console
2. افتح collection "courses"
3. أضف أو عدل course:
```javascript
{
  name: "Course Name",
  code: "CS101",
  professorId: "PROFESSOR_UID",
  professorName: "Dr. Ahmed",
  enrolledStudents: []
}
```

## 🔴 المشكلة: الشات بوت لا يرد

### الأعراض:
- ترسل رسالة ولا يرد
- يظهر loading ولا يتوقف
- لا يظهر أي رد

### الحل:

#### 1. افتح Developer Tools (F12)
```
1. اضغط F12
2. اذهب إلى Console tab
3. ابحث عن أخطاء حمراء
```

#### 2. تحقق من Network
```
1. اذهب إلى Network tab
2. أرسل رسالة في الشات بوت
3. ابحث عن request للـ API
4. تحقق من status code
```

**Status 200** → نجح ✅
**Status 404** → API غير موجود ❌
**Status 500** → خطأ في Backend ❌
**Failed** → Backend لا يعمل ❌

#### 3. تحقق من Backend logs
في terminal الـ Backend، يجب أن ترى:
```
POST /api/chatbot/conversation/[ID]/message/[USER_ID]
```

## 🔴 المشكلة: npm run dev لا يعمل

### الأعراض:
```
Error: Cannot find module...
```

### الحل:
```bash
# احذف node_modules وأعد التثبيت
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

## 🔴 المشكلة: Firebase permission denied

### الأعراض:
```
❌ Permission Denied
You don't have permission to access this data
```

### الحل:

#### 1. تحقق من Firestore Rules
في Firebase Console → Firestore → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // للتطوير فقط!
    }
  }
}
```

⚠️ **تحذير:** هذه القواعد للتطوير فقط! غيرها قبل النشر.

#### 2. تحقق من serviceAccount.json
تأكد من أن الملف موجود وصحيح:
```
backend/serviceAccount.json
```

## 🔴 المشكلة: الشات بوت يعرض رسائل خطأ عامة

### الأعراض:
```
I encountered an error. Please try again.
```

### الحل:
هذا يعني أن التحديثات لم تطبق. تأكد من:

1. **حفظ الملفات:**
   - `backend/src/services/intelligentChatbot.service.js`
   - `backend/src/controllers/chatbot.controller.js`
   - `frontend/Web/src/components/IntelligentChatBot.jsx`

2. **إعادة تشغيل Backend:**
```bash
# أوقف Backend (Ctrl+C)
# ثم شغله مرة أخرى
cd backend
npm run dev
```

3. **إعادة تحميل Frontend:**
```
اضغط Ctrl+Shift+R في المتصفح
```

## 📋 Checklist للتحقق

قبل أن تسأل عن مشكلة، تحقق من:

- [ ] Backend يعمل على port 5000
- [ ] Frontend يعمل على port 3000
- [ ] لا توجد أخطاء في Console (F12)
- [ ] المستخدم موجود في Firebase
- [ ] المستخدم له role
- [ ] serviceAccount.json موجود
- [ ] الملفات محفوظة
- [ ] تم إعادة تشغيل Backend بعد التعديلات

## 🆘 إذا لم يعمل أي شيء

### الحل الأخير: إعادة تشغيل كاملة

```bash
# 1. أوقف كل شيء
# اضغط Ctrl+C في كل terminal

# 2. نظف كل شيء
cd backend
rm -rf node_modules
npm install

cd ../frontend/Web
rm -rf node_modules
npm install

# 3. شغل Backend
cd ../../backend
npm run dev

# 4. شغل Frontend (terminal جديد)
cd frontend/Web
npm start
```

## 📞 طلب المساعدة

إذا لم تحل المشكلة، أرسل:

1. **Screenshot من الخطأ**
2. **Console logs** (F12 → Console)
3. **Backend logs** (من terminal)
4. **Network tab** (F12 → Network)
5. **خطوات إعادة المشكلة**

## 🔧 أدوات مفيدة

### تحقق من Ports
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# اقتل عملية
taskkill /F /PID [رقم_العملية]
```

### تحقق من Backend
```bash
curl http://localhost:5000/api/chatbot/welcome/test
```

### تحقق من Firebase
```bash
# في backend/src/config/firebase.js
console.log("Firebase initialized:", db ? "✅" : "❌");
```

## ✅ علامات النجاح

الشات بوت يعمل بشكل صحيح عندما:
- ✅ يفتح بدون أخطاء
- ✅ يعرض رسالة ترحيب
- ✅ يرد على الرسائل بسرعة
- ✅ الردود واضحة ومفيدة
- ✅ لا توجد أخطاء في Console
- ✅ Network requests تنجح (status 200)
