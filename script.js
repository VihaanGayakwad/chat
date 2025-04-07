// Initialize Firebase with your configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmONohJhzs8pPSDLoV24IDLTHipysH1oI",
  authDomain: "chat-system-a83457v.firebaseapp.com",
  projectId: "chat-system-a83457v",
  storageBucket: "chat-system-a83457v.firebasestorage.app",
  messagingSenderId: "906431173015",
  appId: "1:906431173015:web:725957eba47a20ff98b4d2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginDiv = document.getElementById("login");
const chatDiv = document.getElementById("chat");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteChatBtn = document.getElementById("deleteChatBtn");

// Set your admin email (only this account will see the delete button)
const adminEmail = "steven.darwinson.1@gmail.com";

// Listen to auth state changes
auth.onAuthStateChanged(user => {
  if (user) {
    loginDiv.style.display = "none";
    chatDiv.style.display = "block";
    // Show delete button if admin
    deleteChatBtn.style.display = (user.email === adminEmail) ? "inline-block" : "none";
    loadMessages();
    startUserValidationCheck();
  } else {
    loginDiv.style.display = "block";
    chatDiv.style.display = "none";
    stopUserValidationCheck();
  }
});

// Authentication actions
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => alert(error.message));
});

signupBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .catch(error => alert(error.message));
});

logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// Send message and enforce last 25 messages limit
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const message = messageInput.value.trim();
  const user = auth.currentUser;
  if (message && user) {
    db.collection("messages").add({
      text: message,
      uid: user.uid,
      email: user.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      // After sending a message, enforce the 25-message limit
      enforceMessageLimit();
    }).catch(error => {
      console.error("Error sending message:", error);
    });
    messageInput.value = "";
  }
}

// Load messages with real-time updates
function loadMessages() {
  db.collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const p = document.createElement("p");
        p.innerHTML = `<strong>${data.email}:</strong> ${data.text}`;
        messagesDiv.appendChild(p);
      });
    });
}

// Ensure that only the most recent 25 messages remain
function enforceMessageLimit() {
  db.collection("messages")
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      const messages = snapshot.docs;
      if (messages.length > 25) {
        const excess = messages.length - 25;
        // Delete the oldest messages first
        for (let i = 0; i < excess; i++) {
          messages[i].ref.delete();
        }
      }
    });
}

// Delete entire chat history (admin-only)
deleteChatBtn.addEventListener("click", () => {
  if (auth.currentUser && auth.currentUser.email === adminEmail) {
    if (confirm("Are you sure you want to delete the entire chat history?")) {
      db.collection("messages").get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            doc.ref.delete();
          });
        })
        .catch(error => {
          console.error("Error deleting chat history:", error);
        });
    }
  } else {
    alert("You are not authorized to delete chat history.");
  }
}

// Periodic user validation every 10 seconds
let validationInterval;
function startUserValidationCheck() {
  stopUserValidationCheck(); // Clear any existing interval
  validationInterval = setInterval(() => {
    const user = auth.currentUser;
    if (user) {
      // Force reload user data from Firebase
      user.reload()
        .then(() => {
          // Force refresh the ID token. If the token is invalid or the account is disabled,
          // this promise will reject.
          user.getIdToken(true).catch(error => {
            console.error("Token refresh error. Logging out...", error);
            auth.signOut();
          });
        })
        .catch(error => {
          console.error("Error reloading user:", error);
          auth.signOut();
        });
    }
  }, 10000);
}

function stopUserValidationCheck() {
  if (validationInterval) {
    clearInterval(validationInterval);
    validationInterval = null;
  }
}