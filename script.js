let subjects = [];

// IMPORTANT: Replace "YOUR_API_KEY_HERE" with your actual OpenRouter API key.
// You can get your free key from https://openrouter.ai/keys
const OPENROUTER_API_KEY = "rowan"; 
const MODEL_NAME = "mistralai/mistral-7b-instruct:free"; // Using a different reliable free model

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum date to today for the date picker
    document.getElementById('examDate').min = new Date().toISOString().split('T')[0];
    
    // Add event listener for the Enter key in the chat input
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

// --- Chat Functionality ---

// Sends a message from the user and gets a response from the AI
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    input.value = '';

    // Show a thinking indicator
    addChatMessage("Thinking...", 'ai', true);

    // Call the AI API to get a response
    getAIResponse(message).then(response => {
        updateLastAIChatMessage(response);
    }).catch(error => {
        console.error("API Error:", error);
        updateLastAIChatMessage("I'm having trouble connecting to the AI service. Please check your API key and try again.");
    });
}

// Fetches a response from the OpenRouter AI
async function getAIResponse(message) {
    // First, check for simple, predefined local responses to save API calls
    const localResponse = getLocalAIResponse(message);
    if (localResponse) return localResponse;

    if (OPENROUTER_API_KEY === "YOUR_API_KEY_HERE") {
        return "Please set your OpenRouter API key in the script.js file to enable AI features.";
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are IntellectoNova, an AI study assistant. Help students create effective study plans. Format your responses with clear paragraphs, proper spacing, and use bullet points (-) for lists. Keep responses concise but helpful."
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Response:", errorData);
            return `An error occurred: ${errorData.error.message || 'Please check your API key or try again.'}`;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
    } catch (error) {
        console.error("Fetch API Error:", error);
        return "I'm having trouble connecting to the network right now. Please try again later.";
    }
}


// Provides simple, hardcoded responses for common questions
function getLocalAIResponse(message) {
    message = message.toLowerCase();
    if (message.includes('hello') || message.includes('hi')) {
        return "Hi there! How can I help you with your study planning today?";
    } else if (message.includes('help')) {
        return "I can help you create study schedules! Add your subjects using the form, then click 'Generate AI Schedule'. You can also ask me for study tips! 🤖";
    } else if (message.includes('schedule')) {
        return subjects.length === 0 ? 
            "Add some subjects first, then I can create your schedule! 📚" :
            "Great! Click 'Generate AI Schedule' to see your personalized plan! 🎯";
    } else if (message.includes('difficulty')) {
        return "Rate difficulty based on how hard the topic is for you. I use this to allocate more study time to challenging subjects! 📊";
    } else if (message.includes('importance')) {
        return "Rate importance based on how critical the topic is for your exam or goals. I'll prioritize the most important topics! ⭐";
    }
    return null;
}

// Adds a new message to the chat window
function addChatMessage(text, type, isThinking = false) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    if (isThinking) {
        messageDiv.classList.add('thinking');
    }
    messageDiv.innerHTML = formatMessage(text);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Updates the last AI message (used for replacing "Thinking...")
function updateLastAIChatMessage(text) {
    const messagesDiv = document.getElementById('chatMessages');
    const thinkingMessage = messagesDiv.querySelector('.thinking');
    if (thinkingMessage) {
        thinkingMessage.innerHTML = formatMessage(text);
        thinkingMessage.classList.remove('thinking');
    } else {
        addChatMessage(text, 'ai');
    }
}

// Formats text with simple markdown-like syntax to HTML
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
        .replace(/^\s*-\s(.*$)/gm, '<li>$1</li>')      // List items
        .replace(/<ul>\s*<li>/g, '<ul><li>')           // Clean up lists
        .replace(/<\/li>\s*<\/ul>/g, '</li></ul>')
        .replace(/(<li>.*<\/li>)+/s, '<ul>$&</ul>')    // Wrap list items in <ul>
        .replace(/\n/g, '<br>');                      // Newlines
}


