import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const chatRecipientName = document.getElementById('chat-recipient-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const reviewModalBtn = document.getElementById('review-modal-btn');
const reviewModal = document.getElementById('review-modal');
const cancelReviewBtn = document.getElementById('cancel-review-btn');
const reviewForm = document.getElementById('review-form');
const reviewRecipientName = document.getElementById('review-recipient-name');
const starRatingContainer = document.getElementById('star-rating');
const stars = document.querySelectorAll('.star');

let currentUser = null;
let chatId = null;
let recipientId = null;
let selectedRating = 0;
let unsubscribeMessages = null;

const urlParams = new URLSearchParams(window.location.search);
const chatIdParam = urlParams.get('chatId');
const recipientParam = urlParams.get('recipientId');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/login.html'; 
    return;
  }
  currentUser = user;

  if (!recipientParam) {
    chatRecipientName.textContent = 'Error';
    chatMessages.innerHTML = `<p class="text-center text-error-color p-8">Missing recipient ID in URL.</p>`;
    return;
  }
  recipientId = recipientParam;
  chatId = chatIdParam ? chatIdParam : [currentUser.uid, recipientId].sort().join('_');

  try {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { users: [currentUser.uid, recipientId] }, { merge: true });

    const userDoc = await getDoc(doc(db, 'users', recipientId));
    const recipientNameStr = userDoc.exists() ? userDoc.data().name || 'User' : 'User';
    chatRecipientName.textContent = recipientNameStr;
    reviewRecipientName.textContent = recipientNameStr;

    setupMessageListener();
    markChatAsRead();
    setupReviewModal();
    setupAutoGrowTextarea();

  } catch (err) {
    console.error('Chat initialization error:', err);
    chatMessages.innerHTML = `<p class="text-center text-error-color p-8">Could not initialize chat.</p>`;
  }
});

function setupMessageListener() {
  if (unsubscribeMessages) unsubscribeMessages();
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  unsubscribeMessages = onSnapshot(q, (snap) => {
    chatMessages.innerHTML = '';
    snap.forEach(docSnap => {
      const m = docSnap.data();
      const div = document.createElement('div');
      div.classList.add('message', m.senderId === currentUser.uid ? 'sent' : 'received');
      div.textContent = m.text || '';
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    markChatAsRead();
  });
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;
    
    messageInput.disabled = true;
    chatForm.querySelector('button').disabled = true;

    try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: text,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid,
            [`lastRead.${currentUser.uid}`]: serverTimestamp()
        });
        messageInput.value = '';
        messageInput.style.height = 'auto';
    } catch (err) {
        console.error('Send message error:', err);
    } finally {
        messageInput.disabled = false;
        chatForm.querySelector('button').disabled = false;
        messageInput.focus();
    }
}

chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

function setupAutoGrowTextarea() {
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    });
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function markChatAsRead() {
  if (!currentUser || !chatId) return;
  try {
    await updateDoc(doc(db, 'chats', chatId), { [`lastRead.${currentUser.uid}`]: serverTimestamp() });
  } catch (err) { /* Not fatal */ }
}

function setupReviewModal() {
  checkIfAlreadyReviewed();
  reviewModalBtn.addEventListener('click', () => { reviewModal.classList.add('active'); });
  cancelReviewBtn.addEventListener('click', () => { reviewModal.classList.remove('active'); });
  reviewModal.addEventListener('click', (e) => { if (e.target === reviewModal) reviewModal.classList.remove('active'); });
  starRatingContainer?.addEventListener('click', (e) => {
    if (e.target.classList.contains('star')) {
      selectedRating = parseInt(e.target.dataset.value, 10);
      stars.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.value, 10) <= selectedRating));
    }
  });

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reviewText = document.getElementById('review-text').value.trim();
    const messageEl = document.getElementById('review-form-message');
    if (selectedRating === 0) {
      messageEl.textContent = 'Please select a rating.'; messageEl.style.color = 'var(--error-color)'; return;
    }
    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
    try {
      await runTransaction(db, async (tx) => {
        const reviewRef = doc(db, "users", recipientId, "reviews", currentUser.uid);
        tx.set(reviewRef, {
            rating: selectedRating,
            text: reviewText,
            reviewerId: currentUser.uid,
            reviewerName: auth.currentUser.displayName || 'Anonymous',
            timestamp: serverTimestamp()
        });
      });
      messageEl.textContent = 'Review submitted successfully!'; messageEl.style.color = 'var(--success-color)';
      setTimeout(() => { reviewModal.classList.remove('active'); checkIfAlreadyReviewed(); }, 1500);
    } catch (err) {
      console.error('Review submission error:', err);
      messageEl.textContent = 'Could not submit review.'; messageEl.style.color = 'var(--error-color)';
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Review';
    }
  });
}

async function checkIfAlreadyReviewed() {
  if (!currentUser || !recipientId) return;
  try {
    const reviewRef = doc(db, 'users', recipientId, 'reviews', currentUser.uid);
    const reviewSnap = await getDoc(reviewRef);
    if (reviewSnap.exists()) {
      reviewModalBtn.disabled = true;
      reviewModalBtn.textContent = 'You Have Already Reviewed';
    } else {
      reviewModalBtn.disabled = false;
      reviewModalBtn.textContent = 'Leave a Review';
    }
  } catch (err) { /* Ignore */ }
}