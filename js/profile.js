import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

const profileContainer = document.getElementById('profile-container');
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (profileContainer.innerHTML && !profileContainer.querySelector('.loading-spinner')) {
        loadUserProfile();
    }
});

async function loadUserProfile() {
    if (!userId) { profileContainer.innerHTML = '<p class="text-center text-error-color">No user ID provided.</p>'; return; }
    try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) { profileContainer.innerHTML = '<p class="text-center text-error-color">User profile not found.</p>'; return; }
        const user = userSnap.data();

        const servicesQuery = query(collection(db, "services"), where("providerId", "==", userId));
        const servicesSnapshot = await getDocs(servicesQuery);
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const reviewsQuery = query(collection(db, "users", userId, "reviews"), orderBy("timestamp", "desc"));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());

        renderProfile(user, services, reviews);
    } catch (error) { console.error("Error:", error); profileContainer.innerHTML = '<p class="text-center text-error-color">Could not load profile.</p>'; }
}

function renderProfile(user, services, reviews) {
    const reviewsHtml = reviews.length > 0 ? reviews.map(review => `
        <div class="bg-gray p-4 rounded-lg slide-up">
            <p class="font-bold">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p>
            <p class="italic text-muted">"${review.text}"</p>
            <p class="text-sm text-muted text-right">- ${review.reviewerName || 'Anonymous'}</p>
        </div>`).join('') : '<p class="text-muted">This provider has not received any reviews yet.</p>';

    const servicesHtml = services.length > 0 ? `<div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;" class="md:grid-cols-2">` + services.map(service => `
        <a href="service.html?id=${service.id}" class="service-card slide-up">
            <img src="${service.imageUrl || 'https://placehold.co/400x300/e0e0e0/777?text=Service'}" alt="${service.title}" class="card-image">
            <div class="card-content"><h3 class="card-title">${service.title}</h3><div class="card-footer"><span class="font-bold text-primary-color">View Details</span></div></div>
        </a>`).join('') + `</div>` : '<p class="text-muted">This provider has not listed any services yet.</p>';
    
    const isOwnProfile = currentUser && currentUser.uid === userId;
    profileContainer.innerHTML = `
        <section class="text-center mb-12 fade-in">
            <img src="${user.profilePhotoUrl || 'https://placehold.co/128x128/e0e0e0/777?text=User'}" alt="${user.name}" class="header-image" style="max-width: 128px; border-radius: 50%; margin: 0 auto 1rem;">
            <h1 class="font-bold text-3xl">${user.name}</h1>
            <p class="text-muted">${user.bio || 'This user has not set a bio yet.'}</p>
            <div class="mt-4 flex justify-center gap-4">
                ${!isOwnProfile && currentUser ? `<a href="chat.html?recipientId=${userId}" class="btn btn-primary">Message</a>` : ''}
                ${!currentUser ? `<a href="login.html" class="btn btn-secondary">Login to Message</a>` : ''}
                ${isOwnProfile ? `<a href="dashboard.html" class="btn btn-secondary">Edit My Profile</a>` : ''}
            </div>
        </section>
        <section class="mb-12"><h2 class="font-bold text-2xl mb-6 text-center">Services Offered</h2>${servicesHtml}</section>
        <section><h2 class="font-bold text-2xl mb-6 text-center">Reviews</h2><div style="max-width: 700px;" class="mx-auto space-y-4">${reviewsHtml}</div></section>
    `;
}
document.addEventListener('DOMContentLoaded', loadUserProfile);