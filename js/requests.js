import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const requestForm = document.getElementById('request-service-form');
const requestsList = document.getElementById('requests-list');
const messageEl = document.getElementById('request-form-message');
let currentUser = null;

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (!user) {
        requestForm.innerHTML = '<p style="text-align: center;">You must be <a href="login.html" style="font-weight: bold;">logged in</a> to post a request.</p>';
    }
});

async function loadRequests() {
    try {
        const q = query(collection(db, "serviceRequests"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            requestsList.innerHTML = '<p class="text-light" style="text-align: center; padding: 2rem;">Be the first to request a service!</p>';
            return;
        }

        const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        requests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        requestsList.innerHTML = requests.map(req => {
            const date = req.createdAt ? new Date(req.createdAt.toMillis()).toLocaleDateString() : 'Just now';
            return `
                <div class="service-list-item" style="display: block; padding: 1.5rem;">
                    <p style="font-weight: bold; font-size: 1.2rem; margin: 0 0 0.5rem;">${req.title}</p>
                    <p style="margin: 0 0 1rem; white-space: pre-wrap;">${req.description}</p>
                    <p class="text-light" style="font-size: 0.9rem;">Posted by ${req.requesterName} on ${date}</p>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading requests:", error);
        requestsList.innerHTML = '<p style="color: red; text-align: center;">Could not load service requests.</p>';
    }
}

requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('request-title').value;
    const description = document.getElementById('request-description').value;
    const submitButton = e.target.querySelector('button');

    submitButton.disabled = true;
    submitButton.classList.add('loading');

    try {
        await addDoc(collection(db, "serviceRequests"), {
            title,
            description,
            requesterId: currentUser.uid,
            requesterName: auth.currentUser.displayName || 'Anonymous',
            createdAt: serverTimestamp()
        });
        messageEl.textContent = 'Your request has been posted!';
        messageEl.style.color = 'green';
        requestForm.reset();
        loadRequests(); // Refresh the list
    } catch (error) {
        console.error("Error submitting request:", error);
        messageEl.textContent = 'Failed to submit request.';
        messageEl.style.color = 'red';
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        setTimeout(() => messageEl.textContent = '', 4000);
    }
});

document.addEventListener('DOMContentLoaded', loadRequests);