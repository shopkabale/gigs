import { db } from './firebase-config.js';
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');
async function loadFeaturedServices() {
    try {
        const q = query(collection(db, 'services'), where('isFeatured', '==', true), limit(6));
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
                        <p class="card-price" style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color); margin-top: 1rem;">UGX ${service.price.toLocaleString()}</p>
                    </div>
                </a>
            `;
        }).join('');
        featuredServicesContainer.innerHTML = servicesHtml;
    } catch (error) { console.error(error); }
}
document.addEventListener('DOMContentLoaded', loadFeaturedServices);