import { db } from './firebase-config.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const featuredServicesContainer = document.getElementById('featured-services');

// Predefined background colors and text styles
const FEATURED_BG_COLORS = ['#007bff','#28a745','#ffc107','#17a2b8','#6f42c1','#fd7e14'];
const FEATURED_TEXT_COLORS = ['#fff','#fff','#000','#fff','#fff','#000'];
const FEATURED_FONT_STYLES = ['normal','italic','normal','italic','normal','italic'];

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

            const priceHtml = service.price ? `<p class="card-price">UGX ${service.price.toLocaleString()}</p>` : `<p class="card-price">Contact for Quote</p>`;

            return `
                <a href="service.html?id=${service.id}" class="featured-service-card" 
                   style="background-color: ${bgColor}; color: ${textColor}; font-style: ${fontStyle}; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; text-decoration:none; transition: transform 0.3s, box-shadow 0.3s;">
                    <div style="width:100%; padding-top:60%; background-image: url('${getCloudinaryTransformedUrl(service.imageUrl, 'full')}'); background-size:cover; background-position:center;"></div>
                    <div style="padding:1.5rem; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
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