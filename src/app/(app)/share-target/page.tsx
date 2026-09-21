"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CenteredLoading } from "../_components/shared";

type Exercise = { id: number; name: string; muscleGroup: string };

// Pulls a URL out of whatever the OS share sheet actually sent — some apps
// (YouTube) populate a dedicated `url` param, others (Instagram, many
// browsers' "Share..." menus) only fill `text` with something like "Check
// this out: https://...". Preferring `url` when present, falling back to
// the first http(s) URL found anywhere in `text`.
function extractUrl(url: string | null, text: string | null): string {
  if (url && /^https?:\/\//.test(url)) return url;
  const match = (text ?? "").match(/https?:\/\/\S+/);
  return match ? match[0] : url ?? "";
}

function ShareTargetForm() {
  const params = useSearchParams();
  const sharedTitle = params.get("title");
  const sharedText = params.get("text");
  const sharedUrl = params.get("url");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [label, setLabel] = useState(sharedTitle ?? "");
  const [url, setUrl] = useState(extractUrl(sharedUrl, sharedText));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data: Exercise[]) => setExercises(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? exercises.filter(
        (e) => e.name.toLowerCase().includes(query.trim().toLowerCase()) || e.muscleGroup.toLowerCase().includes(query.trim().toLowerCase())
      )
    : exercises;

  const save = async () => {
    if (!selectedId || !url.trim()) return;
    setSaving(true);
    await fetch(`/api/exercises/${selectedId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), url: url.trim() }),
    });
    setSaving(false);
    setSaved(true);
  };

  if (loading) return <CenteredLoading />;

  if (saved) {
    const selected = exercises.find((e) => e.id === selectedId);
    return (
      <div>
        <div className="section-label">LINK SAVED</div>
        <div className="card text-center p-6">
          <div className="text-[15px] mb-1.5">Added to {selected?.name}</div>
          <div className="text-[13px] text-muted-foreground mb-4">You can close this tab now, or add another.</div>
          <button
            onClick={() => {
              setSaved(false);
              setSelectedId(null);
              setLabel("");
              setUrl("");
              setQuery("");
            }}
            className="btn-secondary w-full"
          >
            Add another link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label">ADD TUTORIAL LINK</div>

      {!selectedId ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises or muscle group…"
            autoFocus
            className="input mb-2"
          />
          <div className="border border-border">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className="list-row flex justify-between items-center w-full bg-transparent text-left"
              >
                <span className="text-sm">{ex.name}</span>
                <span className="text-xs text-muted-foreground">{ex.muscleGroup}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="list-row text-xs text-muted-foreground">No exercises match &quot;{query}&quot;</div>}
          </div>
        </>
      ) : (
        <div className="card flex flex-col gap-2">
          <div className="text-[13px] text-muted-foreground">
            Adding a link to <span className="text-foreground font-semibold">{exercises.find((e) => e.id === selectedId)?.name}</span>
          </div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Form check)" className="input" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="input" />
          <div className="flex gap-2">
            <button onClick={save} disabled={!url.trim() || saving} className="btn-primary flex-1 disabled:opacity-40">
              {saving ? "Saving…" : "Save link"}
            </button>
            <button onClick={() => setSelectedId(null)} className="btn-secondary flex-1">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={<CenteredLoading />}>
      <ShareTargetForm />
    </Suspense>
  );
}
