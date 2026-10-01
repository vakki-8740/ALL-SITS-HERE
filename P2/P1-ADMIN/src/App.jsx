import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSubmissions } from './useSubmissions';
import { toDate, searchHaystack } from './utils';
import Topbar from './components/Topbar';
import StatsRow from './components/StatsRow';
import SearchBar from './components/SearchBar';
import RequestList from './components/RequestList';
import DetailPage from './components/DetailPage';
import ImageModal from './components/ImageModal';
import ConfirmDialog from './components/ConfirmDialog';
import Toast from './components/Toast';
import BottomNav from './components/BottomNav';

export default function App() {
  const { subs, status, newCount, clearNew } = useSubmissions();

  const [page, setPage] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [image, setImage] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });

  const toastTimer = useRef(null);
  const confirmResolver = useRef(null);

  const showToast = useCallback((msg, type = '') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast({ msg: '', type: '' }), 2200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Announce freshly arrived submissions once per batch.
  useEffect(() => {
    if (newCount <= 0) return;
    showToast(newCount + ' new request' + (newCount > 1 ? 's' : ''), 'success');
    clearNew();
  }, [newCount, clearNew, showToast]);

  const askConfirm = useCallback((title, message) => {
    setConfirmState({ title, message });
    return new Promise((resolve) => { confirmResolver.current = resolve; });
  }, []);

  const closeConfirm = useCallback((result) => {
    setConfirmState(null);
    if (confirmResolver.current) {
      confirmResolver.current(result);
      confirmResolver.current = null;
    }
  }, []);

  const goHome = useCallback(() => {
    setPage('home');
    setSelectedId(null);
    window.scrollTo(0, 0);
  }, []);

  const openDetail = useCallback((id) => {
    setSelectedId(id);
    setPage('detail');
    window.scrollTo(0, 0);
  }, []);

  const todayCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let n = 0;
    for (const s of subs) {
      const d = toDate(s.created_at);
      if (d && d >= start) n++;
    }
    return n;
  }, [subs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) => searchHaystack(s).includes(q));
  }, [subs, search]);

  const selected = useMemo(
    () => subs.find((s) => s.id === selectedId) || null,
    [subs, selectedId]
  );

  return (
    <>
      <Topbar status={status} />

      <main className="main-content">
        <section className={'page' + (page === 'home' ? ' active' : '')} id="page-home">
          <StatsRow total={subs.length} requests={subs.length} today={todayCount} />

          <div className="section-header">
            <h2>Recent Requests</h2>
            <span className="count">{visible.length + ' request' + (visible.length !== 1 ? 's' : '')}</span>
          </div>

          <SearchBar value={search} onChange={setSearch} />

          <RequestList subs={visible} onOpen={openDetail} />
        </section>

        <section className={'page' + (page === 'detail' ? ' active' : '')} id="page-detail">
          <DetailPage
            sub={selected}
            onBack={goHome}
            onToast={showToast}
            onConfirm={askConfirm}
            onViewImage={setImage}
          />
        </section>
      </main>

      <BottomNav onHome={goHome} />

      <ImageModal image={image} onClose={() => setImage(null)} onToast={showToast} />
      <ConfirmDialog
        state={confirmState}
        onCancel={() => closeConfirm(false)}
        onOk={() => closeConfirm(true)}
      />
      <Toast toast={toast} />
    </>
  );
}
