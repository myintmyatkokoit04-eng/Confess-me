import { useEffect, useRef, useState } from "react";
import { api } from "./api";

// Keep private writing on the server, scoped to the signed-in account.
export default function useWritingDraft(key, payload, restore) {
  const [recovered, setRecovered] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Checking saved writing…");
  const latest = useRef(payload);
  latest.current = payload;
  const baseline = useRef(JSON.stringify(payload));
  const [savedSignature, setSavedSignature] = useState(baseline.current);
  const queue = useRef(Promise.resolve());
  const paused = useRef(false);
  const mounted = useRef(true);
  const path = `writing-drafts/${key}`;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    api(path)
      .then(({ draft }) => {
        if (!active) return;
        setRecovered(draft);
        setReady(true);
        setStatus(draft ? "Saved writing found" : "Draft autosave is on");
      })
      .catch(() => {
        if (active)
          setStatus("Autosave unavailable. Close and reopen to retry.");
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [path]);

  function persist() {
    const value = latest.current;
    const snapshot = JSON.stringify(value);
    if (!ready || recovered) {
      if (snapshot === baseline.current) return queue.current;
      return Promise.reject(
        new Error("Choose whether to restore saved writing before continuing."),
      );
    }
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (snapshot === baseline.current) return;
        if (mounted.current) setStatus("Saving draft…");
        await api(path, "PUT", value);
        baseline.current = snapshot;
        if (mounted.current) {
          setSavedSignature(snapshot);
          setStatus("Draft saved automatically");
        }
      })
      .catch((error) => {
        if (mounted.current)
          setStatus(
            "Draft not saved. Your text is still here; retry before closing.",
          );
        throw error;
      });
    queue.current = task;
    return task;
  }
  const signature = JSON.stringify(payload);
  useEffect(() => {
    if (!ready || recovered || paused.current || signature === baseline.current)
      return;
    const timer = setTimeout(() => {
      if (!paused.current) void persist().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [signature, ready, recovered, savedSignature]);

  return {
    status,
    recovered,
    ready,
    restore() {
      restore(recovered);
      setRecovered(null);
      setStatus("Recovered writing. Changes save automatically.");
    },
    async discard() {
      await api(path, "DELETE");
      baseline.current = JSON.stringify(latest.current);
      setRecovered(null);
      setStatus("Draft autosave is on");
    },
    async flush() {
      await persist();
    },
    async beforePublish() {
      paused.current = true;
      await queue.current.catch(() => {});
    },
    resume() {
      paused.current = false;
    },
  };
}
