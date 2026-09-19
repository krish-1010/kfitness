"use client";

import { useEffect, useState, useCallback } from "react";
import { useDate } from "../_lib/DateContext";
import { CenteredLoading } from "../_components/shared";

type Supplement = { id: number; name: string; time: string; archived: boolean };

export default function SupplementsPage() {
  const { date } = useDate();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [suppLog, setSuppLog] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [showManageSupplements, setShowManageSupplements] = useState(false);
  const [editingSuppId, setEditingSuppId] = useState<number | null>(null);
  const [suppEdit, setSuppEdit] = useState({ name: "", time: "" });
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppTime, setNewSuppTime] = useState("");

  // Reads the same combined GET /api/log?date= endpoint the Food page also
  // reads independently — each page uses only its half ({supplements}
  // here, {items} there). No backend split needed at this app's scale.
  const loadSuppLog = useCallback(async (d: string) => {
    const res = await fetch(`/api/log?date=${d}`);
    const data: { supplements: Record<string, boolean> } = await res.json();
    setSuppLog(data.supplements);
  }, []);

  const loadSupplements = useCallback(async () => {
    const res = await fetch("/api/supplements");
    setSupplements(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSuppLog(date), loadSupplements()]).finally(() => setLoading(false));
  }, [date, loadSuppLog, loadSupplements]);

  const toggleSupp = async (id: string) => {
    const next = !suppLog[id];
    setSuppLog((prev) => ({ ...prev, [id]: next }));
    await fetch("/api/log/supplements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, supplementId: id, done: next }),
    });
  };

  const addSupplement = async () => {
    if (!newSuppName.trim()) return;
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSuppName.trim(), time: newSuppTime.trim() }),
    });
    const created: Supplement = await res.json();
    setSupplements((prev) => [...prev, created]);
    setNewSuppName("");
    setNewSuppTime("");
  };

  const startEditSupp = (s: Supplement) => {
    setEditingSuppId(s.id);
    setSuppEdit({ name: s.name, time: s.time });
  };

  const saveEditSupp = async (id: number) => {
    const res = await fetch(`/api/supplements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suppEdit.name, time: suppEdit.time }),
    });
    const updated = await res.json();
    setSupplements((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditingSuppId(null);
  };

  const deleteSupplement = async (id: number) => {
    setSupplements((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/supplements/${id}`, { method: "DELETE" });
  };

  if (loading) return <CenteredLoading />;

  const suppDoneCount = supplements.filter((s) => suppLog[String(s.id)]).length;

  return (
    <div>
      <div className="section-label">
        SUPPLEMENTS · {suppDoneCount}/{supplements.length}
      </div>
      <div className="border border-border mb-2">
        {supplements.map((s) => {
          const done = !!suppLog[String(s.id)];
          return (
            <button key={s.id} onClick={() => toggleSupp(String(s.id))} className="list-row flex justify-between items-center w-full bg-transparent text-left">
              <div>
                <div className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.time}</div>
              </div>
              <div className={`checkbox ${done ? "checkbox-done" : ""}`}>{done ? "✓" : ""}</div>
            </button>
          );
        })}
      </div>

      <button onClick={() => setShowManageSupplements((v) => !v)} className="btn-tiny w-full mb-5">
        {showManageSupplements ? "Hide" : "Manage"} supplement list
      </button>
      {showManageSupplements && (
        <div className="mb-5">
          <div className="border border-border">
            {supplements.map((s) => (
              <div key={s.id} className="list-row">
                {editingSuppId === s.id ? (
                  <div className="flex flex-col gap-1.5">
                    <input value={suppEdit.name} onChange={(e) => setSuppEdit({ ...suppEdit, name: e.target.value })} className="input-sm" />
                    <input value={suppEdit.time} onChange={(e) => setSuppEdit({ ...suppEdit, time: e.target.value })} className="input-sm" placeholder="e.g. AM · with food" />
                    <div className="flex gap-1.5">
                      <button onClick={() => saveEditSupp(s.id)} className="btn-primary flex-1 py-1.5 text-xs">
                        Save
                      </button>
                      <button onClick={() => setEditingSuppId(null)} className="btn-secondary flex-1 py-1.5 text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px]">
                      {s.name} <span className="text-muted-foreground">· {s.time}</span>
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEditSupp(s)} className="btn-tiny">
                        Edit
                      </button>
                      <button onClick={() => deleteSupplement(s.id)} className="btn-tiny">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input placeholder="New supplement name" value={newSuppName} onChange={(e) => setNewSuppName(e.target.value)} className="input-sm flex-1" />
            <input placeholder="Time (optional)" value={newSuppTime} onChange={(e) => setNewSuppTime(e.target.value)} className="input-sm flex-1" />
            <button onClick={addSupplement} className="btn-primary py-1.5 px-3 text-[13px]">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
