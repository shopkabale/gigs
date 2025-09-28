import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const serviceDetailContent = document.getElementById('service-detail-content');
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
        if (!serviceSnap.exists()) { throw new Error("Service not found"); }
        const serviceData = serviceSnap.data();
        const sellerRef = doc(db, 'users', serviceData.providerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};
        renderServiceDetails(serviceData, sellerData);
    } catch (error) {
        serviceDetailContent.innerHTML = `<h1>${error.message}</h1>`;
    }
}

function renderServiceDetails(service, seller) {
    const whatsappLink = `https://wa.me/${seller.whatsapp}?text=Hello, I'm interested in your service for '${service.title}' on Kabale Online.`;
    const optimizedImage = getCloudinaryTransformedUrl(service.imageUrl, 'full');
    
    // --- THIS IS THE FINAL FIX ---
    // It checks if 'service.price' exists and is a number before trying to format it.
    // If not, it shows a default message instead of crashing.
    const priceHtml = (typeof service.price === 'number')
        ? `<h2 style="font-size: 1.8rem; color: var(--primary-color);">UGX ${service.price.toLocaleString()}</h2>`
        : `<h2 style="font-size: 1.8rem; color: var(--primary-color);">Contact for Quote</h2>`;

    serviceDetailContent.innerHTML = `
        <div class="service-detail-container">
            <div class="service-images">
                <img src="${optimizedImage}" alt="${service.title || 'Service Image'}">
            </div>
            <div class="service-info">
                <h1>${service.title || 'No Title'}</h1>
                ${priceHtml}
                <p style="white-space: pre-wrap; margin-top: 1.5rem;">${service.description || 'No description provided.'}</p>
                <div class="seller-card">
                    <h4>About the Provider</h4>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${getCloudinaryTransformedUrl(seller.profilePhotoUrl, 'profile')}" alt="${seller.name}" class="profile-photo">
                        <div><strong>${seller.name || 'Provider'}</strong></div>
                    </div>
                    <div class="contact-buttons" style="display: flex; flex-direction: column; gap: 10px;">
                        ${currentUser && currentUser.uid !== service.providerId ? `<a href="chat.html?recipientId=${service.providerId}" class="cta-button message-btn">Message Provider</a>` : ''}
                        ${!currentUser ? `<a href="login.html" class="cta-button message-btn">Login to Message</a>` : ''}
                        ${seller.whatsapp ? `<a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn">Contact via WhatsApp</a>` : ''}
                        <a href="profile.html?id=${service.providerId}" class="cta-button profile-btn">View Public Profile</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}
