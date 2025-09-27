import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const dashboardContainer = document.getElementById('dashboard-container');
let currentUser = null;
let userPlan = 'spark';

// --- UPLOAD FUNCTION FOR GITHUB PAGES (UNSIGNED) ---
async function uploadImageToCloudinary(file) {
    // --- PASTE YOUR NEW CLOUDINARY DETAILS HERE ---
    const CLOUD_NAME = "dodtknwvv"; // From your new Cloudinary account
    const UPLOAD_PRESET = "to9fos62"; // The new preset name
    // ---------------------------------------------

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Cloudinary upload failed.');
    }

    const data = await response.json();
    return data.secure_url;
}


onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadDashboard();
    } else {
        window.location.href = 'login.html';
    }
});

function renderDashboard(userData, userServices) {
    userPlan = userData.plan || 'spark';
    let servicesHtml = '<p class="text-muted">You have not listed any services yet.</p>';
    if (userServices.length > 0) {
        const sortedServices = userServices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        servicesHtml = sortedServices.map(service => `
            <div class="bg-gray p-4 rounded-lg flex justify-between items-center">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${service.title}</span>
                <button class="font-bold text-error-color hover:underline delete-service-btn" data-id="${service.id}">Delete</button>
            </div>
        `).join('');
    }

    dashboardContainer.innerHTML = `
        <div class="text-center mb-8 fade-in">
            <h1 class="font-bold text-3xl">Welcome, ${userData.name.split(' ')[0]}!</h1>
        </div>
        <div class="responsive-grid">
            <div class="space-y-8">
                <div class="bg-white p-6 rounded-lg shadow-md slide-up">
                    <h2 class="font-bold text-xl mb-4">Add a New Service</h2>
                    <form id="add-service-form">
                        <div class="form-group"><input type="text" id="service-title" placeholder="Service Title" required></div>
                        <div class="form-group"><textarea id="service-desc" placeholder="Detailed service description..." required></textarea></div>
                        <div class="form-group">
                            <label for="service-image-file" style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Service Image</label>
                            <input type="file" id="service-image-file" accept="image/*" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">Add Service</button>
                    </form>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.1s;">
                    <h2 class="font-bold text-xl mb-4">My Services</h2>
                    <div id="user-services-list" class="space-y-4">${servicesHtml}</div>
                </div>
            </div>
            <div class="space-y-8">
                <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.2s;">
                    <h2 class="font-bold text-xl mb-4">My Profile</h2>
                     <form id="update-profile-form">
                        <div class="form-group"><input type="text" id="profile-name" value="${userData.name}" required></div>
                        <div class="form-group"><textarea id="profile-bio" placeholder="A short bio...">${userData.bio || ''}</textarea></div>
                        <button type="submit" class="btn btn-secondary w-full">Update Profile</button>
                    </form>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.3s;">
                    <h2 class="font-bold text-xl mb-4">Account</h2>
                    <p class="mb-4">Current Plan: <span class="font-bold capitalize text-primary-color">${userPlan}</span></p>
                    <a href="upgrade.html" class="btn btn-accent w-full mb-4">Upgrade Plan</a>
                    <a href="profile.html?id=${currentUser.uid}" class="btn btn-secondary w-full mb-4">View Public Profile</a>
                    <button id="logout-btn" class="btn btn-secondary w-full">Logout</button>
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
        if (!userData.plan) {
            await updateDoc(userRef, { plan: 'spark' });
            userData.plan = 'spark'; 
        }
        const servicesQuery = query(collection(db, "services"), where("providerId", "==", currentUser.uid));
        const servicesSnapshot = await getDocs(servicesQuery);
        const userServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDashboard(userData, userServices);
    } catch (error) {
        console.error("Error loading dashboard:", error);
        dashboardContainer.innerHTML = '<p class="text-center text-error-color">Could not load dashboard. Please try again.</p>';
    }
}

function attachEventListeners(currentUserName) {
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

    document.getElementById('add-service-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button');
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading Image...';
        
        const title = document.getElementById('service-title').value;
        const description = document.getElementById('service-desc').value;
        const imageFile = document.getElementById('service-image-file').files[0];
        
        if (!imageFile) {
            alert('Please select an image file.');
            submitButton.disabled = false;
            submitButton.textContent = 'Add Service';
            return;
        }

        try {
            const imageUrl = await uploadImageToCloudinary(imageFile);
            
            submitButton.textContent = 'Saving Service...';
            
            await addDoc(collection(db, "services"), {
                title,
                description,
                imageUrl,
                providerId: currentUser.uid,
                providerName: currentUserName,
                createdAt: serverTimestamp(),
            });
            e.target.reset(); // Clear the form
            loadDashboard(); // Refresh dashboard
        } catch(error) {
            console.error("Error adding service:", error);
            alert("Could not add service. Please check the console for errors.");
        } finally {
             submitButton.disabled = false;
             submitButton.textContent = 'Add Service';
        }
    });

    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const bio = document.getElementById('profile-bio').value;
        try {
            await updateDoc(doc(db, "users", currentUser.uid), { name, bio });
            alert("Profile updated!");
            loadDashboard();
        } catch (error) {
            alert("Could not update profile.");
        }
    });
    
    document.querySelectorAll('.delete-service-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            if (confirm("Are you sure you want to delete this service?")) {
                try {
                    await deleteDoc(doc(db, "services", e.target.dataset.id));
                    loadDashboard();
                } catch (error) {
                    alert("Could not delete service.");
                }
            }
        });
    });
}