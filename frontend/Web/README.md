<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# Geo-Attendance
### Secure QR-Based Attendance Management System

Geo-Attendance is a secure attendance management system designed to make classroom check-ins accurate, fast, and fraud-resistant.

 the system uses **time-based dynamic QR codes** that refresh every **15 seconds**, ensuring that only students physically present in the classroom at the correct time can register attendance.
----------------------------------------------
###Team Members : 1- Mariam Khaled Ramadan Mohamed 2- Mariam Khaled Mostafa Mohamed 3- Mariam Hany Hussien Aly 4- Mariam Mohamed Ibrahim Ismail 5- Shimaa Abd El Fattah Gamil 6- Alaa Mostafa Hanfy Tantawy
-----------------------
##  Project Overview
Traditional attendance systems are vulnerable to proxy attendance and manual errors.
Geo-Attendance solves this problem by generating short-lived QR codes during lectures, which students must scan in real time to mark attendance.
--------------------------------------
##  Problem Statement
Time wasted on manual attendance Lecturers lose valuable lecture time taking roll calls.

Proxy attendance Students can sign attendance for absent peers.

Static QR code abuse Fixed QR codes can be shared remotely.

Difficult reporting Manual records make analytics unreliable.
------------------------------------------
##  Proposed Solution
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
>>>>>>> 54fa9fe4da2a97b239570732b87e40711df2a882
