import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const servicesGrid = document.getElementById('services-grid');
async function loadAllServices() {
    try {
        const servicesQuery = query(collection(db, "services"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(servicesQuery);
        if (querySnapshot.empty) {
            servicesGrid.innerHTML = '<p style="text-align: center;">No services posted yet.</p>';
            return;
        }
        const servicesHtml = querySnapshot.docs.map(doc => {
            const service = { id: doc.id, ...doc.data() };
            return `
                <a href="service.html?id=${service.id}" class="service-card">
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'thumbnail')}" alt="${service.title}" class="card-image">
                    <div class="card-content">
                        <h3>${service.title}</h3>
                        <p class="text-light">${service.providerName}</p>
                        <p class="card-price">UGX ${service.price.toLocaleString()}</p>
                    </div>
                </a>
            `;
        }).join('');
        servicesGrid.innerHTML = servicesHtml;
    } catch (error) { console.error(error); }
}
document.addEventListener('DOMContentLoaded', loadAllServices);