import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const dashboardContainer = document.getElementById('dashboard-container');
const addServiceModal = document.getElementById('add-service-modal');
const editServiceModal = document.getElementById('edit-service-modal');
let currentUser = null;
let currentUserData = null;

async function uploadImageToCloudinary(file) {
    const CLOUD_NAME = "YOUR_NEW_CLOUD_NAME";
    const UPLOAD_PRESET = "YOUR_NEW_UNSIGNED_PRESET_NAME";
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
    if (user) { 
        currentUser = user; 
        loadDashboard(); 
    } else { 
        window.location.href = 'login.html'; 
    }
});

function renderDashboard(userData, userServices) {
    currentUserData = userData;
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

    // --- THIS IS THE FINAL FIX: The button is now smart ---
    const heroButtonHtml = canAddService
        ? `<button id="show-add-service-modal-btn" class="btn btn-primary" style="width: auto; background: var(--accent-color); color: var(--text-dark);">Upload a New Service</button>`
        : `<a href="upgrade.html" class="btn btn-primary" style="width: auto; background: var(--accent-color); color: var(--text-dark); text-decoration: none;">Upgrade to Add More</a>`;

    dashboardContainer.innerHTML = `
        <div class="dashboard-hero">
            <h1>Welcome, ${userData.name.split(' ')[0]}!</h1>
            <p>This is your personal dashboard. Manage your services and update your profile.</p>
            ${heroButtonHtml}
        </div>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h2>My Services</h2>
                <div id="user-services-list">${servicesHtml}</div>
            </div>
            <div class="space-y-8">
                <div class="dashboard-card" id="profile-card"></div>
                <div class="dashboard-card">
                    <h2>Account</h2>
                    <div class="account-card-item"><span>Current Plan:</span><span class="plan">${userData.plan}</span></div>
                    <a href="upgrade.html" class="btn btn-secondary" style="margin-bottom: 1rem; width: 100%; border-color: var(--accent-color); color: var(--accent-color);">Upgrade Plan</a>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            </div>
        </div>
    `;
    renderProfileCard(userData);
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
        <p class="text-light" style="text-align: center; margin-bottom: 1.5rem;">${userData.email}</p>
        <p style="text-align: center;">${userData.bio || 'You have not set a bio yet.'}</p>
        <button id="edit-profile-btn" class="btn btn-secondary" style="margin-top: 1.5rem;">Edit Profile</button>
    `;
    profileCard.innerHTML = content;
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

// Event delegation for the whole document to handle all clicks
document.addEventListener('click', async (e) => {
    if (e.target.id === 'logout-btn') signOut(auth);
    if (e.target.id === 'show-add-service-modal-btn') addServiceModal.classList.add('active');
    if (e.target.id === 'cancel-add-btn') addServiceModal.classList.remove('active');
    if (e.target.id === 'cancel-edit-btn') editServiceModal.classList.remove('active');
    if (e.target.id === 'edit-profile-btn') renderProfileCard(currentUserData, true);
    if (e.target.id === 'cancel-profile-edit-btn') renderProfileCard(currentUserData, false);

    const actionButton = e.target.closest('.action-btn');
    if (actionButton) {
        const serviceId = actionButton.dataset.id;
        if (actionButton.classList.contains('delete')) {
            if (confirm("Are you sure?")) { await deleteDoc(doc(db, "services", serviceId)); loadDashboard(); }
        } else if (actionButton.classList.contains('edit')) {
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
    }
});

// Event delegation for form submissions
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'add-service-form') {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
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
                imageUrl, providerId: currentUser.uid, providerName: currentUserData.name,
                createdAt: serverTimestamp(), isFeatured: false
            });
            e.target.reset(); addServiceModal.classList.remove('active'); loadDashboard();
        } catch(error) { alert(error.message); } 
        finally { submitButton.disabled = false; submitButton.classList.remove('loading'); }
    }
    
    if (e.target.id === 'edit-service-form') {
        e.preventDefault();
        const serviceId = document.getElementById('edit-service-id').value;
        const submitButton = e.target.querySelector('#update-service-btn');
        submitButton.disabled = true; submitButton.classList.add('loading');
        try {
            const dataToUpdate = {
                title: document.getElementById('edit-service-title').value,
                price: Number(document.getElementById('edit-service-price').value),
                whatsapp: document.getElementById('edit-service-whatsapp').value,
                description: document.getElementById('edit-service-desc').value,
            };
            const imageFile = document.getElementById('edit-service-image').files[0];
            if (imageFile) dataToUpdate.imageUrl = await uploadImageToCloudinary(imageFile);
            await updateDoc(doc(db, "services", serviceId), dataToUpdate);
            editServiceModal.classList.remove('active'); loadDashboard();
        } catch (error) { alert("Failed to update service."); } 
        finally { submitButton.disabled = false; submitButton.classList.remove('loading'); }
    }

    if (e.target.id === 'update-profile-form') {
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
    }
});