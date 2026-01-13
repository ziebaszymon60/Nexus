/**
 * Nexus - Authentication & App Logic
 * A modern, intelligent AI platform
 */

const Nexus = {
    // Storage keys
    USERS_KEY: 'nexus_users',
    SESSION_KEY: 'nexus_session',
    PENDING_USER_KEY: 'nexus_pending_user',

    // EmailJS Configuration
    emailConfig: {
        SERVICE_ID: 'service_2hvwjx4',
        TEMPLATE_ID: 'template_ra4tone',
        PUBLIC_KEY: 'fMvDyTODYQ1T4ted2'
    },

    /**
     * Get all registered users
     */
    getUsers() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    },

    /**
     * Save users to storage
     */
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    /**
     * Sign up a new user
     */
    signup(name, email, password) {
        // Validate inputs
        if (!name || !email || !password) {
            return { success: false, message: 'Please fill in all fields ⚡' };
        }

        if (password.length < 6) {
            return { success: false, message: 'Password needs at least 6 characters! 💪' };
        }

        const users = this.getUsers();

        // Check if email already exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'This email is already registered! Try logging in? 🔗' };
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // In production, this would be hashed!
            createdAt: new Date().toISOString()
        };

        // Store user temporarily until verified
        sessionStorage.setItem(this.PENDING_USER_KEY, JSON.stringify(newUser));

        // Trigger Email sending
        this.sendVerificationEmail(email);

        return {
            success: true,
            message: `Verification code sent to ${email}! ⚡ Check your inbox.`
        };
    },

    /**
     * Send Verification Email via EmailJS
     */
    sendVerificationEmail(email) {
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('nexus_verify_code', code);
        sessionStorage.setItem('nexus_pending_email', email);



        // Real EmailJS call
        const templateParams = {
            to_email: email,
            verify_code: code
        };

        emailjs.init(this.emailConfig.PUBLIC_KEY);
        emailjs.send(this.emailConfig.SERVICE_ID, this.emailConfig.TEMPLATE_ID, templateParams)
            .then(() => {
                console.log('Email sent successfully!');
            }, (error) => {
                console.error('Failed to send email:', error);
            });

        return {
            success: true,
            message: `Code sent to ${email}! ⚡`
        };
    },

    /**
     * Verify the 6-digit code
     */
    verifyCode(email, inputCode) {
        const storedCode = sessionStorage.getItem('nexus_verify_code');
        const pendingSignup = JSON.parse(sessionStorage.getItem(this.PENDING_USER_KEY));
        const pendingLogin = JSON.parse(sessionStorage.getItem('nexus_pending_login_user'));

        if (inputCode === storedCode) {
            // Case 1: Signup Verification
            if (pendingSignup) {
                const users = this.getUsers();
                users.push(pendingSignup);
                this.saveUsers(users);
                sessionStorage.removeItem(this.PENDING_USER_KEY);
                sessionStorage.removeItem('nexus_verify_code');
                return { success: true, message: 'Email verified! You can now login. 🔓' };
            }

            // Case 2: Login Verification
            if (pendingLogin) {
                const session = {
                    userId: pendingLogin.id,
                    name: pendingLogin.name,
                    email: pendingLogin.email,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
                sessionStorage.removeItem('nexus_pending_login_user');
                sessionStorage.removeItem('nexus_verify_code');
                return { success: true, isLogin: true, message: `Welcome back, ${pendingLogin.name}! ⚡` };
            }
        }

        return { success: false, message: 'Invalid code. Please try again! 🛑' };
    },

    /**
     * Login user
     */
    login(identifier, password) {
        if (!identifier || !password) {
            return { success: false, message: 'Please enter your email/username and password! 📝' };
        }

        const users = this.getUsers();
        // Check both email AND name (case insensitive)
        const user = users.find(
            u => (u.email.toLowerCase() === identifier.toLowerCase() ||
                u.name.toLowerCase() === identifier.toLowerCase()) &&
                u.password === password
        );

        if (!user) {
            return { success: false, message: 'Invalid credentials. Try again? 🔐' };
        }

        // Trigger verification instead of immediate login
        sessionStorage.setItem('nexus_pending_login_user', JSON.stringify(user));
        this.sendVerificationEmail(user.email);

        return {
            success: true,
            requiresVerification: true,
            message: `Verification code sent to ${user.email}! ⚡`
        };
    },

    /**
     * Get current logged in user
     */
    getCurrentUser() {
        const session = localStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    },

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        return { success: true, message: 'See you soon! ⚡' };
    },

    /**
     * Check if user is logged in
     */
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // --- PASSWORD RESET LOGIC ---

    /**
     * Request a reset code
     */
    requestPasswordReset(email) {
        const users = this.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return { success: false, message: 'We could not find an account with that email. 😕' };
        }

        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save code to localStorage specifically for this user's reset session
        // In a real app, you'd store this in a database
        localStorage.setItem(`reset_code_${email}`, code);

        return {
            success: true,
            message: 'Recovery code sent! Check your inbox 📨',
            code: code
        };
    },

    /**
     * Confirm reset logic
     */
    confirmPasswordReset(email, code, newPassword) {
        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters! 💪' };
        }

        const storedCode = localStorage.getItem(`reset_code_${email}`);

        if (storedCode === code) {
            // Update User Password
            const users = this.getUsers();
            const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

            if (userIndex !== -1) {
                users[userIndex].password = newPassword;
                this.saveUsers(users);

                // Clean up
                localStorage.removeItem(`reset_code_${email}`);

                return { success: true, message: 'Password updated! You can now login. 🔓' };
            }
        }

        return { success: false, message: 'Invalid recovery code. Try again! 🛑' };
    }
};

/**
 * Show message helper (for forms)
 */
function showMessage(text, type = 'error') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message show ${type}`;

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.classList.remove('show');
            }, 5000);
        }
    }
}

// Make it global for use in HTML
window.Nexus = Nexus;
window.showMessage = showMessage;
