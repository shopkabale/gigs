import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

const serviceDetailContainer = document.getElementById('service-detail-container');
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('id');
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (serviceDetailContainer.innerHTML && !serviceDetailContainer.querySelector('.loading-spinner')) {
        loadServiceDetails();
    }
});

async function loadServiceDetails() {
    if (!serviceId) {
        serviceDetailContainer.innerHTML = '<p class="text-center text-error-color">No service ID provided.</p>';
        return;
    }
    try {
        const serviceSnap = await getDoc(doc(db, "services", serviceId));
        if (!serviceSnap.exists()) {
            serviceDetailContainer.innerHTML = '<p class="text-center text-error-color">Service not found.</p>';
            return;
        }
        const service = serviceSnap.data();
        const providerSnap = await getDoc(doc(db, "users", service.providerId));
        const provider = providerSnap.exists() ? providerSnap.data() : { name: 'Unknown User' };
        
        const reviewsQuery = query(collection(db, "users", service.providerId, "reviews"), orderBy("timestamp", "desc"));
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsHtml = reviewsSnap.empty ? '<p class="text-muted">No reviews yet for this provider.</p>' : reviewsSnap.docs.map(reviewDoc => {
            const review = reviewDoc.data();
            return `<div class="bg-gray p-4 rounded-lg">
                        <p class="font-bold">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</p>
                        <p class="italic">"${review.text}"</p>
                        <p class="text-sm text-muted text-right">- ${review.reviewerName || 'Anonymous'}</p>
                    </div>`;
        }).join('');
        
        const isOwner = currentUser && currentUser.uid === service.providerId;
        serviceDetailContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;" class="md:grid-cols-3">
                <div class="md:col-span-2">
                    <img src="${service.imageUrl || 'https://placehold.co/800x600/e0e0e0/777?text=Service'}" alt="${service.title}" class="header-image fade-in">
                    <h1 class="font-bold text-3xl mb-4 slide-up">${service.title}</h1>
                    <p class="text-lg slide-up" style="animation-delay: 0.1s;">${service.description.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="md:col-span-1 space-y-6">
                    <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.2s;">
                        <h2 class="font-bold text-xl mb-4">Service Provider</h2>
                        <a href="profile.html?id=${service.providerId}" class="flex items-center gap-4 mb-4">
                            <img src="${provider.profilePhotoUrl || 'https://placehold.co/64x64/e0e0e0/777?text=User'}" class="w-16 h-16 rounded-full">
                            <div><p class="font-bold text-primary-color">${provider.name}</p><p class="text-sm text-muted">View Profile</p></div>
                        </a>
                        ${!isOwner && currentUser ? `<a href="chat.html?recipientId=${service.providerId}" class="btn btn-primary w-full">Contact Provider</a>` : ''}
                        ${!currentUser ? `<a href="login.html" class="btn btn-secondary w-full">Login to Contact</a>` : ''}
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.3s;">
                        <h2 class="font-bold text-xl mb-4">Reviews</h2>
                        <div class="space-y-4">${reviewsHtml}</div>
                    </div>
                </div>
            </div>`;
    } catch (error) { console.error("Error:", error); serviceDetailContainer.innerHTML = '<p class="text-center text-error-color">Could not load details.</p>'; }
}
document.addEventListener('DOMContentLoaded', loadServiceDetails);