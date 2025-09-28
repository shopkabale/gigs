import { db } from './firebase-config.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

async function loadFeaturedServices() {
    try {
        // --- THIS IS THE FIX: A simple query that will not fail ---
        // 1. Fetch ALL services without any complex sorting or filtering.
        const servicesRef = collection(db, 'services');
        const querySnapshot = await getDocs(query(servicesRef));

        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No services available right now.</p>';
            return;
        }

        const allServices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Filter for "featured" and sort by date IN THE BROWSER.
        // This avoids the need for a special database index.
        const featuredServices = allServices
            .filter(service => service.isFeatured === true)
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 6); // Limit to a maximum of 6 featured services

        if (featuredServices.length === 0) {
            featuredServicesContainer.innerHTML = '<p style="text-align: center;">No featured services available right now.</p>';
            return;
        }

        let servicesHtml = featuredServices.map(service => `
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
