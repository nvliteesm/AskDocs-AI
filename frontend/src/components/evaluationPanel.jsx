import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  createEvaluationTest,
  deleteEvaluationTest,
  getEvaluationTests,
  runEvaluationTest,
  updateEvaluationTest,
} from "../api/client";

function getStatusLabel(status) {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "needs_review") return "Needs review";
  return "Not run";
}

function getStatusStyle(status) {
  if (status === "passed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function EvaluationPanel({ selectedDocument }) {
  const [tests, setTests] = useState([]);
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingTests, setLoadingTests] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const documentId = selectedDocument?.id || "";

  const summary = useMemo(() => {
    return {
      total: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed: tests.filter((test) => test.status === "failed").length,
      needsReview: tests.filter((test) => test.status === "needs_review").length,
    };
  }, [tests]);

  async function loadTests() {
    try {
      setError("");
      setLoadingTests(true);

      const data = await getEvaluationTests(documentId);
      setTests(data.tests || data || []);
    } catch (err) {
        console.error(err);

    setError(
        err.response?.data?.detail ||
            err.message ||
            "Failed to run evaluation test."
        );
    } finally {
        setLoadingTests(false);
        setRunningId(null);
    }
  }

  useEffect(() => {
    loadTests();
  }, [documentId]);

  async function handleCreateTest(event) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Question cannot be empty.");
      return;
    }

    try {
      setError("");
      setCreating(true);

      await createEvaluationTest({
        document_id: documentId || null,
        question: question.trim(),
        expected_answer: expectedAnswer.trim() || null,
        notes: notes.trim() || null,
      });

      setQuestion("");
      setExpectedAnswer("");
      setNotes("");

      await loadTests();
    } catch (err) {
      console.error(err);
      setError("Failed to create evaluation test.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRunTest(testId) {
    try {
      setError("");
      setRunningId(testId);

      const updatedTest = await runEvaluationTest(testId);

      setTests((currentTests) =>
        currentTests.map((test) => (test.id === testId ? updatedTest : test))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to run evaluation test.");
    } finally {
      setRunningId(null);
    }
  }

  async function handleStatusChange(testId, status) {
    try {
      setError("");
      setUpdatingId(testId);

      const updatedTest = await updateEvaluationTest(testId, { status });

      setTests((currentTests) =>
        currentTests.map((test) => (test.id === testId ? updatedTest : test))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update evaluation status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteTest(testId) {
    try {
      setError("");
      setDeletingId(testId);

      await deleteEvaluationTest(testId);

      setTests((currentTests) =>
        currentTests.filter((test) => test.id !== testId)
      );
    } catch (err) {
      console.error(err);
      setError("Failed to delete evaluation test.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <ClipboardCheck className="h-3.5 w-3.5" />
            RAG Evaluation
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Evaluation tests
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add test questions, run them through VerifiDocs, then manually mark the answer as passed or failed.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Current scope:{" "}
            <span className="font-medium text-slate-700">
              {selectedDocument ? selectedDocument.filename : "all uploaded documents"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-lg font-semibold text-slate-950">{summary.total}</p>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Total</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-lg font-semibold text-emerald-700">{summary.passed}</p>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-emerald-700">Pass</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-lg font-semibold text-rose-700">{summary.failed}</p>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-rose-700">Fail</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-lg font-semibold text-amber-700">{summary.needsReview}</p>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-amber-700">Review</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={handleCreateTest}
        className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Test question"
            className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />

          <textarea
            value={expectedAnswer}
            onChange={(event) => setExpectedAnswer(event.target.value)}
            placeholder="Expected answer"
            className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes"
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        />

        <button
          type="submit"
          disabled={creating}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add test
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {loadingTests ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Loading evaluation tests...
          </div>
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-800">
              No evaluation tests yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add one test question above.
            </p>
          </div>
        ) : (
          tests.map((test) => (
            <article
              key={test.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(test.status)}`}>
                    {getStatusLabel(test.status)}
                  </span>

                  <h3 className="mt-3 text-base font-semibold text-slate-950">
                    {test.question}
                  </h3>

                  {test.notes && (
                    <p className="mt-2 text-sm text-slate-500">{test.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRunTest(test.id)}
                    disabled={runningId === test.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {runningId === test.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Run
                  </button>

                  <button
                    onClick={() => handleStatusChange(test.id, "passed")}
                    disabled={updatingId === test.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pass
                  </button>

                  <button
                    onClick={() => handleStatusChange(test.id, "failed")}
                    disabled={updatingId === test.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Fail
                  </button>

                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    disabled={deletingId === test.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
                  >
                    {deletingId === test.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expected answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {test.expected_answer || "No expected answer provided."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Generated answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {test.generated_answer || "Run this test to generate an answer."}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confidence
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {test.confidence || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sources
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {test.source_count ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason
                  </p>
                  <p className="mt-1 text-slate-700">
                    {test.confidence_reason || "-"}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default EvaluationPanel;
