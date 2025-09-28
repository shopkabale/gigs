import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const serviceDetailContent = document.getElementById('service-detail-content');
let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('id');

// Function to set up the share button functionality
function setupShareButton(service, seller) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return; // Exit if the button doesn't exist

    shareBtn.addEventListener('click', async () => {
        const shareText = `*SERVICE ON KABALE ONLINE*\n\n*Provider:* ${seller.name || 'A provider'}\n*Service:* ${service.title || 'Check this out'}\n\n*View here:* ${window.location.href}`;
        
        // Use the modern Navigator Share API if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Service: ${service.title}`,
                    text: shareText,
                    url: window.location.href
                });
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
            // Fallback for browsers that don't support it (like desktop)
            try {
                await navigator.clipboard.writeText(shareText);
                alert('Service details copied to clipboard!');
            } catch (err) {
                alert('Could not copy link. Please copy it manually from the address bar.');
            }
        }
    });
}


function renderServiceDetails(service, seller) {
    // --- DEFENSIVE CODING: Check for WhatsApp number ---
    const whatsappLink = (seller.whatsapp) 
        ? `https://wa.me/${seller.whatsapp.replace(/\D/g, '')}?text=Hello, I'm interested in your service for '${service.title}' on Kabale Online.`
        : null;

    // --- DEFENSIVE CODING: Check if price exists and format it ---
    const priceHtml = (typeof service.price === 'number')
        ? `<h2 style="font-size: 1.8rem; color: var(--primary-color);">UGX ${service.price.toLocaleString()}</h2>`
        : `<h2 style="font-size: 1.8rem; color: var(--primary-color);">Contact for Quote</h2>`;

    serviceDetailContent.innerHTML = `
        <div class="service-detail-container">
            <div class="service-images">
                <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" alt="${service.title || 'Service Image'}">
            </div>
            <div class="service-info">
                <div class="service-title-header">
                    <h1 id="service-title">${service.title || 'No Title Provided'}</h1>
                    <!-- The Share Button is now correctly placed here -->
                    <button id="share-btn" title="Share"><i class="fa-solid fa-share-alt"></i></button>
                </div>
                
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
                        
                        <!-- The WhatsApp button will only appear if the link was created -->
                        ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn">Contact via WhatsApp</a>` : ''}
                        
                        <a href="profile.html?id=${service.providerId}" class="cta-button profile-btn">View Public Profile</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- IMPORTANT: Call the function to make the button work ---
    setupShareButton(service, seller);
}

async function loadServiceAndProvider() {
    if (!serviceId) {
        serviceDetailContent.innerHTML = '<h1>Service Not Found</h1><p>The link you followed may be broken.</p>';
        return;
    }

    try {
        const serviceRef = doc(db, 'services', serviceId);
        const serviceSnap = await getDoc(serviceRef);
        if (!serviceSnap.exists()) {
            throw new Error("This service could not be found.");
        }
        
        const serviceData = serviceSnap.data();
        
        // Ensure providerId exists before fetching the seller
        if (!serviceData.providerId) {
            throw new Error("This service has no provider information.");
        }
        
        const sellerRef = doc(db, 'users', serviceData.providerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};
        
        renderServiceDetails(serviceData, sellerData);
    } catch (error) {
        console.error("Fatal Error:", error);
        serviceDetailContent.innerHTML = `<h1 style="color: red;">Error</h1><p>${error.message}</p>`;
    }
}

// Start the process when the user's login state is known
onAuthStateChanged(auth, user => {
    currentUser = user;
    loadServiceAndProvider();
});
