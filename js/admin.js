import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            // --- THIS IS THE UPDATED LINE ---
            // It now checks for role === 'admin' instead of isAdmin === true
            if (userSnap.exists() && userSnap.data().role === 'admin') {
                loadAdminDashboard();
            } else {
                renderAccessDenied();
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            renderAccessDenied();
        }
    } else {
        renderAccessDenied();
    }
});

function renderAccessDenied() {
    adminContent.innerHTML = '<p class="text-center text-error-color">Access Denied. You must be an administrator to view this page.</p>';
}

function renderAdminDashboard(users, services) {
    const usersHtml = users.map(user => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.5rem;">${user.name}</td>
            <td style="padding: 0.5rem;">${user.email}</td>
            <td style="padding: 0.5rem;">
                <select class="p-1 border rounded user-plan-select" data-id="${user.id}">
                    <option value="spark" ${user.plan === 'spark' ? 'selected' : ''}>Spark</option>
                    <option value="pro" ${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </td>
        </tr>
    `).join('');

    const servicesHtml = services.map(service => `
         <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.5rem;">${service.title}</td>
            <td style="padding: 0.5rem;">${service.providerName}</td>
            <td style="padding: 0.5rem;">
                <button class="font-bold text-error-color hover:underline delete-service-btn" data-id="${service.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    adminContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 2rem;" class="md:grid-cols-2">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="font-bold text-xl mb-4">Manage Users</h2>
                <table style="width: 100%; text-align: left;">
                    <thead><tr style="border-bottom: 1px solid var(--border-color);"><th style="padding: 0.5rem;">Name</th><th style="padding: 0.5rem;">Email</th><th style="padding: 0.5rem;">Plan</th></tr></thead>
                    <tbody>${usersHtml}</tbody>
                </table>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="font-bold text-xl mb-4">Manage Services</h2>
                 <table style="width: 100%; text-align: left;">
                    <thead><tr style="border-bottom: 1px solid var(--border-color);"><th style="padding: 0.5rem;">Title</th><th style="padding: 0.5rem;">Provider</th><th style="padding: 0.5rem;">Action</th></tr></thead>
                    <tbody>${servicesHtml}</tbody>
                </table>
            </div>
        </div>
    `;
    attachAdminListeners();
}

async function loadAdminDashboard() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const servicesSnapshot = await getDocs(collection(db, "services"));
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderAdminDashboard(users, services);
    } catch (error) {
        console.error("Error loading admin data:", error);
        adminContent.innerHTML = `<p class="text-center text-error-color">Could not load admin data.</p>`;
    }
}

function attachAdminListeners() {
    document.querySelectorAll('.user-plan-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.dataset.id;
            const newPlan = e.target.value;
            try {
                await updateDoc(doc(db, "users", userId), { plan: newPlan });
                alert(`User plan updated to ${newPlan}`);
            } catch (error) {
                console.error("Error updating plan:", error);
                alert("Failed to update plan.");
            }
        });
    });

    document.querySelectorAll('.delete-service-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const serviceId = e.target.dataset.id;
            if (confirm("Are you sure you want to permanently delete this service?")) {
                try {
                    await deleteDoc(doc(db, "services", serviceId));
                    loadAdminDashboard(); // Refresh
                } catch (error) {
                    console.error("Error deleting service:", error);
                    alert("Failed to delete service.");
                }
            }
        });
    });
}