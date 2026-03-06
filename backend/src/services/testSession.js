import { createSession, getProfessorSessions, closeSession } from "./sessionService";

const runTest = async () => {
  const id = await createSession("course123", 60);
  console.log("Created:", id);

  const sessions = await getProfessorSessions();
  console.log("All Sessions:", sessions);

  await closeSession(id);
  console.log("Closed");
};

runTest();