// --- Subject Management ---

// Adds a new subject from the form to the subjects list
function addSubject(event) {
    event.preventDefault();
    
    const name = document.getElementById('subjectName').value;
    const examDate = document.getElementById('examDate').value;
    const topic = document.getElementById('topicName').value;
    const difficulty = parseInt(document.getElementById('difficulty').value);
    const importance = parseInt(document.getElementById('importance').value);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const exam = new Date(examDate);
    const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        addChatMessage("The exam date cannot be in the past. Please choose a future date.", 'ai');
        return;
    }

    const subject = {
        id: Date.now(),
        name, 
        examDate, 
        topic, 
        difficulty, 
        importance, 
        daysLeft
    };

    subjects.push(subject);
    updateSubjectsList();
    document.getElementById('subjectForm').reset();
    document.getElementById('examDate').min = new Date().toISOString().split('T')[0]; // Reset min date
    
    addChatMessage(`Added "${name}" to your subjects. You have ${daysLeft} days until the exam! 🎯`, 'ai');
}

// Updates the list of subjects displayed on the UI
function updateSubjectsList() {
    const container = document.getElementById('subjectsList');
    
    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="emoji">📚</span>
                <p>No subjects added yet. Add your first subject above!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = subjects.map(subject => `
        <div class="subject-item">
            <div class="subject-header">
                <div class="subject-name">${subject.name}</div>
                <div class="days-left">${subject.daysLeft} days</div>
            </div>
            <div class="subject-details">
                Topic: ${subject.topic} | Difficulty: ${subject.difficulty}/10 | Importance: ${subject.importance}/10
            </div>
        </div>
    `).join('');
}

// --- Schedule Generation ---

// Generates the study schedule
async function generateSchedule() {
    if (subjects.length === 0) {
        addChatMessage("Please add at least one subject to generate a schedule! 📚", 'ai');
        return;
    }

    addChatMessage("Creating your optimized study schedule... this may take a moment. 🤖", 'ai', true);
    
    try {
        const schedule = createSchedule();
        displaySchedule(schedule); // Display the basic schedule first
        
        // Then, get AI recommendations to enhance it
        const aiRecommendations = await getAIScheduleRecommendations(schedule);
        if (aiRecommendations) {
            displayAIRecommendations(aiRecommendations);
        }
        
        updateLastAIChatMessage(`Your study plan is ready! I've created a ${schedule.length}-session plan with some AI-powered recommendations. 🎉`);
    } catch (error) {
        console.error("Schedule generation error:", error);
        updateLastAIChatMessage("I had trouble generating your schedule. Please try again.");
    }
}

