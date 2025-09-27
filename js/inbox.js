import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const conversationList = document.getElementById('conversation-list');

onAuthStateChanged(auth, user => {
  if (!user) {
    conversationList.innerHTML = `<div class="text-center p-8"><h2>Access Denied</h2><p>Please <a href="login.html" class="font-bold">log in</a> to view your inbox.</p></div>`;
    return;
  }
  loadConversations(user.uid);
});

function loadConversations(currentUserId) {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('users', 'array-contains', currentUserId));

  onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      conversationList.innerHTML = '<p class="text-center text-muted p-8">You have no conversations yet.</p>';
      return;
    }

    const chats = snapshot.docs.map(d => ({ id: d.id, data: d.data() }))
      .sort((a,b) => (b.data.lastUpdated?.toMillis?.() || 0) - (a.data.lastUpdated?.toMillis?.() || 0));

    const chatItemsHtml = await Promise.all(chats.map(async (c) => {
      const chat = c.data;
      const chatId = c.id;
      const recipientId = (chat.users || []).find(id => id !== currentUserId) || null;

      let recipientName = 'User';
      if (recipientId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', recipientId));
          if (userDoc.exists()) recipientName = userDoc.data().name || 'User';
        } catch (e) { console.warn("Could not fetch recipient name", e); }
      }

      const lastReadTime = chat.lastRead?.[currentUserId]?.toMillis?.() || 0;
      const lastUpdatedTime = chat.lastUpdated?.toMillis?.() || 0;

      const isUnread = chat.lastUpdated &&
        lastReadTime < lastUpdatedTime &&
        chat.lastSenderId !== currentUserId;
      
      return `
        <a href="chat.html?chatId=${encodeURIComponent(chatId)}&recipientId=${encodeURIComponent(recipientId)}" class="conversation-item ${isUnread ? 'unread' : ''}">
          <div style="flex:1">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="font-bold">${recipientName}</span>
                ${isUnread ? '<span class="unread-dot"></span>' : ''}
            </div>
            <p class="last-message">${chat.lastSenderId === currentUserId ? 'You: ' : ''}${chat.lastMessage || 'No messages yet'}</p>
          </div>
        </a>
      `;
    }));

    conversationList.innerHTML = chatItemsHtml.join('');
  }, err => {
    console.error('Conversation listener failed:', err);
    conversationList.innerHTML = '<p class="text-center text-error-color p-8">Could not load conversations.</p>';
  });
}