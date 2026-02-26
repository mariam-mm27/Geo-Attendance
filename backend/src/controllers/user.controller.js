// backend/src/controllers/user.controller.js
const { saveUser, getUserById, updateUser } = require("../services/user.service");


async function registerUser(req, res) {
  try {
    const { uid, name, email, role, studentId } = req.body;
    await saveUser({ uid, name, email, role, studentId });
    res.status(201).send({ message: "User registered!" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

async function getUser(req, res) {
  try {
    const { uid } = req.params;
    const docSnap = await getUserById(uid);
    if (!docSnap.exists) return res.status(404).send({ error: "User not found" });
    res.send(docSnap.data());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}


async function updateUserData(req, res) {
  try {
    const { uid } = req.params;
    const data = req.body;
    await updateUser(uid, data);
    res.send({ message: "User updated" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

module.exports = { registerUser, getUser, updateUserData };