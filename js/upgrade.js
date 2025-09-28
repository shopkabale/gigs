import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const pricingPlansContainer = document.getElementById('pricing-plans');

// This is the static data for our plans.
const plansData = [
    {
        name: 'Spark',
        price: 'Free',
        priceDetails: '',
        features: [
            'List up to 1 service',
            '1 photo per service',
            'Standard search placement'
        ]
    },
    {
        name: 'Pro',
        price: 'UGX 15,000',
        priceDetails: '/month',
        features: [
            'List up to 10 services',
            'Up to 5 photos per service',
            'Higher search placement',
            'Profile portfolio link'
        ]
    },
    {
        name: 'Premium',
        price: 'UGX 40,000',
        priceDetails: '/month',
        features: [
            'Unlimited service listings',
            'Up to 10 photos per service',
            'Top placement & "Featured" tag',
            'Verified Badge on profile',
            'Advanced analytics'
        ]
    }
];

// This function dynamically builds the HTML for the plans
function renderPlans(currentUserPlan) {
    pricingPlansContainer.innerHTML = plansData.map(plan => {
        const planNameLower = plan.name.toLowerCase();
        const isCurrent = planNameLower === currentUserPlan;

        const buttonHtml = isCurrent
            ? `<button class="btn btn-secondary" disabled>Your Current Plan</button>`
            : `<button onclick="handleUpgradeClick('${plan.name}')" class="btn btn-primary">Upgrade to ${plan.name}</button>`;

        return `
            <div class="pricing-card ${isCurrent ? 'current' : ''}">
                <h3>${plan.name}</h3>
                <p class="price">${plan.price}<span>${plan.priceDetails}</span></p>
                <ul>
                    ${plan.features.map(feature => `<li><i class="fas fa-check-circle"></i>${feature}</li>`).join('')}
                </ul>
                ${buttonHtml}
            </div>
        `;
    }).join('');
}

// Attach the upgrade function to the window so the buttons can call it
window.handleUpgradeClick = function(planName) {
    alert(`To upgrade to the ${planName} plan, please contact us on WhatsApp for manual activation. (This is a demo feature).`);
}

// Main logic to check user's plan
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                const currentUserPlan = userData.plan || 'spark'; // Default to 'spark' if not set
                renderPlans(currentUserPlan);
            } else {
                // If user exists in Auth but not Firestore, default to spark
                renderPlans('spark');
            }
        } catch (error) {
            console.error("Error fetching user plan:", error);
            pricingPlansContainer.innerHTML = '<p style="color: red; text-align: center;">Could not load your plan details.</p>';
        }
    } else {
        // If user is not logged in, show a message
        pricingPlansContainer.innerHTML = `<p style="text-align: center; padding: 2rem;" class="text-light">Please <a href="login.html" style="font-weight: bold;">log in</a> to see your upgrade options.</p>`;
    }
});