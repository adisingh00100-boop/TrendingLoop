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

// --- 2. VENDOR UPLOAD WITH TELEGRAM SHARE ---
async function uploadToFirebase() {
    const pName = document.getElementById('pName').value;
    const pPrice = document.getElementById('pPrice').value;
    const pCategory = document.getElementById('pCategory').value;
    const pFile = document.getElementById('pImage').files[0];
    const isCod = document.getElementById('pCod').checked;

    if(!pFile || !pName || !pPrice) { 
        alert("Please fill all details!"); 
        return; 
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(pFile);
    reader.onload = async () => {
        const imageData = reader.result;
        try {
            // Save to Firebase
            await db.collection("products").add({
                name: pName, 
                price: pPrice, 
                category: pCategory, 
                image: imageData, 
                inStock: true, 
                codAllowed: isCod,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // ASK TO SHARE ON TELEGRAM
            const confirmShare = confirm("Product Uploaded Successfully! ✅\n\nDo you want to share this on your Telegram Channel/Group?");
            
            if (confirmShare) {
                const websiteUrl = "https://trending-loop.github.io/trending-loop/";
                const shareText = encodeURIComponent(
                    `🚀 *NEW PRODUCT ALERT!*\n\n` +
                    `🛍️ *Item:* ${pName}\n` +
                    `💰 *Price:* ₹${pPrice}\n\n` +
                    `🔗 Click here to buy: ${websiteUrl}`
                );
                
                // This opens Telegram Share Menu
                window.open(`https://t.me/share/url?url=${websiteUrl}&text=${shareText}`, '_blank');
            }

            alert("Done!");
            window.location.href = "home.html";
        } catch (err) { 
            alert("Error: " + err.message); 
        }
    };
}

// --- 3. CUSTOMER SIDE FUNCTIONS ---
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
    document.getElementById('orderModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

async function placeOrder() {
    const n = document.getElementById('custName').value;
    const p = document.getElementById('custPhone').value;
    const a = document.getElementById('custAddress').value;
    if(!n || !p || !a) { alert("Please fill all details!"); return; }
    try {
        await db.collection("orders").add({
            product: selectedProduct, 
            customerName: n, 
            customerPhone: p, 
            customerAddress: a,
            orderTime: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Order Placed Successfully!");
        closeModal();
    } catch (e) { alert(e.message); }
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
