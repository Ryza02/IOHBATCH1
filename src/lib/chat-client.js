export function openEventStream(url, { onEvent, onOpen, onError } = {}) {
  let es;
  let retry = 0;
  let closed = false;

  const connect = () => {
    if (closed) return;
    es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
      retry = 0;
      onOpen && onOpen();
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent && onEvent(data);
      } catch {}
    };

    es.onerror = () => {
      onError && onError();
      es.close();
      if (closed) return;
      const wait = Math.min(30000, 1000 * Math.pow(2, retry++)); // exp backoff
      setTimeout(connect, wait);
    };
  };

  connect();

  return {
    close() {
      closed = true;
      if (es) es.close();
    },
  };
}

export async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    throw new Error(data?.message || `HTTP ${r.status}`);
  }
  return data;
}
