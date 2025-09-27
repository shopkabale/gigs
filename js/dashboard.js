import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getCloudinaryTransformedUrl } from './utils.js';

const dashboardContainer = document.getElementById('dashboard-container');
const editModal = document.getElementById('edit-service-modal');
const editForm = document.getElementById('edit-service-form');
let currentUser = null;

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

    dashboardContainer.innerHTML = `
        <div class="dashboard-grid">
            <div class="space-y-8">
                <div class="dashboard-card">
                    <h2>Add a New Service</h2>
                    <form id="add-service-form">
                        <div class="form-group"><label for="service-title">Title</label><input type="text" id="service-title" required></div>
                        <div class="form-group"><label for="service-price">Price (UGX)</label><input type="number" id="service-price" placeholder="e.g., 50000" required></div>
                        <div class="form-group"><label for="service-desc">Description</label><textarea id="service-desc" required></textarea></div>
                        <div class="form-group"><label for="service-image-file">Service Image</label><input type="file" id="service-image-file" accept="image/*" required></div>
                        <button type="submit" class="btn btn-primary">Add Service</button>
                    </form>
                </div>
                <div class="dashboard-card">
                    <h2>My Services</h2>
                    <div id="user-services-list">${servicesHtml}</div>
                </div>
            </div>
            <div class="space-y-8">
                <div class="dashboard-card">
                    <h2>My Profile</h2>
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <img src="${getCloudinaryTransformedUrl(userData.profilePhotoUrl, 'profile')}" alt="Your profile" class="profile-photo-square">
                    </div>
                    <form id="update-profile-form">
                        <div class="form-group"><label for="profile-name">Full Name</label><input type="text" id="profile-name" value="${userData.name}" required></div>
                        <div class="form-group"><label for="profile-bio">Your Bio</label><textarea id="profile-bio" placeholder="A short bio...">${userData.bio || ''}</textarea></div>
                        <div class="form-group"><label for="profile-photo-file">Update Profile Photo</label><input type="file" id="profile-photo-file" accept="image/*"></div>
                        <button type="submit" class="btn btn-secondary w-full">Update Profile</button>
                    </form>
                </div>
                <div class="dashboard-card">
                    <h2>Account</h2>
                    <div class="account-card-item"><span>Current Plan:</span><span class="plan">${userData.plan}</span></div>
                    <a href="upgrade.html" class="btn btn-secondary" style="margin-bottom: 1rem; width: 100%; border-color: var(--accent-color); color: var(--accent-color);">Upgrade Plan</a>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            </div>
        </div>
    `;
    attachEventListeners(userData.name);
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
    } catch (error) { console.error("Error loading dashboard:", error); }
}

function attachEventListeners(currentUserName) {
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
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
                description: document.getElementById('service-desc').value,
                imageUrl, providerId: currentUser.uid, providerName: currentUserName,
                createdAt: serverTimestamp(), isFeatured: false
            });
            e.target.reset(); loadDashboard();
        } catch(error) { alert(error.message); } 
        finally { submitButton.disabled = false; submitButton.classList.remove('loading'); }
    });

    // --- NEW "UPDATE PROFILE" EVENT LISTENER ---
    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button');
        submitButton.disabled = true; submitButton.classList.add('loading');
        
        try {
            const name = document.getElementById('profile-name').value;
            const bio = document.getElementById('profile-bio').value;
            const profilePhotoFile = document.getElementById('profile-photo-file').files[0];
            
            const dataToUpdate = { name, bio };

            if (profilePhotoFile) {
                const photoURL = await uploadImageToCloudinary(profilePhotoFile);
                dataToUpdate.profilePhotoUrl = photoURL;
            }
            
            await updateDoc(doc(db, "users", currentUser.uid), dataToUpdate);
            alert("Profile updated successfully!");
            loadDashboard(); // Refresh to show changes
        } catch (error) {
            console.error("Profile update error:", error);
            alert("Could not update profile.");
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
    });
    
    const serviceList = document.getElementById('user-services-list');
    if (serviceList) {
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
                    document.getElementById('edit-service-desc').value = data.description;
                    editModal.classList.add('active');
                }
            }
        });
    }
    document.getElementById('cancel-edit-btn').addEventListener('click', () => editModal.classList.remove('active'));
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceId = document.getElementById('edit-service-id').value;
        const submitButton = document.getElementById('update-service-btn');
        submitButton.disabled = true; submitButton.classList.add('loading');
        try {
            const dataToUpdate = {
                title: document.getElementById('edit-service-title').value,
                price: Number(document.getElementById('edit-service-price').value),
                description: document.getElementById('edit-service-desc').value,
            };
            const imageFile = document.getElementById('edit-service-image').files[0];
            if (imageFile) {
                dataToUpdate.imageUrl = await uploadImageToCloudinary(imageFile);
            }
            await updateDoc(doc(db, "services", serviceId), dataToUpdate);
            editModal.classList.remove('active');
            loadDashboard();
        } catch (error) { alert("Failed to update service."); } 
        finally { submitButton.disabled = false; submitButton.classList.remove('loading'); }
    });
}