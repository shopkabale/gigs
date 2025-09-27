import { db } from './firebase-config.js';
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

async function loadFeaturedServices() {
    try {
        const servicesRef = collection(db, 'services');
        const q = query(servicesRef, where('isFeatured', '==', true), limit(6));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No featured services available right now.</p>';
            return;
        }

        let servicesHtml = '';
        querySnapshot.forEach(doc => {
            const service = { id: doc.id, ...doc.data() };
            servicesHtml += `
                <a href="service.html?id=${service.id}" class="featured-service-card">
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" alt="${service.title}" class="featured-card-image">
                    <div class="featured-card-content">
                        <h3>${service.title}</h3>
                        <p class="text-light">By ${service.providerName}</p>
                        <p class="card-price">UGX ${service.price.toLocaleString()}</p>
                    </div>
                </a>
            `;
        });
        featuredServicesContainer.innerHTML = servicesHtml;
    } catch (error) {
        console.error("Error loading featured services:", error);
        featuredServicesContainer.innerHTML = '<p style="text-align: center; color: var(--error-color);">Could not load featured services.</p>';
    }
}
document.addEventListener('DOMContentLoaded', loadFeaturedServices);