import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getDocuments() {
  const response = await api.get("/documents");
  return response.data;
}

export async function deleteDocument(documentId) {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
}

export async function askQuestion({ question, documentId }) {
  const response = await api.post("/chat", {
    question,
    document_id: documentId || null,
  });

  return response.data;
}

export async function getChatHistory(documentId) {
  const params = documentId ? `?document_id=${documentId}` : "";

  const response = await api.get(`/chat/history${params}`);

  return response.data;
}

export async function clearChatHistory(documentId) {
  const params = documentId ? `?document_id=${documentId}` : "";

  const response = await api.delete(`/chat/history${params}`);

  return response.data;
}

export async function getEvaluationTests(documentId) {
  const params = documentId ? `?document_id=${documentId}` : "";

  const response = await api.get(`/evaluation/tests${params}`);

  return response.data;
}

export async function createEvaluationTest(payload) {
  const response = await api.post("/evaluation/tests", payload);

  return response.data;
}

export async function updateEvaluationTest(testId, payload) {
  const response = await api.patch(`/evaluation/tests/${testId}`, payload);

  return response.data;
}

export async function deleteEvaluationTest(testId) {
  const response = await api.delete(`/evaluation/tests/${testId}`);

  return response.data;
}

export async function runEvaluationTest(testId) {
  const response = await api.post("/evaluation/run", {
    test_id: testId,
  });

  return response.data;
}