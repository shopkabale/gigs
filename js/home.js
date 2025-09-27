import { db } from './firebase-config.js';
import { collection, query, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

async function loadFeaturedServices() {
    try {
        const servicesRef = collection(db, 'services');
        const q = query(servicesRef, orderBy('createdAt', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredServicesContainer.innerHTML = '<p class="text-center text-light">No services available yet.</p>';
            return;
        }

        let servicesHtml = '';
        let delay = 0.6;
        querySnapshot.forEach(doc => {
            const service = doc.data();
            const serviceId = doc.id;
            servicesHtml += `
                <a href="service.html?id=${serviceId}" class="service-card animate-on-load" style="animation-delay: ${delay}s">
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'thumbnail')}" alt="${service.title}" class="card-image">
                    <div class="card-content">
                        <h3 class="card-title">${service.title}</h3>
                        <p class="card-provider text-light">By ${service.providerName}</p>
                    </div>
                </a>
            `;
            delay += 0.2;
        });
        featuredServicesContainer.innerHTML = servicesHtml;

    } catch (error) {
        console.error("Error loading services:", error);
        featuredServicesContainer.innerHTML = '<p class="text-center text-light">Could not load services.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFeaturedServices);