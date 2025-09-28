import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
            loadAdminDashboard();
        } else {
            adminContent.innerHTML = '<p>Access Denied. You must be an administrator to view this page.</p>';
        }
    } else {
        adminContent.innerHTML = '<p>Please <a href="login.html">log in</a> as an administrator to view this page.</p>';
    }
});

async function loadAdminDashboard() {
    try {
        const [servicesSnapshot, usersSnapshot] = await Promise.all([
            getDocs(collection(db, "services")),
            getDocs(collection(db, "users"))
        ]);
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminDashboard(services, users);
    } catch (error) {
        console.error("Error loading admin data:", error);
        adminContent.innerHTML = '<p style="color: red;">Could not load admin data.</p>';
    }
}

function renderAdminDashboard(services, users) {
    const servicesHtml = services.map(service => `
         <tr style="border-bottom: 1px solid var(--border-color);">
            <td>${service.title || 'No Title'}</td>
            <td>${service.providerName || 'Unknown'}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" class="feature-toggle" data-id="${service.id}" ${service.isFeatured ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
        </tr>
    `).join('');

    const usersHtml = users.map(user => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td>${user.name || 'No Name'}</td>
            <td>${user.email || 'No Email'}</td>
            <td>
                <select class="user-plan-select" data-id="${user.id}">
                    <option value="spark" ${user.plan === 'spark' ? 'selected' : ''}>Spark</option>
                    <option value="pro" ${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </td>
        </tr>
    `).join('');

    adminContent.innerHTML = `
        <div class="admin-grid">
            <div class="admin-card">
                <h2>Manage Services (${services.length})</h2>
                 <table class="admin-table">
                    <thead><tr><th>Title</th><th>Provider</th><th>Featured</th></tr></thead>
                    <tbody>${servicesHtml}</tbody>
                </table>
            </div>
            <div class="admin-card">
                <h2>Manage Users (${users.length})</h2>
                 <table class="admin-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Plan</th></tr></thead>
                    <tbody>${usersHtml}</tbody>
                </table>
            </div>
        </div>
    `;
    attachAdminListeners();
}

function attachAdminListeners() {
    document.querySelectorAll('.feature-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const serviceId = e.target.dataset.id;
            const isFeatured = e.target.checked;
            await updateDoc(doc(db, "services", serviceId), { isFeatured: isFeatured });
        });
    });

    document.querySelectorAll('.user-plan-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.dataset.id;
            const newPlan = e.target.value;
            await updateDoc(doc(db, "users", userId), { plan: newPlan });
        });
    });
}
