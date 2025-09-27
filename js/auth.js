import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Redirect logged-in users away from auth pages
onAuthStateChanged(auth, (user) => {
    if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html'))) {
        window.location.href = 'dashboard.html';
    }
});

// --- LOGIN FORM LOGIC ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = document.getElementById('login-btn');

        const originalButtonText = submitButton.innerHTML; // Store original text
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        errorMessage.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // On success, onAuthStateChanged will handle the redirect.
            // The button text doesn't need to be restored because the page will change.
        } catch (error) {
            console.error("Login failed:", error); // Log the actual error for debugging
            errorMessage.textContent = 'Invalid email or password. Please try again.';
            errorMessage.style.display = 'block';
            // --- THIS IS THE FIX ---
            // Ensure button is restored on failure
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.innerHTML = originalButtonText; 
        }
    });
}

// --- SIGNUP FORM LOGIC ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = document.getElementById('signup-btn');

        const originalButtonText = submitButton.innerHTML; // Store original text
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        errorMessage.style.display = 'none';

        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.innerHTML = originalButtonText;
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Create a corresponding user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                createdAt: serverTimestamp(),
                plan: 'spark',
                role: 'user',
                bio: '',
                profilePhotoUrl: ''
            });
            // On success, onAuthStateChanged will handle the redirect.
        } catch (error) {
            console.error("Signup failed:", error); // Log the actual error
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'This email is already registered.';
            } else {
                errorMessage.textContent = 'An error occurred. Please try again.';
            }
            errorMessage.style.display = 'block';
            // --- THIS IS THE FIX ---
            // Ensure button is restored on failure
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            submitButton.innerHTML = originalButtonText;
        }
    });
}