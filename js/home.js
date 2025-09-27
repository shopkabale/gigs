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

        const services = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        services.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        let servicesHtml = services.map(service => `
            <a href="service.html?id=${service.id}" class="featured-service-card">
                <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" alt="${service.title}" class="featured-card-image">
                <div class="featured-card-content">
                    <h3>${service.title}</h3>
                    <p class="text-light">By ${service.providerName}</p>
                    <p class="card-price">UGX ${service.price.toLocaleString()}</p>
                </div>
            </a>
        `).join('');
        featuredServicesContainer.innerHTML = servicesHtml;
    } catch (error) {
        console.error("Error loading featured services:", error);
        featuredServicesContainer.innerHTML = '<p style="text-align: center; color: red;">Could not load featured services.</p>';
    }
}
document.addEventListener('DOMContentLoaded', loadFeaturedServices);