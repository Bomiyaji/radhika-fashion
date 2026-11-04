import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB6Um_HJ8vyaaSm-JMzdGIDl8pZdw4yZ1U",
  authDomain: "radhika-fashion-ae2db.firebaseapp.com",
  projectId: "radhika-fashion-ae2db",
  storageBucket: "radhika-fashion-ae2db.firebasestorage.app",
  messagingSenderId: "703545319327",
  appId: "1:703545319327:web:b3f77140a2ddfe09c3e7aa",
  measurementId: "G-T2JZXC0MH5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Session check
window.checkSession = function(redirectIfLoggedOut = true) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      localStorage.setItem('radhikaUserEmail', user.email);
    } else {
      if (redirectIfLoggedOut && !window.location.href.includes('login.html')) {
        window.location.href = "login.html";
      }
    }
  });
};

// Auth Mode Toggle
let isSignUp = false;
window.toggleAuthMode = function() {
  isSignUp = !isSignUp;
  const title = document.getElementById('formTitle');
  const btn = document.getElementById('authBtn');
  const toggleText = document.getElementById('toggleText');

  if(title) title.innerText = isSignUp ? "Create New Account" : "Customer Login";
  if(btn) btn.innerText = isSignUp ? "Register" : "Login";
  if(toggleText) toggleText.innerText = isSignUp ? "Already have an account? Login" : "New user? Create an account";
};

window.handleAuth = async function() {
  const email = document.getElementById('userEmail').value;
  const pass = document.getElementById('userPassword').value;
  const errBox = document.getElementById('authError');
  if(errBox) errBox.innerText = "";

  if(!email || !pass) {
    if(errBox) errBox.innerText = "Please fill all fields!";
    return;
  }

  try {
    if(isSignUp) {
      await createUserWithEmailAndPassword(auth, email, pass);
      alert("Account created successfully! Logging you in...");
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
    localStorage.setItem('radhikaUserEmail', email);
    window.location.href = "index.html";
  } catch (error) {
    if(errBox) errBox.innerText = error.message;
  }
};

window.logoutUser = function() {
  signOut(auth).then(() => {
    localStorage.clear();
    window.location.href = "login.html";
  }).catch((err) => {
    alert("Logout Error: " + err.message);
  });
};

window.submitOrder = async function(event) {
  event.preventDefault();
  
  const orderIdNum = Math.floor(100000 + Math.random() * 900000);
  const userEmail = localStorage.getItem('radhikaUserEmail') || 'guest@gmail.com';

  const orderData = {
    orderId: orderIdNum,
    email: userEmail,
    name: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    item: document.getElementById('custItem').value,
    location: document.getElementById('custLocation').value,
    address: document.getElementById('custAddress').value,
    status: "Pending Admin Approval",
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "orders"), orderData);
    localStorage.setItem('radhikaOrder', JSON.stringify(orderData));
    window.location.href = "tracking.html";
  } catch (err) {
    alert("Error saving order: " + err.message);
  }
};

window.checkAdminPassword = function() {
  const pass = document.getElementById('adminPass').value;
  if(pass === "radhika123") {
    document.getElementById('adminLoginCard').classList.add('hidden');
    document.getElementById('adminPanelCard').classList.remove('hidden');
    window.loadAdminOrders();
  } else {
    alert("Wrong Password!");
  }
};

window.loadAdminOrders = async function() {
  const tbody = document.getElementById('ordersTableBody');
  if(!tbody) return;
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Loading live orders...</td></tr>";
  
  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    tbody.innerHTML = "";
    
    querySnapshot.forEach((documentItem) => {
      const order = documentItem.data();
      const docId = documentItem.id;
      
      tbody.innerHTML += `
        <tr>
          <td><b>#${order.orderId}</b></td>
          <td><b>${order.name}</b><br><span style="color:#666; font-size:11px;">${order.email || 'N/A'}</span></td>
          <td>${order.address}<br><b>${order.location}</b></td>
          <td>${order.item}</td>
          <td>
            <span style="color:var(--fk-green); font-weight:bold;">${order.status || 'Pending'}</span><br><br>
            <button class="btn-approve" onclick="updateOrderStatus('${docId}', 'Approved by Admin', ${order.orderId})">1. Approve</button>
            <button class="btn-dispatch" onclick="updateOrderStatus('${docId}', 'Dispatched via Express', ${order.orderId})">2. Dispatch</button>
            <button class="btn-out" onclick="updateOrderStatus('${docId}', 'Out for Delivery', ${order.orderId})">3. Out for Delivery</button>
            <button class="btn-reset" onclick="updateOrderStatus('${docId}', 'Pending Admin Approval', ${order.orderId})">Reset</button>
          </td>
        </tr>
      `;
    });

    if(querySnapshot.empty) {
      tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No orders found.</td></tr>";
    }
  } catch (e) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Error: " + e.message + "</td></tr>";
  }
};

window.updateOrderStatus = async function(docId, newStatus, orderIdNum) {
  try {
    const orderRef = doc(db, "orders", docId);
    await updateDoc(orderRef, { status: newStatus });

    let currentSaved = JSON.parse(localStorage.getItem('radhikaOrder'));
    if(currentSaved && currentSaved.orderId == orderIdNum) {
      currentSaved.status = newStatus;
      localStorage.setItem('radhikaOrder', JSON.stringify(currentSaved));
    }

    alert("Status updated to: " + newStatus);
    window.loadAdminOrders();
  } catch (e) {
    alert("Error: " + e.message);
  }
};
