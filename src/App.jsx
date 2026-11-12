import { useState, useRef } from "react";
import { checkFiles } from "./utils/checkCsv";

const TARGET = "Average of UnitPrice";

// eslint-disable-next-line no-unused-vars
function Badge({ status }) {
  const styles = {
    pass: "bg-emerald-100 text-emerald-800",
    fail: "bg-red-100 text-red-800",
    error: "bg-amber-100 text-amber-800",
  }[status];
  const label = { pass: "PASS", fail: "FAIL", error: "ERROR" }[status];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function App() {
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const run = async (fileList) => {
    const files = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".csv"),
    );
    if (!files.length) return;
    setResults([]);
    setProgress({ done: 0, total: files.length });
    const out = await checkFiles(files, (done, total) =>
      setProgress({ done, total }),
    );
    setResults(out);
    setProgress(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    run(e.dataTransfer.files);
  };

  const summary = results.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {},
  );

  const exportReport = () => {
    const rows = [
      ["filename", "status", "c1_value", "reason"],
      ...results.map((r) => [r.name, r.status, r.c1, r.reason ?? ""]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csv-check-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-zinc-100">
          CSV Cell Checker
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Checks that cell C1 (3rd column, 1st row) equals{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">
            {TARGET}
          </code>
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 cursor-pointer border-2 border-dashed p-10 text-center transition-colors ${
            dragging
              ? "border-zinc-500 bg-zinc-900"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <p className="text-sm font-medium text-zinc-300">
            Drop .csv files here
          </p>
          <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv"
            className="hidden"
            onChange={(e) => run(e.target.files)}
          />
        </div>

        {/* Progress */}
        {progress && (
          <p className="mt-4 text-sm text-zinc-400">
            Checking {progress.done} / {progress.total}…
          </p>
        )}

        {/* Report */}
        {results.length > 0 && !progress && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-400">
                {summary.pass || 0} passed
              </span>
              <span className="text-rose-400">{summary.fail || 0} failed</span>
              <span className="text-amber-400">
                {summary.error || 0} errors
              </span>
            </div>
            <button
              onClick={exportReport}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Export report
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">File</th>
                  <th className="px-4 py-2 font-medium">C1 value</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-2 text-xs text-zinc-300">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {r.c1 || <span className="text-zinc-600">—</span>}
                      {r.reason && (
                        <span className="ml-2 text-amber-400">
                          ({r.reason})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
