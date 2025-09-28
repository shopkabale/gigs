import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const inboxContent = document.getElementById('inbox-content');

onAuthStateChanged(auth, user => {
  if (user) {
    loadConversations(user.uid);
  } else {
    inboxContent.innerHTML = `<div style="text-align: center; padding: 2rem;"><h2>Access Denied</h2><p>Please <a href="login.html" style="font-weight: bold;">log in</a> to view your inbox.</p></div>`;
  }
});

function loadConversations(currentUserId) {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('users', 'array-contains', currentUserId));

  onSnapshot(q, async (snapshot) => {
    try {
        if (snapshot.empty) {
            inboxContent.innerHTML = '<p style="text-align: center; padding: 2rem;" class="text-light">You have no conversations yet.</p>';
            return;
        }

        const chatPromises = snapshot.docs.map(async (chatDoc) => {
            const chatData = chatDoc.data();
            const recipientId = (chatData.users || []).find(id => id !== currentUserId);

            // If there's no recipient (e.g., a corrupted chat), skip it.
            if (!recipientId) {
                return null;
            }

            let recipientName = "Unknown User";
            let profilePhotoUrl = null;
            try {
                const userDoc = await getDoc(doc(db, 'users', recipientId));
                if (userDoc.exists()) {
                    recipientName = userDoc.data().name || "Unknown User";
                    profilePhotoUrl = userDoc.data().profilePhotoUrl;
                }
            } catch (userError) {
                console.warn(`Could not fetch user data for ${recipientId}:`, userError);
            }
            
            const lastMessage = chatData.lastMessage || 'No messages yet...';
            const lastSenderIsYou = chatData.lastSenderId === currentUserId;

            return {
                id: chatDoc.id,
                recipientId,
                recipientName,
                profilePhotoUrl,
                lastMessage: lastSenderIsYou ? `You: ${lastMessage}` : lastMessage,
                lastUpdated: chatData.lastUpdated?.toMillis() || 0
            };
        });

        const chats = (await Promise.all(chatPromises)).filter(chat => chat !== null);
        chats.sort((a, b) => b.lastUpdated - a.lastUpdated);

        const inboxHtml = chats.map(chat => `
            <a href="chat.html?chatId=${chat.id}&recipientId=${chat.recipientId}" class="service-list-item" style="text-decoration: none; color: inherit;">
                <img src="${chat.profilePhotoUrl || 'https://placehold.co/150x150/e9ecef/34495e?text=?'}" alt="${chat.recipientName}" style="border-radius: 50%;">
                <div class="service-list-item-info">
                    <p style="font-weight: bold;">${chat.recipientName}</p>
                    <p class="text-light" style="font-weight: normal;">${chat.lastMessage}</p>
                </div>
            </a>
        `).join('');

        inboxContent.innerHTML = inboxHtml;

    } catch (error) {
        console.error("Critical error in loadConversations:", error);
        inboxContent.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Could not load conversations due to an error.</p>';
    }
  }, (error) => {
      console.error("Firestore snapshot error:", error);
      inboxContent.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Failed to connect to the inbox service.</p>';
  });
}