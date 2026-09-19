"use client";

import { useEffect, useState, useCallback } from "react";
import { useDate } from "../_lib/DateContext";
import { ink, inkDim, bg, line, green, tinyBtn, sectionLabel, smallInputStyle, primaryBtn, secondaryBtn } from "../_components/shared";

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

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  const suppDoneCount = supplements.filter((s) => suppLog[String(s.id)]).length;

  return (
    <div>
      <div style={sectionLabel}>
        SUPPLEMENTS · {suppDoneCount}/{supplements.length}
      </div>
      <div style={{ border: `1px solid ${line}`, marginBottom: 8 }}>
        {supplements.map((s, idx) => {
          const done = !!suppLog[String(s.id)];
          return (
            <button
              key={s.id}
              onClick={() => toggleSupp(String(s.id))}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: "none",
                borderBottom: idx < supplements.length - 1 ? `1px solid ${line}` : "none",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: done ? inkDim : ink, textDecoration: done ? "line-through" : "none" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: inkDim }}>{s.time}</div>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: `1.5px solid ${done ? green : line}`,
                  background: done ? green : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: bg,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {done ? "✓" : ""}
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={() => setShowManageSupplements((v) => !v)} style={{ ...tinyBtn, width: "100%", marginBottom: 20 }}>
        {showManageSupplements ? "Hide" : "Manage"} supplement list
      </button>
      {showManageSupplements && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ border: `1px solid ${line}` }}>
            {supplements.map((s, idx) => (
              <div key={s.id} style={{ padding: "8px 10px", borderBottom: idx < supplements.length - 1 ? `1px solid ${line}` : "none" }}>
                {editingSuppId === s.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input value={suppEdit.name} onChange={(e) => setSuppEdit({ ...suppEdit, name: e.target.value })} style={smallInputStyle} />
                    <input value={suppEdit.time} onChange={(e) => setSuppEdit({ ...suppEdit, time: e.target.value })} style={smallInputStyle} placeholder="e.g. AM · with food" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => saveEditSupp(s.id)} style={{ ...primaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                        Save
                      </button>
                      <button onClick={() => setEditingSuppId(null)} style={{ ...secondaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>
                      {s.name} <span style={{ color: inkDim }}>· {s.time}</span>
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEditSupp(s)} style={tinyBtn}>
                        Edit
                      </button>
                      <button onClick={() => deleteSupplement(s.id)} style={tinyBtn}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input placeholder="New supplement name" value={newSuppName} onChange={(e) => setNewSuppName(e.target.value)} style={{ ...smallInputStyle, flex: 1 }} />
            <input placeholder="Time (optional)" value={newSuppTime} onChange={(e) => setNewSuppTime(e.target.value)} style={{ ...smallInputStyle, flex: 1 }} />
            <button onClick={addSupplement} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 13 }}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
