/* =============================================================
   Live chat data layer — same Firebase as the ADMIN PANEL.
   -------------------------------------------------------------
   rooms:   chat_rooms/{mobile}          (room meta / presence)
   messages chat_rooms/{mobile}/messages/{msgId}
   Support presence is read from admin_status/admin, which the admin
   panel writes whenever it is open.
   ============================================================= */

const ChatStore = (function () {
  let _dbPromise = null;

  function getDb() {
    if (!_dbPromise) _dbPromise = loadFirebase();
    return _dbPromise;
  }

  function roomDoc(room) {
    return getDb().then(db => db.collection('chat_rooms').doc(room));
  }

  function messagesRef(room) {
    return getDb().then(db => db.collection('chat_rooms').doc(room).collection('messages'));
  }

  /* Support is "online" while the admin panel is open. */
  function onAdminStatus(callback) {
    let unsub = null;
    getDb().then(db => {
      unsub = db.collection('admin_status').doc('admin').onSnapshot(snap => {
        callback(!!(snap.exists() && snap.data() && snap.data().online));
      }, () => callback(false));
    }).catch(() => callback(false));
    return function () { if (unsub) unsub(); };
  }

  /* Full message list of a room, oldest first. */
  function onMessages(room, callback) {
    let unsub = null;
    messagesRef(room).then(ref => {
      unsub = ref.orderBy('timestamp', 'asc').onSnapshot(snap => {
        callback(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
      }, err => console.warn('Chat listener error:', err));
    }).catch(err => console.warn('Chat listener failed:', err));
    return function () { if (unsub) unsub(); };
  }

  function sendMessage(room, msgId, data) {
    return messagesRef(room).then(ref => ref.doc(msgId).set(Object.assign({ timestamp: Date.now() }, data)));
  }

  function updateMessage(room, msgId, data) {
    return messagesRef(room).then(ref => ref.doc(msgId).update(data));
  }

  function deleteMessage(room, msgId) {
    return messagesRef(room).then(ref => ref.doc(msgId).delete());
  }

  function updateMeta(room, meta) {
    return roomDoc(room).then(ref => ref.set(Object.assign({
      site_id: SITE_ID,
      mobile: room,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, meta), { merge: true }));
  }

  function setUserOnline(room, online) {
    return roomDoc(room).then(ref => ref.set({
      site_id: SITE_ID,
      userOnline: online,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }));
  }

  function clearRoom(room) {
    return messagesRef(room)
      .then(ref => ref.get())
      .then(snap => {
        if (snap.empty) return null;
        return getDb().then(db => {
          const batch = db.batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          return batch.commit();
        });
      });
  }

  return {
    onAdminStatus: onAdminStatus,
    onMessages: onMessages,
    sendMessage: sendMessage,
    updateMessage: updateMessage,
    deleteMessage: deleteMessage,
    updateMeta: updateMeta,
    setUserOnline: setUserOnline,
    clearRoom: clearRoom
  };
})();
