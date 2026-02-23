# Geo-Attendance
### Secure QR-Based Attendance Management System

Geo-Attendance is a secure attendance management system designed to make classroom check-ins accurate, fast, and fraud-resistant.

 the system uses **time-based dynamic QR codes** that refresh every **15 seconds**, ensuring that only students physically present in the classroom at the correct time can register attendance.
----------------------------------------------
###Team Members : 1- Mariam Khaled Ramadan Mohamed 2- Mariam Khaled Mostafa Mohamed 3- Mariam Hany Hussien Aly 4- Mariam Mohamed Ibrahim Ismail 5- Shimaa Abd El Fattah Gamil 6- Alaa Mostafa Hanfy Tantawy
-----------------------
Project Overview
Traditional attendance systems are vulnerable to proxy attendance and manual errors.
Geo-Attendance solves this problem by generating short-lived QR codes during lectures, which students must scan in real time to mark attendance.
--------------------------------------
Problem Statement
Time wasted on manual attendance Lecturers lose valuable lecture time taking roll calls.

Proxy attendance Students can sign attendance for absent peers.

Static QR code abuse Fixed QR codes can be shared remotely.

Difficult reporting Manual records make analytics unreliable.
------------------------------------------
Proposed Solution
Geo-Attendance uses:
- Dynamic QR codes refreshed every **15 seconds**
- Time-gated attendance sessions
- Secure backend validation
- Real-time verification
---------------
##  System Workflow

1. Lecturer creates a lecture session
2. System generates a QR code
3. QR code refreshes every 15 seconds
4. Students scan the QR during the session
5. Backend validates:
   - QR validity
   - Timestamp
   - Session ID
6. Attendance is recorded instantly
-----------------------------------------
##  Attendance Validation Mechanism

- QR codes expire every 15 seconds
- Prevents sharing screenshots or remote scans
- Time-based validation ensures real presence
- All scans are logged for auditing and reporting
- ------------------------------------------------------
Key Benefits
Eliminates proxy attendance
Fast and frictionless check-in
No location or GPS dependency
High security using time-based QR codes
Scalable for classrooms and institutions
------------------------
Project Status
Academic project – currently in planning and initial development phase.
-----------------------
Project Files
https://drive.google.com/drive/folders/1N5HhRTIjNQV6N37ZuHgis6xq_n4aaoq2?usp=sharing
