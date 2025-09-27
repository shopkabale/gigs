import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const serviceDetailContent = document.getElementById('service-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');
let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('id');

if (!serviceId) {
    serviceDetailContent.innerHTML = '<h1>Service Not Found</h1>';
} else {
    onAuthStateChanged(auth, user => {
        currentUser = user;
        loadServiceAndProvider();
    });
}

async function loadServiceAndProvider() {
    try {
        const serviceRef = doc(db, 'services', serviceId);
        const serviceSnap = await getDoc(serviceRef);

        if (!serviceSnap.exists()) {
            serviceDetailContent.innerHTML = '<h1>Service Not Found</h1>';
            return;
        }

        const serviceData = serviceSnap.data();
        const sellerRef = doc(db, 'users', serviceData.providerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};

        renderServiceDetails(serviceData, sellerData);
        loadQandA(serviceData.providerId);

    } catch (error) {
        console.error("Error loading service:", error);
    }
}

function renderServiceDetails(service, seller) {
    const whatsappLink = `https://wa.me/${seller.whatsapp}?text=Hello, I'm interested in your service for '${service.title}' on Kabale Online.`;
    const optimizedImage = getCloudinaryTransformedUrl(service.imageUrl, 'full');
    
    serviceDetailContent.innerHTML = `
        <div class="service-detail-container">
            <div class="service-images">
                <img src="${optimizedImage}" alt="${service.title}" class="animate-on-load">
            </div>
            <div class="service-info">
                <div class="service-title-header animate-on-load" style="animation-delay: 0.2s;">
                    <h1 id="service-title">${service.title}</h1>
                    <button id="share-btn" title="Share"><i class="fa-solid fa-share-alt"></i></button>
                </div>
                <h2 id="service-price" class="animate-on-load" style="animation-delay: 0.3s;">Contact for Quote</h2>
                <p id="service-description" class="animate-on-load" style="animation-delay: 0.4s;">${service.description.replace(/\n/g, '<br>')}</p>
                <div class="seller-card animate-on-load" style="animation-delay: 0.5s;">
                    <h4>About the Provider</h4>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${getCloudinaryTransformedUrl(seller.profilePhotoUrl, 'profile')}" alt="${seller.name}" class="profile-photo">
                        <div>
                            <strong>${seller.name || 'Provider'}</strong>
                            ${(seller.role === 'admin' || seller.plan === 'premium') ? '<div class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified</div>' : ''}
                        </div>
                    </div>
                    <div class="contact-buttons">
                        ${currentUser && currentUser.uid !== service.providerId ? `<a href="chat.html?recipientId=${service.providerId}" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Provider</a>` : ''}
                        ${!currentUser ? `<a href="login.html" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Login to Message</a>` : ''}
                        ${seller.whatsapp ? `<a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>` : ''}
                        <a href="profile.html?id=${service.providerId}" class="cta-button profile-btn">View Public Profile</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    setupShareButton(service, seller);
}

function setupShareButton(service, seller) {
    const shareBtn = document.getElementById('share-btn');
    shareBtn.addEventListener('click', async () => {
        const shareText = `*SERVICE ON KABALE ONLINE*\n\n*Provider:* ${seller.name}\n*Service:* ${service.title}\n\n*Link:* ${window.location.href}`;
        try {
            await navigator.share({ title: `Service: ${service.title}`, text: shareText, url: window.location.href });
        } catch (err) {
            await navigator.clipboard.writeText(shareText);
            alert('Service details copied to clipboard!');
        }
    });
}

function loadQandA(providerId) {
    const qandaRef = collection(db, 'services', serviceId, 'qanda');
    const q = query(qandaRef, orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        qaList.innerHTML = snapshot.empty ? '<p>No questions have been asked yet.</p>' : '';
        snapshot.forEach(docSnap => {
            const qa = docSnap.data();
            const div = document.createElement('div');
            div.className = 'question-item';
            div.innerHTML = `<p><strong>Q: ${qa.question}</strong></p>${qa.answer ? `<div class="answer-item"><p><strong>A:</strong> ${qa.answer}</p></div>` : ''}`;
            qaList.appendChild(div);
        });
    });

    if (currentUser) {
        qaFormContainer.innerHTML = `
            <h4>Ask a Question</h4>
            <form id="qa-form" class="qa-form">
                <textarea id="question-input" placeholder="Type your question here..." required></textarea>
                <button type="submit" class="cta-button message-btn">Submit Question</button>
                <p id="qa-form-message" style="margin-top: 10px; color: green;"></p>
            </form>`;
        document.getElementById('qa-form').addEventListener('submit', (e) => submitQuestion(e, providerId));
    } else {
        qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="login.html" style="font-weight: bold;">login</a> to ask a question.</p>`;
    }
}

async function submitQuestion(e, providerId) {
    e.preventDefault();
    const form = e.target;
    const questionInput = form.querySelector('#question-input');
    const messageEl = form.querySelector('#qa-form-message');
    const questionText = questionInput.value.trim();
    if (!questionText) return;

    try {
        await addDoc(collection(db, 'services', serviceId, 'qanda'), {
            question: questionText,
            answer: null,
            askerId: currentUser.uid,
            providerId: providerId,
            timestamp: serverTimestamp()
        });
        questionInput.value = '';
        messageEl.textContent = 'Your question has been submitted!';
        setTimeout(() => messageEl.textContent = '', 3000);
    } catch (err) {
        messageEl.textContent = 'Failed to submit question.';
        messageEl.style.color = 'red';
    }
}