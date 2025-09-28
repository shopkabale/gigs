import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const dashboardContainer = document.getElementById('dashboard-container');
const addServiceModal = document.getElementById('add-service-modal');
const editServiceModal = document.getElementById('edit-service-modal');
const editServiceForm = document.getElementById('edit-service-form');
let currentUser = null;

async function uploadImageToCloudinary(file) {
    const CLOUD_NAME = "dodtknwvv";
    const UPLOAD_PRESET = "to9fos62";
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const response = await fetch(url, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed.');
    const data = await response.json();
    return data.secure_url;
}

onAuthStateChanged(auth, user => {
    if (user) { currentUser = user; loadDashboard(); } 
    else { window.location.href = 'login.html'; }
});

function renderDashboard(userData, userServices) {
    const sortedServices = userServices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    const servicesHtml = sortedServices.length > 0 ? sortedServices.map(service => `
        <div class="service-list-item">
            <img src="${getCloudinaryTransformedUrl(service.imageUrl, 'thumbnail')}" alt="${service.title}">
            <div class="service-list-item-info"><p>${service.title}</p></div>
            <div class="service-list-item-actions">
                <button class="action-btn edit" data-id="${service.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn delete" data-id="${service.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('') : '<p class="text-light">You have not listed any services yet.</p>';

    const canAddService = userData.plan !== 'spark' || userServices.length < 1;

    dashboardContainer.innerHTML = `
        <div class="dashboard-hero">
            <h1>Welcome, ${userData.name.split(' ')[0]}!</h1>
            <p>This is your personal dashboard. Manage your services, update your profile, and see your account status.</p>
            <button id="show-add-service-modal-btn" class="btn btn-primary" style="width: auto; background: var(--accent-color); color: var(--text-dark);" ${!canAddService ? 'disabled' : ''}>
                ${canAddService ? 'Upload a New Service' : 'Upgrade to Add More'}
            </button>
        </div>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h2>My Services</h2>
                <div id="user-services-list">${servicesHtml}</div>
            </div>
            <div class="space-y-8">
                <div class="dashboard-card" id="profile-card">
                    <!-- Profile content will be injected here -->
                </div>
                <div class="dashboard-card">
                    <h2>Account</h2>
                    <p class="text-light" style="margin-bottom: 1.5rem;">Manage your subscription plan and account settings.</p>
                    <div class="account-card-item"><span>Current Plan:</span><span class="plan">${userData.plan}</span></div>
                    <a href="upgrade.html" class="btn btn-secondary" style="margin-bottom: 1rem; width: 100%; border-color: var(--accent-color); color: var(--accent-color);">Upgrade Plan</a>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            </div>
        </div>
    `;
    renderProfileCard(userData);
    attachEventListeners(userData);
}

function renderProfileCard(userData, isEditing = false) {
    const profileCard = document.getElementById('profile-card');
    if (!profileCard) return;
    let content = isEditing ? `
        <h2>Edit Profile</h2>
        <form id="update-profile-form">
            <div class="form-group"><label for="profile-name">Full Name</label><input type="text" id="profile-name" value="${userData.name}" required></div>
            <div class="form-group"><label for="profile-bio">Your Bio</label><textarea id="profile-bio" placeholder="A short bio...">${userData.bio || ''}</textarea></div>
            <div class="form-group"><label for="profile-photo-file">Update Profile Photo</label><input type="file" id="profile-photo-file" accept="image/*"></div>
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Save Profile</button>
                <button type="button" id="cancel-profile-edit-btn" class="btn btn-secondary">Cancel</button>
            </div>
        </form>
    ` : `
        <h2>My Profile</h2>
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <img src="${getCloudinaryTransformedUrl(userData.profilePhotoUrl, 'profile')}" alt="Your profile" class="profile-photo-square">
        </div>
        <h3 style="margin: 0; text-align: center;">${userData.name}</h3>
        <p class="text-light" style="text-align: center;">${userData.email}</p>
        <p style="margin-top: 1rem; text-align: center;">${userData.bio || 'You have not set a bio yet.'}</p>
        <button id="edit-profile-btn" class="btn btn-secondary" style="margin-top: 1.5rem;">Edit Profile</button>
    `;
    profileCard.innerHTML = content;
    attachProfileEventListeners(userData);
}

async function loadDashboard() {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("User data not found!");
        let userData = userSnap.data();
        if (!userData.plan) { await updateDoc(userRef, { plan: 'spark' }); userData.plan = 'spark'; }
        const servicesQuery = query(collection(db, "services"), where("providerId", "==", currentUser.uid));
        const servicesSnapshot = await getDocs(servicesQuery);
        const userServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDashboard(userData, userServices);
    } catch (error) { 
        console.error("Error loading dashboard:", error);
        dashboardContainer.innerHTML = '<p class="text-center" style="color: red; padding: 2rem;">Could not load your dashboard. Please try again.</p>';
    }
}

function attachProfileEventListeners(userData) {
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) editBtn.addEventListener('click', () => renderProfileCard(userData, true));
    
    const cancelBtn = document.getElementById('cancel-profile-edit-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => renderProfileCard(userData, false));

    const updateForm = document.getElementById('update-profile-form');
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.classList.add('loading');
            try {
                const dataToUpdate = { name: document.getElementById('profile-name').value, bio: document.getElementById('profile-bio').value };
                const photoFile = document.getElementById('profile-photo-file').files[0];
                if (photoFile) dataToUpdate.profilePhotoUrl = await uploadImageToCloudinary(photoFile);
                await updateDoc(doc(db, "users", currentUser.uid), dataToUpdate);
                loadDashboard();
            } catch (error) {
                alert("Could not update profile.");
                submitButton.disabled = false; submitButton.classList.remove('loading');
            }
        });
    }
}

function attachEventListeners(userData) {
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    
    document.getElementById('show-add-service-modal-btn').addEventListener('click', () => {
        if (userData.plan === 'spark' && document.querySelectorAll('.service-list-item').length >= 1) {
            alert("Free plan users can only list one service. Please upgrade for more.");
            return;
        }
        addServiceModal.classList.add('active');
    });

    document.getElementById('cancel-add-btn').addEventListener('click', () => addServiceModal.classList.remove('active'));
    
    document.getElementById('add-service-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button');
        submitButton.disabled = true; submitButton.classList.add('loading');
        try {
            const imageFile = document.getElementById('service-image-file').files[0];
            if (!imageFile) throw new Error("Please select an image.");
            const imageUrl = await uploadImageToCloudinary(imageFile);
            await addDoc(collection(db, "services"), {
                title: document.getElementById('service-title').value,
                price: Number(document.getElementById('service-price').value),
                whatsapp: document.getElementById('service-whatsapp').value,
                description: document.getElementById('service-desc').value,
                imageUrl, 
                providerId: currentUser.uid, 
                providerName: userData.name,
                createdAt: serverTimestamp(), 
                isFeatured: false
            });
            e.target.reset(); 
            addServiceModal.classList.remove('active'); 
            loadDashboard();
        } catch(error) { 
            alert(error.message); 
        } finally { 
            submitButton.disabled = false; 
            submitButton.classList.remove('loading'); 
        }
    });
    
    const serviceList = document.getElementById('user-services-list');
    if(serviceList) {
        serviceList.addEventListener('click', async (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;
            const serviceId = button.dataset.id;
            if (button.classList.contains('delete')) {
                if (confirm("Are you sure?")) { await deleteDoc(doc(db, "services", serviceId)); loadDashboard(); }
            } else if (button.classList.contains('edit')) {
                const serviceSnap = await getDoc(doc(db, "services", serviceId));
                if (serviceSnap.exists()) {
                    const data = serviceSnap.data();
                    document.getElementById('edit-service-id').value = serviceId;
                    document.getElementById('edit-service-title').value = data.title;
                    document.getElementById('edit-service-price').value = data.price;
                    document.getElementById('edit-service-whatsapp').value = data.whatsapp || '';
                    document.getElementById('edit-service-desc').value = data.description;
                    editServiceModal.classList.add('active');
                }
            }
        });
    }
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => editServiceModal.classList.remove('active'));
    
    editServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceId = document.getElementById('edit-service-id').value;
        const submitButton = document.getElementById('update-service-btn');
        submitButton.disabled = true; submitButton.classList.add('loading');
        try {
            const dataToUpdate = {
                title: document.getElementById('edit-service-title').value,
                price: Number(document.getElementById('edit-service-price').value),
                whatsapp: document.getElementById('edit-service-whatsapp').value,
                description: document.getElementById('edit-service-desc').value,
            };
            const imageFile = document.getElementById('edit-service-image').files[0];
            if (imageFile) {
                dataToUpdate.imageUrl = await uploadImageToCloudinary(imageFile);
            }
            await updateDoc(doc(db, "services", serviceId), dataToUpdate);
            editServiceModal.classList.remove('active');
            loadDashboard();
        } catch (error) { 
            alert("Failed to update service."); 
        } finally { 
            submitButton.disabled = false; 
            submitButton.classList.remove('loading'); 
        }
    });
}
