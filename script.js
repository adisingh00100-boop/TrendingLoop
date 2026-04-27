// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD0pWvaqGlQH93w3ddooHQ6Yq1-6GHus6w",
  authDomain: "trending-loop.firebaseapp.com",
  projectId: "trending-loop",
  storageBucket: "trending-loop.firebasestorage.app",
  messagingSenderId: "206395963563",
  appId: "1:206395963563:web:5bba53723d14c8af139fee"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

let allProducts = []; 
let selectedProduct = ""; 
let selectedPayment = "COD"; 

// --- 2. 🤖 TELEGRAM AUTOMATION SYSTEM ---
async function postToTelegram(name, price, image) {
    const token = "7966577329:AAHhRHxDC3D1543-53Cs8fzNs5eGSyjz_g8";
    const chatId = "@trendingloop"; // Pakka kar lena ki yehi username hai channel ka

    const text = `🚀 <b>New Product on Trending Loop!</b>\n\n` +
                 `🛍️ <b>Item:</b> ${name}\n` +
                 `💰 <b>Price:</b> ₹${price}\n\n` +
                 `🔗 <a href="https://trending-loop.github.io/trending-loop/">View on Website</a>`;
    
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", image);
    formData.append("caption", text);
    formData.append("parse_mode", "HTML");

    try {
        const response = await fetch(url, { method: "POST", body: formData });
        const resData = await response.json();
        if (!resData.ok) {
            console.log("Photo error, sending text only...");
            await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(name + " listed for ₹" + price)}&parse_mode=HTML`);
        }
        console.log("✅ Telegram Success!");
    } catch (e) {
        console.error("❌ Telegram Error:", e);
    }
}

// --- 3. CUSTOMER FACING FUNCTIONS ---
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    const snap = await db.collection("products").orderBy("timestamp", "desc").get();
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderGrid(allProducts);
}

function renderGrid(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "";
    products.forEach((data) => {
        const out = data.inStock === false;
        grid.innerHTML += `
            <div class="product-card" style="${out ? 'opacity: 0.5' : ''}">
                <img src="${data.image}" class="product-img">
                <div class="product-info">
                    <h3>${data.name}</h3>
                    <span class="price">₹${data.price}</span>
                    <button class="buy-btn" onclick="openModal('${data.id}')">${out ? 'SOLD OUT' : 'BUY NOW'}</button>
                </div>
            </div>`;
    });
}

function openModal(productId) {
    const p = allProducts.find(item => item.id === productId);
    if (!p || p.inStock === false) return;
    selectedProduct = p.name;
    document.getElementById('orderItemName').innerText = p.name;
    const codBtn = document.getElementById('codPayBtn');
    const qrSec = document.getElementById('qrSection');
    qrSec.style.display = "none";
    if (p.codAllowed === false) { codBtn.classList.add('cod-locked'); selectPay('Online'); } 
    else { codBtn.classList.remove('cod-locked'); selectPay('COD'); }
    document.getElementById('orderModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function selectPay(type) {
    selectedPayment = type;
    document.getElementById('onlinePayBtn').classList.toggle('selected', type === 'Online');
    document.getElementById('codPayBtn').classList.toggle('selected', type === 'COD');
    document.getElementById('qrSection').style.display = (type === 'Online') ? "block" : "none";
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

async function placeOrder() {
    const n = document.getElementById('custName').value, p = document.getElementById('custPhone').value, a = document.getElementById('custAddress').value;
    if(!n || !p || !a) { alert("Fill all details!"); return; }
    try {
        await db.collection("orders").add({
            product: selectedProduct, customerName: n, customerPhone: p, customerAddress: a,
            paymentMode: selectedPayment, orderTime: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Order Success!");
        closeModal();
    } catch (e) { alert(e.message); }
}

// --- 4. VENDOR FUNCTIONS (WITH AUTO-POST) ---
async function uploadToFirebase() {
    const n = document.getElementById('pName').value, pr = document.getElementById('pPrice').value, 
          cat = document.getElementById('pCategory').value, f = document.getElementById('pImage').files[0],
          cod = document.getElementById('pCod').checked;

    if(!f || !n || !pr) { alert("Details dalo bhai!"); return; }
    
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = async () => {
        const imageData = reader.result;
        try {
            await db.collection("products").add({
                name: n, price: pr, category: cat, image: imageData, inStock: true, codAllowed: cod,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 🔥 TRIGGER TELEGRAM
            await postToTelegram(n, pr, imageData);

            alert("Product Live on Website & Telegram!");
            window.location.href = "home.html";
        } catch (err) {
            alert("Error: " + err.message);
        }
    };
}

async function loadInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    const snap = await db.collection("products").orderBy("timestamp", "desc").get();
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `<div class="item"><span>${d.name}</span><button onclick="toggleStock('${doc.id}', ${d.inStock !== false})">${d.inStock !== false ? 'In Stock' : 'Out of Stock'}</button></div>`;
    });
}

async function toggleStock(id, status) {
    await db.collection("products").doc(id).update({ inStock: !status });
    loadInventory();
}

window.onload = () => {
    if (document.getElementById('product-grid')) loadProducts();
    if (document.getElementById('inventory-list')) loadInventory();
};
