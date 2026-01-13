/**
 * Nexus - Authentication & App Logic
 * A modern, intelligent AI platform
 */

const Nexus = {
    // Storage keys
    USERS_KEY: 'nexus_users',
    SESSION_KEY: 'nexus_session',

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

        users.push(newUser);
        this.saveUsers(users);

        return {
            success: true,
            message: `Welcome to Nexus, ${name}! ⚡ Your account is ready.`
        };
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

        // Create session
        const session = {
            userId: user.id,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

        return {
            success: true,
            message: `Welcome back, ${user.name}! ⚡`,
            user: session
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
            code: code // We return it here only for our simulation!
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
