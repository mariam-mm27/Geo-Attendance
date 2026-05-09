========================================
   FIX AI ASSISTANT - QUICK START
========================================

PROBLEM: Chatbot shows "Connection Error"
CAUSE: Backend is not running

========================================
   SOLUTION (Choose One):
========================================

OPTION 1 - EASIEST (RECOMMENDED):
----------------------------------
1. Double-click: COMPLETE_FIX.bat
2. Wait 2-5 minutes
3. Done!


OPTION 2 - MANUAL:
------------------
1. Open terminal
2. Run these commands:

   cd backend
   npm install
   npm run dev

3. Wait for: "Server running on port 5000"
4. Done!


========================================
   DAILY USE (After First Setup):
========================================

1. Double-click: START_BACKEND.bat
2. Wait for: "Server running on port 5000"
3. Open browser: http://localhost:3000
4. Use chatbot!


========================================
   VERIFY IT'S WORKING:
========================================

1. Backend terminal shows:
   "Server running on port 5000"

2. Open: http://localhost:5000
   (Should see something, not "can't be reached")

3. Chatbot opens without "Connection Error"

4. Type "hello" in chatbot
   (Should get a friendly response)


========================================
   NEED HELP?
========================================

Read: FIX_AI_ASSISTANT.md
(Complete troubleshooting guide)


========================================
   QUICK COMMANDS:
========================================

Start Backend:
  cd backend && npm run dev

Start Frontend:
  cd frontend/Web && npm start

Check if Backend Running:
  netstat -ano | findstr :5000

Kill All Node Processes:
  taskkill /F /IM node.exe


========================================

Ready? Double-click COMPLETE_FIX.bat now!

========================================
