// Chat Logic for Nexus - Persistent & Real-time simulation

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const CHAT_HISTORY_KEY = 'nexus_chat_history';

// Auto-scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Save chat history to localStorage
function saveChatHistory(messages) {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
}

// Load chat history from localStorage
function loadChatHistory() {
    const history = localStorage.getItem(CHAT_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
}

// Add a message to the UI
function addMessage(text, sender = 'user', time = getCurrentTime(), isNew = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${sender}`;

    let avatarHTML = '';
    if (sender === 'ai') {
        avatarHTML = `<div class="message-avatar">⚡</div>`;
    }

    messageDiv.innerHTML = `
        ${avatarHTML}
        <div class="message-content">
            <p>${text}</p>
            <span class="message-time">${time}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    if (isNew) {
        const history = loadChatHistory();
        history.push({ text, sender, time });
        saveChatHistory(history);
    }
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message-bubble ai typing';
    typingDiv.innerHTML = `
        <div class="message-avatar">⚡</div>
        <div class="message-content">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Simulate AI processing and typing
function simulateAIResponse(userText) {
    showTypingIndicator();

    let responseText = "That's interesting! Tell me more. 🤔";
    const lowerText = userText.toLowerCase();

    if (lowerText.includes('hello') || lowerText.includes('hi')) {
        responseText = "Hi there! Ready to code? 💻";
    } else if (lowerText.includes('name')) {
        responseText = "I'm Nexus, your digital companion. ⚡";
    } else if (lowerText.includes('help')) {
        responseText = "I can help you organize your tasks, learn JavaScript, or just chat! What do you need?";
    } else if (lowerText.includes('javascript') || lowerText.includes('code')) {
        responseText = "JavaScript is awesome! Did you know it powers almost everything on the web? Lets write some! 🚀";
    }

    // Delay response to feel natural
    setTimeout(() => {
        removeTypingIndicator();
        addMessage(responseText, 'ai');
    }, 1500 + Math.random() * 1000);
}

// Initialize Chat
function initChat() {
    const history = loadChatHistory();
    const user = Nexus.getCurrentUser();

    // Display user name
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && user) {
        userNameDisplay.textContent = user.name;
    }

    // Clear and reload
    chatMessages.innerHTML = '';

    if (history.length === 0) {
        // Default welcome message if no history
        addMessage(`Hello ${user ? user.name : ''}! I'm Nexus. I'm here to help you learn, create, and explore. What's on your mind today? 🧠`, 'ai', 'Just now', true);
    } else {
        history.forEach(msg => {
            addMessage(msg.text, msg.sender, msg.time, false);
        });
    }
}

// Clear Chat Functionality
const clearChatBtn = document.getElementById('clearChatBtn');
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history? 🗑️')) {
            localStorage.removeItem(CHAT_HISTORY_KEY);
            initChat();
        }
    });
}

// Handle Form Submit
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = messageInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    messageInput.value = '';
    simulateAIResponse(text);
});

// Run Init
initChat();
