import { db } from './firebase-config.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

// Predefined background colors and text styles
const FEATURED_BG_COLORS = [
  '#fde2e4', // soft pink
  '#cdeffd', // sky blue
  '#d4f8e8', // mint green
  '#fff5ba', // light yellow
  '#e0c3fc', // lavender
  '#ffc6ff'  // soft rose
];

const FEATURED_TEXT_COLORS = ['#333', '#333', '#333', '#333', '#333', '#333'];

const FEATURED_FONT_STYLES = [
  'normal', 'italic', 'normal', 'italic', 'normal', 'italic'
];

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

        let servicesHtml = featuredServices.map((service, index) => {
            const bgColor = FEATURED_BG_COLORS[index % FEATURED_BG_COLORS.length];
            const textColor = FEATURED_TEXT_COLORS[index % FEATURED_TEXT_COLORS.length];
            const fontStyle = FEATURED_FONT_STYLES[index % FEATURED_FONT_STYLES.length];

            const priceHtml = service.price 
                ? `<p class="card-price">UGX ${service.price.toLocaleString()}</p>` 
                : `<p class="card-price">Contact for Quote</p>`;

            return `
                <a href="service.html?id=${service.id}" class="featured-service-card" 
                   style="text-decoration:none; transition: transform 0.3s, box-shadow 0.3s;">
                   
                    <!-- FULL IMAGE -->
                    <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'full')}" 
                         alt="${service.title || 'Service'}" 
                         style="width:100%; height:auto; display:block; border-radius: 12px 12px 0 0; object-fit:cover;">

                    <!-- TEXT CONTENT -->
                    <div style="background-color: ${bgColor}; color: ${textColor}; font-style: ${fontStyle}; padding: 1.5rem; border-radius: 0 0 12px 12px; display:flex; flex-direction:column; justify-content:space-between;">
                        <h3 style="margin:0 0 0.5rem 0;">${service.title || 'No Title'}</h3>
                        <p style="margin:0 0 0.5rem 0;">By ${service.providerName || 'Unknown'}</p>
                        ${priceHtml}
                        <span style="margin-top:1rem; display:inline-block; font-weight:bold; text-decoration:underline;">View Service</span>
                    </div>
                </a>
            `;
        }).join('');

        featuredServicesContainer.innerHTML = servicesHtml;

        // Hover effect
        document.querySelectorAll('.featured-service-card').forEach(card => {
            card.addEventListener('mouseover', () => {
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
            });
            card.addEventListener('mouseout', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
        });

    } catch (error) {
        console.error("Error loading featured services:", error);
        featuredServicesContainer.innerHTML = '<p style="text-align: center; color: red;">Could not load featured services.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFeaturedServices);