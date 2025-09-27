import { db } from './firebase-config.js';
import { collection, query, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const featuredServicesContainer = document.getElementById('featured-services');

async function loadFeaturedServices() {
    try {
        const servicesRef = collection(db, 'services');
        const q = query(servicesRef, orderBy('createdAt', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1;">No services available right now. Be the first to offer one!</p>';
            return;
        }

        let servicesHtml = '';
        let delay = 0.8; // Start animation after the hero section
        querySnapshot.forEach(doc => {
            const service = doc.data();
            const serviceId = doc.id;
            servicesHtml += `
                <a href="service.html?id=${serviceId}" class="service-card animate-on-load" style="animation-delay: ${delay}s">
                    <img src="${service.imageUrl || 'https://placehold.co/400x300/e0e0e0/777?text=Service'}" alt="${service.title}" class="card-image">
                    <div class="card-content">
                        <h3 class="card-title">${service.title}</h3>
                        <p class="card-provider">By ${service.providerName}</p>
                        <div class="card-footer">
                           <span>View Details <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>
                </a>
            `;
            delay += 0.2; // Stagger the next card's animation
        });
        featuredServicesContainer.innerHTML = servicesHtml;

    } catch (error) {
        console.error("Error loading featured services:", error);
        featuredServicesContainer.innerHTML = '<p class="text-center text-error-color" style="grid-column: 1 / -1;">Could not load services at this time.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFeaturedServices);