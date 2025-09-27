import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const servicesGrid = document.getElementById('services-grid');
const searchBar = document.getElementById('search-bar');
let allServices = [];

function renderServices(servicesToRender) {
    if (servicesToRender.length === 0) {
        servicesGrid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1;">No services match your search.</p>';
        return;
    }

    let servicesHtml = '';
    servicesToRender.forEach((service, index) => {
        servicesHtml += `
            <a href="service.html?id=${service.id}" class="service-card fade-in" style="animation-delay: ${index * 0.05}s">
                <img src="${service.imageUrl || 'https://placehold.co/400x300/e0e0e0/777?text=Service'}" alt="${service.title}" class="card-image">
                <div class="card-content">
                    <h3 class="card-title">${service.title}</h3>
                    <p class="card-provider">By ${service.providerName}</p>
                    <div class="card-footer">
                        <span class="font-bold text-primary-color">View Details</span>
                    </div>
                </div>
            </a>
        `;
    });
    servicesGrid.innerHTML = servicesHtml;
}

async function loadAllServices() {
    try {
        const servicesQuery = query(collection(db, "services"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(servicesQuery);
        allServices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderServices(allServices);
    } catch (error) {
        console.error("Error loading services:", error);
        servicesGrid.innerHTML = '<p class="text-center text-error-color" style="grid-column: 1 / -1;">Could not load services.</p>';
    }
}

searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredServices = allServices.filter(service => 
        service.title.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.providerName.toLowerCase().includes(searchTerm)
    );
    renderServices(filteredServices);
});

document.addEventListener('DOMContentLoaded', loadAllServices);