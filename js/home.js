import { db } from './firebase-config.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

async function loadFeaturedServices() {
    try {
        const servicesRef = collection(db, 'services');
        const querySnapshot = await getDocs(query(servicesRef));

        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No services available right now.</p>';
            return;
        }

        const allServices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const featuredServices = allServices
            .filter(service => service.isFeatured === true)
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 6);

        if (featuredServices.length === 0) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No featured services available right now.</p>';
            return;
        }

        let servicesHtml = featuredServices.map(service => {
            // --- THIS IS THE FIX: Check if price exists before displaying it ---
            const priceHtml = service.price ? `<p class="card-price">UGX ${service.price.toLocaleString()}</p>` : `<p class="card-price">Contact for Quote</p>`;
            
            return `
                <a href="service.html?id=${service.id}" class="featured-service-card">
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" alt="${service.title}" class="featured-card-image">
                    <div class="featured-card-content">
                        <h3>${service.title || 'No Title'}</h3>
                        <p class="text-light">By ${service.providerName || 'Unknown'}</p>
                        ${priceHtml}
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
