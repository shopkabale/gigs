const pricingPlansContainer = document.getElementById('pricing-plans');

const plans = [
    {
        name: 'Spark',
        price: 'Free',
        features: [
            'List up to 2 services',
            '1 photo per service',
            'Standard search placement'
        ],
        cta: 'Your Current Plan',
        isCurrent: true,
    },
    {
        name: 'Pro',
        price: 'UGX 15,000<span style="font-size: 1rem; font-weight: 500;">/month</span>',
        features: [
            'List up to 10 services',
            'Up to 5 photos per service',
            'Higher search placement',
            'Profile portfolio link'
        ],
        cta: 'Upgrade to Pro',
    },
    {
        name: 'Premium',
        price: 'UGX 40,000<span style="font-size: 1rem; font-weight: 500;">/month</span>',
        features: [
            'Unlimited service listings',
            'Up to 10 photos per service',
            'Top placement & "Featured" tag',
            'Verified Badge on profile',
            'Advanced analytics'
        ],
        cta: 'Upgrade to Premium',
    }
];

function renderPlans() {
    pricingPlansContainer.innerHTML = plans.map((plan, index) => `
        <div class="bg-white p-8 rounded-lg shadow-md slide-up" style="animation-delay: ${index * 0.1}s;">
            <h3 class="font-bold text-2xl mb-2">${plan.name}</h3>
            <p class="text-4xl font-extrabold mb-6">${plan.price}</p>
            <ul class="space-y-3 mb-8">
                ${plan.features.map(feature => `<li style="display: flex; align-items: center; gap: 0.75rem;"><i class="fas fa-check-circle" style="color: var(--success-color);"></i><span>${feature}</span></li>`).join('')}
            </ul>
            <button onclick="handleUpgradeClick('${plan.name}')" class="btn ${plan.isCurrent ? 'btn-secondary' : 'btn-primary'} w-full" ${plan.isCurrent ? 'disabled' : ''}>
                ${plan.cta}
            </button>
        </div>
    `).join('');
}

// In a real app, this would trigger a payment flow. For now, it shows an alert.
window.handleUpgradeClick = function(planName) {
    alert(`To upgrade to the ${planName} plan, please contact us on WhatsApp for manual activation. (This is will take a few minutes ).`);
}

document.addEventListener('DOMContentLoaded', renderPlans);