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
            adminContent.innerHTML = '<p>Access Denied.</p>';
        }
    } else {
        adminContent.innerHTML = '<p>Access Denied.</p>';
    }
});

async function loadAdminDashboard() {
    try {
        const servicesSnapshot = await getDocs(collection(db, "services"));
        const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminDashboard(services);
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

function renderAdminDashboard(services) {
    const servicesHtml = services.map(service => `
         <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem;">${service.title}</td>
            <td style="padding: 0.75rem;">${service.providerName}</td>
            <td style="padding: 0.75rem;">
                <label class="toggle-switch">
                    <input type="checkbox" class="feature-toggle" data-id="${service.id}" ${service.isFeatured ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </td>
        </tr>
    `).join('');

    adminContent.innerHTML = `
        <div style="background-color: white; padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow);">
            <h2>Manage Services</h2>
            <div style="overflow-x: auto;">
                 <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 0.75rem;">Title</th>
                            <th style="padding: 0.75rem;">Provider</th>
                            <th style="padding: 0.75rem;">Featured</th>
                        </tr>
                    </thead>
                    <tbody>${servicesHtml}</tbody>
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
            try {
                const serviceRef = doc(db, "services", serviceId);
                await updateDoc(serviceRef, { isFeatured: isFeatured });
            } catch (error) {
                console.error("Error updating feature status:", error);
                alert("Could not update feature status.");
            }
        });
    });
}