// Fetches AI-powered recommendations to improve a basic schedule
async function getAIScheduleRecommendations(schedule) {
     if (OPENROUTER_API_KEY === "YOUR_API_KEY_HERE") {
        return "### AI Recommendations Disabled\n- Set your OpenRouter API key in `script.js` to get smart suggestions and optimizations for your schedule.";
    }

    const prompt = `Analyze this study schedule and provide actionable recommendations.
    
    **Subjects:**
    ${subjects.map(s => `- ${s.name} (Difficulty: ${s.difficulty}/10, Importance: ${s.importance}/10, Days left: ${s.daysLeft})`).join('\n')}
    
    **Generated Schedule:**
    ${schedule.map(s => `- ${s.date} @ ${s.time}: ${s.subject} - ${s.topic} (${s.duration} mins)`).join('\n')}
    
    **Your Task:**
    Provide actionable study techniques and time allocation advice. Use markdown headings (##) for main topics like "## Study Techniques" and "## Time Allocation". Under each heading, provide a direct list of bullet points (-). Do not add any extra lines, sub-headers, or introductory text before the bullet points. Be direct and avoid conversational fluff or encouragement.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": MODEL_NAME,
                "messages": [
                    { "role": "system", "content": "You are an expert study coach. Your task is to analyze a study schedule and provide direct, actionable advice in a structured markdown format. Use headings (##) for topics and bullet points (-) for details. Do not use conversational language, filler text, or create bullet points that act as headers for other bullet points." },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) throw new Error("API response was not ok.");

        const data = await response.json();
        return data.choices[0]?.message?.content;
    } catch (error) {
        console.error("AI enhancement error:", error);
        return "### Could Not Get AI Recommendations\n- There was an issue connecting to the AI service for schedule enhancements.";
    }
}

// Creates a basic, structured schedule based on subject properties
function createSchedule() {
    const schedule = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    subjects.forEach(subject => {
        // More sessions for harder, more important, and closer deadlines
        const weight = (subject.difficulty * 1.5) + subject.importance;
        const sessionCount = Math.max(2, Math.ceil(weight / 3));
        
        for (let i = 0; i < sessionCount; i++) {
            // Distribute sessions evenly between now and the exam
            const dayOffset = Math.floor((subject.daysLeft / sessionCount) * i);
            const sessionDate = new Date(today);
            sessionDate.setDate(sessionDate.getDate() + dayOffset + 1); // Start tomorrow
            
            // Longer duration for harder subjects (45-90 minutes)
            const duration = 45 + (subject.difficulty - 1) * 5;
            
            // Alternate time slots
            const timeSlots = ['09:00 AM', '02:00 PM', '07:00 PM'];
            const time = timeSlots[i % timeSlots.length];
            
            schedule.push({
                subject: subject.name,
                topic: subject.topic,
                date: sessionDate.toISOString().split('T')[0],
                time: time,
                duration: duration,
            });
        }
    });

    // Sort the final schedule by date and time
    return schedule.sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
}

// Displays the generated schedule on the page
function displaySchedule(schedule) {
    const container = document.getElementById('scheduleContent');
    const statsContainer = document.getElementById('scheduleStats');
    
    if (schedule.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <span class="emoji">🤔</span>
            <h3>Nothing to schedule.</h3>
            <p>Add some subjects first!</p>
        </div>`;
        statsContainer.classList.add('hidden');
        return;
    }
    
    // Group sessions by date
    const groupedSchedule = schedule.reduce((acc, session) => {
        (acc[session.date] = acc[session.date] || []).push(session);
        return acc;
    }, {});

    // **FIXED**: Correctly generate HTML for each session
    container.innerHTML = Object.entries(groupedSchedule).map(([date, sessions]) => `
        <div class="schedule-day">
            <div class="schedule-date">
                ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            ${sessions.map(session => `
                <div class="schedule-session">
                    <div class="session-header">
                        <div class="session-subject">${session.subject}</div>
                        <div class="session-time">${session.time}</div>
                    </div>
                    <div class="session-details">
                        Topic: ${session.topic} | Duration: ${session.duration} mins
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');

    // Update stats
    const totalHours = Math.round(schedule.reduce((sum, session) => sum + session.duration, 0) / 60);
    document.getElementById('totalSessions').textContent = schedule.length;
    document.getElementById('totalHours').textContent = totalHours + 'h';
    document.getElementById('studyDays').textContent = Object.keys(groupedSchedule).length;
    
    statsContainer.classList.remove('hidden');
}

// Displays the AI-generated recommendations
function displayAIRecommendations(markdown) {
    const container = document.getElementById('scheduleContent');
    let recommendationsDiv = container.querySelector('.ai-recommendations');
    
    if (!recommendationsDiv) {
        recommendationsDiv = document.createElement('div');
        recommendationsDiv.className = 'ai-recommendations';
        container.prepend(recommendationsDiv); // Add to the top
    }
    
    // Simple markdown to HTML conversion
    const htmlContent = markdown
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\s*-\s(.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)+/s, '<ul>$&</ul>')
        .replace(/\n/g, '<br>');

    recommendationsDiv.innerHTML = `
        <h2 class="card-title">💡 AI Recommendations</h2>
        <div class="markdown-content">${htmlContent}</div>
    `;
}

