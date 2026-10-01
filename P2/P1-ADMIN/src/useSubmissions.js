import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const SITE_ID = 'parimatch';
const RETRY_MS = 5000;

/* Firestore needs a composite index for where(site_id==) + orderBy(created_at),
   and a missing index fails the whole listener. So we order by created_at only
   (single-field index, always present) and drop other sites client-side. */
export function useSubmissions() {
  const [subs, setSubs] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [newCount, setNewCount] = useState(0);

  const prevIds = useRef(new Set());
  const firstLoad = useRef(true);
  const retryTimer = useRef(null);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    const start = () => {
      const q = query(collection(db, 'submissions'), orderBy('created_at', 'desc'));
      unsub = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache && firstLoad.current) return;

          const ids = new Set();
          const rows = [];
          snap.forEach((d) => {
            if (d.data().site_id !== SITE_ID) return;
            ids.add(d.id);
            rows.push({ id: d.id, ...d.data() });
          });

          let fresh = 0;
          if (prevIds.current.size > 0) {
            ids.forEach((id) => { if (!prevIds.current.has(id)) fresh++; });
          }

          prevIds.current = ids;
          firstLoad.current = false;
          setSubs(rows);
          setStatus(snap.metadata.fromCache ? 'cached' : 'connected');
          if (fresh > 0) setNewCount((c) => c + fresh);
        },
        (err) => {
          console.error(err);
          setStatus('error');
          if (!cancelled) retryTimer.current = setTimeout(start, RETRY_MS);
        }
      );
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer.current);
      if (unsub) unsub();
    };
  }, []);

  return { subs, status, newCount, clearNew: () => setNewCount(0) };
}
