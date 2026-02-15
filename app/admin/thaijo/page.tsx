"use client";

import { FormEvent, useState } from "react";

const API_URL = "/api/admin/thaijo";

type ThaijoRequestBody = {
  term: string;
  page: number;
  size: number;
  strict: boolean;
  title: boolean;
  author: boolean;
  abstract: boolean;
};

export default function Page() {
  const [payload, setPayload] = useState<ThaijoRequestBody>({
    term: "โรคซึมเศร้าในผู้ป่วยเบาหวาน",
    page: 1,
    size: 3,
    strict: true,
    title: true,
    author: true,
    abstract: true,
  });
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let parsed: unknown = text;

      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = { raw: text };
      }

      if (!response.ok) {
        throw new Error(
          `API Error ${response.status}: ${JSON.stringify(parsed, null, 2)}`,
        );
      }

      setResult(parsed);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const setBooleanField = (field: keyof Omit<ThaijoRequestBody, "term" | "page" | "size">, value: boolean) => {
    setPayload((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">ThaiJO API Tester</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">term</label>
          <input
            value={payload.term}
            onChange={(event) =>
              setPayload((previous) => ({ ...previous, term: event.target.value }))
            }
            className="w-full rounded border px-3 py-2"
            placeholder="คำค้น"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">page</label>
            <input
              type="number"
              min={1}
              value={payload.page}
              onChange={(event) =>
                setPayload((previous) => ({
                  ...previous,
                  page: Number(event.target.value) || 1,
                }))
              }
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">size</label>
            <input
              type="number"
              min={1}
              value={payload.size}
              onChange={(event) =>
                setPayload((previous) => ({
                  ...previous,
                  size: Number(event.target.value) || 1,
                }))
              }
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            ["strict", "title", "author", "abstract"] as const
          ).map((field) => (
            <label key={field} className="flex items-center gap-2 rounded border px-3 py-2">
              <input
                type="checkbox"
                checked={payload[field]}
                onChange={(event) => setBooleanField(field, event.target.checked)}
              />
              <span className="text-sm">{field}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "กำลังยิง API..." : "ยิง API"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border p-4">
        <div className="mb-2 text-sm font-semibold">ผลลัพธ์ JSON</div>
        <pre className="max-h-[60vh] overflow-auto rounded bg-gray-100 p-3 text-xs">
          {result ? JSON.stringify(result, null, 2) : "ยังไม่มีผลลัพธ์"}
        </pre>
      </div>
    </div>
  );
}