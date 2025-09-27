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
        if (!serviceSnap.exists()) {
            serviceDetailContent.innerHTML = '<h1>Service Not Found</h1>';
            return;
        }
        const serviceData = serviceSnap.data();
        const sellerRef = doc(db, 'users', serviceData.providerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};
        renderServiceDetails(serviceData, sellerData);
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
                <img src="${optimizedImage}" alt="${service.title}">
            </div>
            <div class="service-info">
                <h1>${service.title}</h1>
                <p style="white-space: pre-wrap;">${service.description}</p>
                <div class="seller-card">
                    <h4>About the Provider</h4>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${getCloudinaryTransformedUrl(seller.profilePhotoUrl, 'profile')}" alt="${seller.name}" class="profile-photo">
                        <div>
                            <strong>${seller.name || 'Provider'}</strong>
                        </div>
                    </div>
                    <div class="contact-buttons">
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