import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const dashboardContainer = document.getElementById('dashboard-container');
let currentUser = null;
let userPlan = 'spark'; // Default

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
        servicesHtml = userServices.map(service => `
            <div class="bg-gray p-4 rounded-lg flex justify-between items-center">
                <span>${service.title}</span>
                <div>
                    <button class="font-bold text-error-color hover:underline delete-service-btn" data-id="${service.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    dashboardContainer.innerHTML = `
        <div class="text-center mb-8 fade-in">
            <h1 class="font-bold text-3xl">Welcome, ${userData.name.split(' ')[0]}!</h1>
        </div>

        <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 2rem;" class="md:grid-cols-3">
            <div class="md:col-span-2 space-y-8">
                <!-- Add Service Form -->
                <div class="bg-white p-6 rounded-lg shadow-md slide-up">
                    <h2 class="font-bold text-xl mb-4">Add a New Service</h2>
                    <form id="add-service-form">
                        <div class="form-group"><input type="text" id="service-title" placeholder="Service Title (e.g., Expert Tutoring)" required></div>
                        <div class="form-group"><textarea id="service-desc" placeholder="Detailed service description..." required></textarea></div>
                        <div class="form-group"><input type="text" id="service-image-url" placeholder="Image URL (e.g., https://...)" required></div>
                        <button type="submit" class="btn btn-primary w-full">Add Service</button>
                    </form>
                </div>
                <!-- My Services -->
                <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.1s;">
                    <h2 class="font-bold text-xl mb-4">My Services</h2>
                    <div id="user-services-list" class="space-y-4">${servicesHtml}</div>
                </div>
            </div>

            <!-- Profile & Actions -->
            <div class="md:col-span-1 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow-md slide-up" style="animation-delay: 0.2s;">
                    <h2 class="font-bold text-xl mb-4">My Profile</h2>
                    <img src="${userData.profilePhotoUrl || 'https://placehold.co/128x128/e0e0e0/777?text=User'}" class="w-24 h-24 rounded-full mx-auto mb-4">
                    <form id="update-profile-form">
                        <div class="form-group"><input type="text" id="profile-name" value="${userData.name}" required></div>
                        <div class="form-group"><textarea id="profile-bio" placeholder="A short bio about you...">${userData.bio || ''}</textarea></div>
                        <div class="form-group"><input type="text" id="profile-photo-url" placeholder="Profile Photo URL" value="${userData.profilePhotoUrl || ''}"></div>
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

        if (!userSnap.exists()) {
            throw new Error("User data not found!");
        }
        const userData = userSnap.data();

        const servicesQuery = query(collection(db, "services"), where("providerId", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const servicesSnapshot = await getDocs(servicesQuery);
        const userServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderDashboard(userData, userServices);
    } catch (error) {
        console.error("Error loading dashboard:", error);
        dashboardContainer.innerHTML = '<p class="text-center text-error-color">Could not load your dashboard. Please try again.</p>';
    }
}

function attachEventListeners(currentUserName) {
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth);
    });

    document.getElementById('add-service-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('service-title').value;
        const description = document.getElementById('service-desc').value;
        const imageUrl = document.getElementById('service-image-url').value;
        
        try {
            await addDoc(collection(db, "services"), {
                title,
                description,
                imageUrl,
                providerId: currentUser.uid,
                providerName: currentUserName,
                createdAt: serverTimestamp(),
                averageRating: 0
            });
            loadDashboard();
        } catch(error) {
            console.error("Error adding service:", error);
            alert("Could not add service.");
        }
    });

    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const bio = document.getElementById('profile-bio').value;
        const profilePhotoUrl = document.getElementById('profile-photo-url').value;
        
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { name, bio, profilePhotoUrl });
            alert("Profile updated!");
            loadDashboard();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Could not update profile.");
        }
    });
    
    document.querySelectorAll('.delete-service-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const serviceId = e.target.dataset.id;
            if (confirm("Are you sure you want to delete this service?")) {
                try {
                    await deleteDoc(doc(db, "services", serviceId));
                    loadDashboard();
                } catch (error) {
                    console.error("Error deleting service:", error);
                    alert("Could not delete service.");
                }
            }
        });
    });
}