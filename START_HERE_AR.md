# 🚀 ابدأ من هنا - تشغيل الشات بوت

## الخطوات السريعة

### 1️⃣ نظف الـ Ports (إذا كانت مشغولة)
انقر مرتين على:
```
restart-chatbot.bat
```

### 2️⃣ شغل Backend
افتح terminal وشغل:
```bash
cd backend
npm run dev
```

✅ **انتظر حتى ترى:**
```
Server running on port 5000
```

### 3️⃣ شغل Frontend
افتح terminal **جديد** وشغل:
```bash
cd frontend/Web
npm start
```

✅ **سيفتح المتصفح تلقائياً على:**
```
http://localhost:3000
```

### 4️⃣ اختبر الشات بوت
1. سجل دخول كطالب
2. اضغط على أيقونة الشات بوت 💬
3. اكتب: `hello`
4. يجب أن يرد بترحيب

## ✅ إذا نجح

يجب أن ترى:
```
👋 **Hello!**

I'm your university assistant. I can help you with:
• 📊 Check attendance
• 📚 View courses
• 📱 Find active sessions
• 🔔 See notifications

What would you like to know?
```

## ❌ إذا فشل

### المشكلة: Port 3000 مشغول
**الحل:** شغل `restart-chatbot.bat` ثم أعد المحاولة

### المشكلة: Connection Error
**الحل:** تأكد من أن Backend يعمل (الخطوة 2)

### المشكلة: User not found
**الحل:** تحقق من Firebase - يجب أن يكون المستخدم موجود

### المشكلة: Role not assigned
**الحل:** أضف role للمستخدم في Firebase

## 📚 ملفات المساعدة

- `TROUBLESHOOTING_AR.md` - حل جميع المشاكل
- `TEST_CHATBOT_AR.md` - دليل الاختبار
- `CHATBOT_REPLIES_IMPROVED.md` - شرح التحسينات

## 🆘 محتاج مساعدة؟

1. اقرأ `TROUBLESHOOTING_AR.md`
2. تحقق من Console (F12)
3. تحقق من Backend logs
4. تحقق من Firebase

## 💡 نصائح سريعة

1. **دائماً شغل Backend أولاً**
2. **انتظر حتى يبدأ Backend قبل Frontend**
3. **استخدم terminals منفصلة**
4. **تحقق من Firebase configuration**
5. **اقرأ الأخطاء في Console**

## 🎯 الهدف

الشات بوت يجب أن:
- ✅ يفتح بدون أخطاء
- ✅ يرد على الرسائل
- ✅ يعطي ردود واضحة
- ✅ يفهم العربية والإنجليزية
- ✅ يتعامل مع الأخطاء بشكل احترافي

---

**جاهز؟ ابدأ من الخطوة 1️⃣ أعلاه!** 🚀
