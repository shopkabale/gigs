import { db } from './firebase-config.js';
import { collection, query, where, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');
async function loadFeaturedServices() {
    try {
        const servicesRef = collection(db, 'services');
        // This query now requires the index you created.
        const q = query(servicesRef, where('isFeatured', '==', true), orderBy('createdAt', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No featured services available.</p>';
            return;
        }
        let servicesHtml = querySnapshot.docs.map(doc => {
            const service = { id: doc.id, ...doc.data() };
            return `
                <a href="service.html?id=${service.id}" class="featured-service-card">
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" alt="${service.title}" class="featured-card-image">
                    <div class="featured-card-content">
                        <h3>${service.title}</h3>
                        <p class="text-light">By ${service.providerName}</p>
                        <p class="card-price">UGX ${service.price.toLocaleString()}</p>
                    </div>
                </a>
            `;
        }).join('');
        featuredServicesContainer.innerHTML = servicesHtml;
    } catch (error) {
        console.error("Error loading featured services:", error);
        featuredServicesContainer.innerHTML = '<p style="text-align: center; color: red;">Could not load featured services.</p>';
    }
}
document.addEventListener('DOMContentLoaded', loadFeaturedServices);
