import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const chatContent = document.getElementById('chat-content');
let currentUser = null;
let unsubscribeMessages = null; // To prevent duplicate listeners
const urlParams = new URLSearchParams(window.location.search);
let chatId = urlParams.get('chatId'); // May be null for new chats
const recipientId = urlParams.get('recipientId');

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        initializeChat();
    } else {
        window.location.href = 'login.html';
    }
});

async function initializeChat() {
    if (!recipientId) {
        chatContent.innerHTML = '<h1>Error</h1><p>Recipient not found. The link may be broken.</p>';
        return;
    }

    // --- THIS IS THE CRITICAL FIX ---
    // If no chatId is provided in the URL, we create a consistent one.
    // By sorting the two user IDs, the ID will always be the same regardless of who starts the chat.
    if (!chatId) {
        chatId = [currentUser.uid, recipientId].sort().join('_');
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', recipientId));
        const recipientName = userDoc.exists() ? userDoc.data().name : "User";
        
        renderChatShell(recipientName);
        
        // Ensure the chat document exists before trying to read messages from it.
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, { users: [currentUser.uid, recipientId] }, { merge: true });

        setupMessageListener();

    } catch (error) {
        console.error("Error initializing chat:", error);
        chatContent.innerHTML = '<h1>Error</h1><p>Could not load chat. Please try again.</p>';
    }
}

function renderChatShell(recipientName) {
    chatContent.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <a href="inbox.html"><i class="fas fa-arrow-left"></i></a>
                <h2>${recipientName}</h2>
            </div>
            <div id="chat-messages" class="chat-messages">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
            <form id="chat-form" class="chat-form">
                <textarea id="message-input" placeholder="Type a message..." required rows="1"></textarea>
                <button type="submit" class="btn btn-primary">Send</button>
            </form>
        </div>
    `;
    document.getElementById('chat-form').addEventListener('submit', sendMessage);
}

function setupMessageListener() {
    if (unsubscribeMessages) unsubscribeMessages(); // Stop previous listener
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 1rem;">No messages yet. Say hello!</p>';
        } else {
            messagesContainer.innerHTML = '';
            snapshot.forEach(docSnap => {
                const messageData = docSnap.data();
                const div = document.createElement('div');
                div.classList.add('message', messageData.senderId === currentUser.uid ? 'sent' : 'received');
                div.textContent = messageData.text || '';
                messagesContainer.appendChild(div);
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

async function sendMessage(e) {
    e.preventDefault();
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.disabled = true;
    e.target.querySelector('button').disabled = true;

    try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: text,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid
        });
        messageInput.value = '';
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Could not send message.");
    } finally {
        messageInput.disabled = false;
        e.target.querySelector('button').disabled = false;
        messageInput.focus();
    }
}