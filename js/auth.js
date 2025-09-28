import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- HELPER FUNCTION FOR MESSAGES ---
function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

// --- CORE AUTH LOGIC ---
onAuthStateChanged(auth, async (user) => {
    const onVerifyPage = window.location.pathname.includes('verify-email.html');
    
    if (user) {
        await user.reload(); // Get latest user status
        if (user.emailVerified) {
            // If verified, send to dashboard. Redirect if they land on auth pages.
            if (onVerifyPage || window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // If not verified, force them to the verification page.
            if (!onVerifyPage) {
                window.location.href = 'verify-email.html';
            }
            // If they are on the verify page, update the email placeholder
            const emailPlaceholder = document.getElementById('user-email-placeholder');
            if (emailPlaceholder) emailPlaceholder.textContent = user.email;
        }
    }
});

// --- LOGIN PAGE LOGIC ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            // onAuthStateChanged will handle redirect
        } catch (error) {
            showMessage(errorMessage, 'Invalid email or password.', true);
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    });

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        if (!email) {
            showMessage(errorMessage, "Please enter your email address first.", true);
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage(successMessage, "Password reset email sent. Check your inbox.");
        } catch (error) {
            showMessage(errorMessage, "Could not send reset email. Is the address correct?", true);
        }
    });
}

// --- SIGNUP PAGE LOGIC ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const signupBtn = document.getElementById('signup-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupBtn.disabled = true;
        signupBtn.classList.add('loading');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            const user = userCredential.user;
            
            await setDoc(doc(db, "users", user.uid), {
                name: nameInput.value,
                email: user.email,
                createdAt: serverTimestamp(),
                plan: 'spark',
                role: 'user',
                bio: '',
                profilePhotoUrl: ''
            });

            await sendEmailVerification(user);
            
            // Show success message and clear form, onAuthStateChanged will redirect.
            showMessage(successMessage, "Success! Please check your email to verify your account.");
            signupForm.reset();
            
        } catch (error) {
            let msg = 'An error occurred. Please try again.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
            showMessage(errorMessage, msg, true);
        } finally {
            signupBtn.disabled = false;
            signupBtn.classList.remove('loading');
        }
    });
}

// --- VERIFY EMAIL PAGE LOGIC ---
const resendBtn = document.getElementById('resend-btn');
if (resendBtn) {
    const logoutBtn = document.getElementById('logout-btn');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');

    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        resendBtn.classList.add('loading');
        try {
            await sendEmailVerification(auth.currentUser);
            showMessage(successMessage, "A new verification email has been sent.");
        } catch (error) {
            showMessage(errorMessage, "Failed to send email. Please try again soon.", true);
        } finally {
            resendBtn.disabled = false;
            resendBtn.classList.remove('loading');
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
        window.location.href = 'login.html'; // Redirect to login after logout
    });
}