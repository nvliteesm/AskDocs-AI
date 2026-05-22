import { useEffect, useState } from "react";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  askQuestion,
  getChatHistory,
  clearChatHistory,
} from "./api/client";
import Sidebar from "./components/sidebar";
import EvaluationPanel from "./components/evaluationPanel";
import ChatHistory from "./components/chatHistory";
import UploadBox from "./components/uploadBox";
import ChatPanel from "./components/chatPanel";
import AnswerPanel from "./components/answerPanel";
import EmptyState from "./components/emptyState";
import DocumentDetails from "./components/documentDetails";
import "./index.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [confidence, setConfidence] = useState("");
  const [confidenceReason, setConfidenceReason] = useState("");
  const [sources, setSources] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      setLoadingDocs(true);
      setError("");

      const data = await getDocuments();
      setDocuments(data.documents || data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }

  async function loadChatHistory(documentId = selectedDocumentId) {
    try {
      setLoadingHistory(true);

      const data = await getChatHistory(documentId);
      setChatHistory(data.messages || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load chat history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    loadChatHistory(selectedDocumentId);
  }, [selectedDocumentId]);

  function handleSelectDocument(documentId) {
    setSelectedDocumentId(documentId);
    setAnswer(null);
    setConfidence("");
    setConfidenceReason("");
    setSources([]);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const uploaded = await uploadDocument(file);

      await loadDocuments();

      const uploadedDocumentId =
        uploaded?.document?.id || uploaded?.document_id || uploaded?.id;

      if (uploadedDocumentId) {
        setSelectedDocumentId(uploadedDocumentId);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleDeleteDocument(documentId) {
    try {
      setError("");

      await deleteDocument(documentId);

      if (selectedDocumentId === documentId) {
        setSelectedDocumentId("");
        setAnswer(null);
        setConfidence("");
        setConfidenceReason("");
        setSources([]);
      }

      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError("Failed to delete document.");
    }
  }

  async function handleAsk(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    try {
      setAsking(true);
      setError("");
      setAnswer(null);
      setConfidence("");
      setConfidenceReason("");
      setSources([]);

      const data = await askQuestion({
        question: trimmedQuestion,
        documentId: selectedDocumentId,
      });

      setAnswer(data.answer || "");
      setConfidence(data.confidence || "");
      setConfidenceReason(data.confidence_reason || "");
      setSources(data.sources || data.citations || []);

      await loadChatHistory(selectedDocumentId);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to get an answer.");
    } finally {
      setAsking(false);
    }
  }

  async function handleClearHistory() {
    try {
      setClearingHistory(true);
      setError("");

      await clearChatHistory(selectedDocumentId);
      setChatHistory([]);
    } catch (err) {
      console.error(err);
      setError("Failed to clear chat history.");
    } finally {
      setClearingHistory(false);
    }
  }

  const selectedDocument = documents.find(
    (doc) => doc.id === selectedDocumentId
  );

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[96rem]">
        <Sidebar
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          uploading={uploading}
          loadingDocs={loadingDocs}
          onUpload={handleUpload}
          onSelectDocument={handleSelectDocument}
          onDeleteDocument={handleDeleteDocument}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 px-5 py-4 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    Grounded Q&A
                  </span>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {selectedDocument ? "Single document" : "All documents"}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-500">
                  Current document
                </p>

                <h2
                  title={
                    selectedDocument
                      ? selectedDocument.filename
                      : "Ask across your uploaded documents"
                  }
                  className="mt-1 truncate text-xl font-bold tracking-tight text-slate-950"
                >
                  {selectedDocument
                    ? selectedDocument.filename
                    : "Ask across your uploaded documents"}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-64">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">
                    Documents
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {documents.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">
                    Sources
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {sources.length}
                  </p>
                </div>
              </div>
            </div>
          </header>


          <div className="flex-1 px-5 py-8">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:hidden">
                <UploadBox uploading={uploading} onUpload={handleUpload} />

                <select
                  value={selectedDocumentId}
                  onChange={(event) => {
                    handleSelectDocument(event.target.value);
                  }}
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">All uploaded documents</option>

                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {documents.length === 0 && !loadingDocs ? (
                <EmptyState />
              ) : (
                <>
                  <DocumentDetails
                    document={selectedDocument}
                    historyCount={chatHistory.length}
                  />

                  <ChatPanel
                    question={question}
                    setQuestion={setQuestion}
                    asking={asking}
                    onAsk={handleAsk}
                  />

                  <AnswerPanel
                    asking={asking}
                    answer={answer}
                    confidence={confidence}
                    confidenceReason={confidenceReason}
                    sources={sources}
                  />

                  <div className="mt-6">
                    <EvaluationPanel selectedDocument={selectedDocument} />
                  </div>

                  <ChatHistory
                    messages={chatHistory}
                    loading={loadingHistory}
                    clearing={clearingHistory}
                    onClear={handleClearHistory}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;