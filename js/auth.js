import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REDIRECT LOGGED-IN USERS ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // If user is on login or signup page, redirect to dashboard
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// --- LOGIN FORM ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = loginForm.querySelector('button');

        submitButton.disabled = true;
        submitButton.textContent = 'Logging In...';
        errorMessage.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redirect will be handled by onAuthStateChanged
        } catch (error) {
            errorMessage.textContent = 'Invalid email or password. Please try again.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });
}

// --- SIGNUP FORM ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = signupForm.querySelector('button');

        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        errorMessage.style.display = 'none';

        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                createdAt: serverTimestamp(),
                plan: 'spark', // Default free plan
                isAdmin: false,
                profilePhotoUrl: '',
                bio: ''
            });
            // Redirect will be handled by onAuthStateChanged
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'This email is already registered.';
            } else {
                errorMessage.textContent = 'An error occurred. Please try again.';
            }
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    });
}