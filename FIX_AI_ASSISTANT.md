# 🤖 Fix AI Assistant - Complete Guide

## 🔴 Current Problem
```
❌ Connection Error
Unable to connect to the chat service.
Please check your internet connection and try again.
```

**Root Cause:** Backend server is not running on port 5000

---

## ✅ COMPLETE FIX (First Time Setup)

### Option 1: Use the Fix Script (RECOMMENDED)

1. **Double-click this file:**
   ```
   COMPLETE_FIX.bat
   ```

2. **Wait for it to complete** (2-5 minutes)

3. **You'll see:**
   ```
   Server running on port 5000
   ```

4. **Done!** Now open the chatbot in your browser

---

### Option 2: Manual Fix

Open PowerShell **as Administrator** and run:

```powershell
# 1. Go to project folder
cd "C:\Users\Mega Store\OneDrive\Documentos\GitHub\Geo-Attendance"

# 2. Kill all node processes
taskkill /F /IM node.exe

# 3. Clean backend
cd backend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# 4. Install dependencies
npm install

# 5. Start backend
npm run dev
```

---

## 🚀 DAILY USE (After First Setup)

### Start Backend:
Double-click: `START_BACKEND.bat`

**OR** in terminal:
```bash
cd backend
npm run dev
```

### Start Frontend:
Double-click: `START_FRONTEND.bat`

**OR** in terminal:
```bash
cd frontend/Web
npm start
```

---

## 🔍 Verify Backend is Running

### Method 1: Check Terminal
You should see:
```
[nodemon] starting `node src/app.js`
Server running on port 5000
```

### Method 2: Check Browser
Open: http://localhost:5000

- ✅ If you see anything (even an error) → Backend is running
- ❌ If you see "This site can't be reached" → Backend is NOT running

### Method 3: Check Port
```bash
netstat -ano | findstr :5000
```
- ✅ If you see output → Backend is running
- ❌ If empty → Backend is NOT running

---

## 🎯 Step-by-Step Testing

### 1. Start Backend
```bash
cd backend
npm run dev
```

**Wait for:**
```
Server running on port 5000
```

### 2. Test API
Open browser: http://localhost:5000/api/chatbot/welcome/test

**Expected:** JSON response (even if it's an error, that's OK - it means backend is running)

### 3. Start Frontend
In a **NEW** terminal:
```bash
cd frontend/Web
npm start
```

### 4. Test Chatbot
1. Open http://localhost:3000
2. Login as student
3. Click AI Assistant icon
4. Type: `hello`

**Expected:**
```
👋 Hello!

I'm your university assistant. I can help you with:
• 📊 Check attendance
• 📚 View courses
• 📱 Find active sessions
• 🔔 See notifications

What would you like to know?
```

---

## ❌ Common Errors & Solutions

### Error 1: "Cannot find package 'cors'"
**Solution:**
```bash
cd backend
npm install
```

### Error 2: "Port 5000 already in use"
**Solution:**
```bash
netstat -ano | findstr :5000
taskkill /F /PID [PID_NUMBER]
```

### Error 3: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org

### Error 4: Backend starts but crashes immediately
**Solution:**
```bash
cd backend
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
npm run dev
```

### Error 5: "Connection Error" in chatbot
**Cause:** Backend is not running
**Solution:** Start backend first (see above)

---

## 🔧 Troubleshooting Checklist

Before asking for help, check:

- [ ] Node.js is installed (`node --version`)
- [ ] npm is installed (`npm --version`)
- [ ] Backend dependencies are installed (`cd backend && npm list`)
- [ ] Backend is running (`netstat -ano | findstr :5000`)
- [ ] No errors in backend terminal
- [ ] Frontend is running on port 3000
- [ ] Browser console has no errors (F12)
- [ ] Firebase configuration is correct

---

## 📁 Important Files

### Backend:
- `backend/src/app.js` - Main server file
- `backend/src/services/intelligentChatbot.service.js` - Chatbot logic
- `backend/src/controllers/chatbot.controller.js` - API endpoints
- `backend/package.json` - Dependencies

### Frontend:
- `frontend/Web/src/components/IntelligentChatBot.jsx` - Chatbot UI
- `frontend/Web/src/components/ChatBotButton.jsx` - Chatbot button

### Scripts:
- `COMPLETE_FIX.bat` - First-time setup
- `START_BACKEND.bat` - Start backend
- `START_FRONTEND.bat` - Start frontend
- `restart-chatbot.bat` - Kill processes and restart

---

## 🎓 Understanding the System

### Architecture:
```
Frontend (React - Port 3000)
    ↓ HTTP Requests
Backend (Express - Port 5000)
    ↓ Firebase SDK
Firebase (Firestore Database)
```

### API Endpoints:
- `GET /api/chatbot/conversation/:userId` - Get/create conversation
- `POST /api/chatbot/conversation/:conversationId/message/:userId` - Send message
- `GET /api/chatbot/welcome/:userId` - Get welcome message
- `GET /api/chatbot/context/:userId` - Get user context

### Data Flow:
1. User types message in chatbot
2. Frontend sends POST to `/api/chatbot/conversation/.../message/...`
3. Backend calls `generateIntelligentResponse(userId, message)`
4. Service fetches user data from Firebase
5. Service generates appropriate response
6. Backend returns response to frontend
7. Frontend displays response

---

## 🚨 Emergency Reset

If nothing works, do a complete reset:

```bash
# 1. Kill everything
taskkill /F /IM node.exe

# 2. Clean backend
cd backend
rm -rf node_modules
rm package-lock.json

# 3. Clean frontend
cd ../frontend/Web
rm -rf node_modules
rm package-lock.json

# 4. Reinstall backend
cd ../../backend
npm install

# 5. Reinstall frontend
cd ../frontend/Web
npm install

# 6. Start backend
cd ../../backend
npm run dev

# 7. Start frontend (new terminal)
cd frontend/Web
npm start
```

---

## ✅ Success Indicators

The system is working correctly when:

1. **Backend Terminal Shows:**
   ```
   Server running on port 5000
   ```

2. **Frontend Opens Automatically** at http://localhost:3000

3. **Chatbot Opens** without "Connection Error"

4. **Chatbot Responds** to messages like "hello"

5. **No Errors** in browser console (F12)

6. **Network Tab** (F12) shows successful API calls (status 200)

---

## 📞 Getting Help

If you still have issues, provide:

1. **Screenshot** of the error
2. **Backend terminal** output
3. **Browser console** (F12 → Console tab)
4. **Network tab** (F12 → Network tab)
5. **Steps** to reproduce the problem

---

## 🎉 Next Steps

Once the chatbot is working:

1. Test with different user roles (student, professor, admin)
2. Try different questions
3. Test Arabic language support
4. Check attendance data
5. Verify course information

---

**Ready? Run `COMPLETE_FIX.bat` now!** 🚀
