// ownerpanel.js - Owner panel functionality (clean implementation)

// ownerpanel.js - Owner panel functionality (clean implementation)

const OWNER_USERNAME = 'NaYanRajput';
const OWNER_PASSWORD = 'Nayan_953787';
const API_BASE = '/api';

let selectedFiles = [];

// Elements
const loginScreen = document.getElementById('loginScreen');
const ownerPanel = document.getElementById('ownerPanel');
const ownerLoginForm = document.getElementById('ownerLoginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const productForm = document.getElementById('productForm');
const productImages = document.getElementById('productImages');
const imagePreview = document.getElementById('imagePreview');
const productsList = document.getElementById('productsList');

// Helpers
function showLoginScreen() {
  loginScreen.style.display = 'flex';
  ownerPanel.style.display = 'none';
}

function showOwnerPanel() {
  loginScreen.style.display = 'none';
  ownerPanel.style.display = 'block';
}

function setLoggedIn(flag) {
  if (flag) localStorage.setItem('ownerPanelLoggedIn', 'true');
  else localStorage.removeItem('ownerPanelLoggedIn');
}

function isLoggedIn() {
  return localStorage.getItem('ownerPanelLoggedIn') === 'true';
}

// Prevent reference errors from older code that called this
function checkLoginStatus() {
  if (isLoggedIn()) {
    showOwnerPanel();
    initOwnerPanelUI();
  } else {
    showLoginScreen();
  }
}

// Login handling
ownerLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('ownerUsername').value.trim();
  const password = document.getElementById('ownerPassword').value.trim();

  // Allow changing the admin password via Settings (stored in localStorage)
  const storedPwd = localStorage.getItem('ownerPanelPassword');
  const validPassword = storedPwd ? storedPwd : OWNER_PASSWORD;

  if (username === OWNER_USERNAME && password === validPassword) {
    setLoggedIn(true);
    loginError.style.display = 'none';
    showOwnerPanel();
    initOwnerPanelUI();
  } else {
    loginError.style.display = 'block';
    setTimeout(() => loginError.style.display = 'none', 3000);
  }
});

logoutBtn.addEventListener('click', () => {
  if (!confirm('Are you sure you want to logout?')) return;
  setLoggedIn(false);
  showLoginScreen();
});

// Image preview handling (read files as data URLs)
productImages.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  selectedFiles = files.slice();
  renderImagePreviews();
});

function renderImagePreviews() {
  imagePreview.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:80px;height:80px;border-radius:6px;overflow:hidden;background:#e5e7eb;position:relative;margin-right:6px;display:inline-block;';
    const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '✕';
    btn.style.cssText = 'position:absolute;top:4px;right:4px;background:#ff4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;';
    btn.addEventListener('click', () => { selectedFiles.splice(idx,1); renderImagePreviews(); });
    wrapper.appendChild(img); wrapper.appendChild(btn); imagePreview.appendChild(wrapper);
  });
}

// Add product via public endpoint (dev) — controller generates static page automatically
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) return alert('Please login first');

  const title = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value.trim() || 'product';
  const price = parseFloat(document.getElementById('productPrice').value) || 0;
  const stock = parseInt(document.getElementById('productStock').value) || 0;
  const description = document.getElementById('productDescription').value.trim();
  const sizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);

  if (!title || !price) return alert('Please provide title and price');
  if (!selectedFiles || selectedFiles.length === 0) return alert('Please select at least one image');

  // Client-side file size check (sum of file sizes)
  const totalBytes = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB total by default
  if (totalBytes > MAX_BYTES) return alert('Total images size exceeds 5MB. Please select smaller images.');

  const sku = 'SKU' + Date.now();
  const form = new FormData();
  form.append('title', title);
  form.append('description', description);
  form.append('price', String(price));
  form.append('compare_at_price', '');
  form.append('category', category);
  form.append('sku', sku);
  form.append('stock', String(stock));
  // append sizes as JSON string
  form.append('sizes', JSON.stringify(sizes));
  // append files
  selectedFiles.forEach((file, idx) => {
    form.append('images', file, file.name || (`image${idx}.jpg`));
  });

  try {
    let res = await fetch('/api/public/product', { method: 'POST', body: form });
    // If server indicates multipart not implemented (multer missing), fallback to JSON base64 upload
    if (res.status === 501) {
      // convert files to base64 data URLs
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Images = [];
      for (const f of selectedFiles) {
        // eslint-disable-next-line no-await-in-loop
        base64Images.push(await toBase64(f));
      }
      const payload = {
        title,
        description,
        price,
        compare_at_price: null,
        category,
        images: base64Images,
        sku,
        stock,
        sizes
      };
      res = await fetch('/api/public/product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!res.ok) {
      if (res.status === 413) throw new Error('Payload Too Large (413)');
      throw new Error('Failed to add product');
    }
    // refresh inventory and clear form
    productForm.reset(); selectedFiles = []; imagePreview.innerHTML = '';
    document.getElementById('successMessage').style.display = 'block';
    setTimeout(() => document.getElementById('successMessage').style.display = 'none', 3000);
    await loadProducts();
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('Payload Too Large')) {
      alert('Upload failed: images are too large for the server. Reduce image size or upload fewer images.');
    } else {
      alert('Error adding product');
    }
  }
});

// Load products for inventory view
async function loadProducts() {
  try {
    const res = await fetch('/api/public/products?limit=500');
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.value || body);
    productsList.innerHTML = '';
    if (!items || items.length === 0) {
      productsList.innerHTML = '<p>No products added yet.</p>';
      return;
    }
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;';
    items.forEach(p => {
      const card = document.createElement('div'); card.style.cssText = 'background:white;padding:12px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);';
      card.innerHTML = `
        <div style="height:160px;overflow:hidden;border-radius:6px;margin-bottom:8px;background:#f3f4f6"><img src="${p.images?.[0]||''}" style="width:100%;height:100%;object-fit:cover"/></div>
        <h3 style="font-size:14px;margin:0 0 6px 0">${p.title}</h3>
        <div style="font-weight:700">₹${p.price}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:6px">Stock: ${p.stock||0}</div>
      `;
      grid.appendChild(card);
    });
    productsList.appendChild(grid);
  } catch (e) { console.error('Failed loading products', e); productsList.innerHTML = '<p>Error loading products</p>'; }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) { showOwnerPanel(); loadProducts(); } else { showLoginScreen(); }
});

// --- Owner Panel Navigation & Sections ---
function ensureSection(id, title) {
  let sec = document.getElementById(id);
  if (!sec) {
    sec = document.createElement('div');
    sec.id = id;
    sec.className = 'owner-section';
    sec.style.display = 'none';
    const h = document.createElement('h2'); h.textContent = title; h.style.marginTop = '0';
    sec.appendChild(h);
    ownerPanel.appendChild(sec);
  }
  return sec;
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/public/products?limit=500');
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : (body.value || body);
  } catch (e) { return []; }
}

async function renderInventory() {
  const sec = ensureSection('inventorySection','Manage Inventory');
  sec.innerHTML = '<h2>Manage Inventory</h2>';
  const items = await fetchProducts();
  if (!items || items.length === 0) {
    sec.innerHTML += '<p>No products found.</p>';
    return;
  }
  const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;';
  items.forEach(p => {
    const card = document.createElement('div'); card.style.cssText = 'background:#fff;padding:10px;border-radius:8px;border:1px solid #eee;';
    card.innerHTML = `
      <div style="height:140px;overflow:hidden;border-radius:6px;margin-bottom:8px;background:#f3f4f6"><img src="${p.images?.[0]||''}" style="width:100%;height:100%;object-fit:cover"/></div>
      <div style="font-weight:600;margin-bottom:6px">${p.title}</div>
      <div style="color:#111;font-weight:700">₹${p.price}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:6px">Stock: ${p.stock||0}</div>
      <div style="margin-top:8px"><button data-sku="${p.sku||p.id}" class="btn-edit" style="margin-right:8px">Edit</button><button data-sku="${p.sku||p.id}" class="btn-delete">Delete</button></div>
    `;
    grid.appendChild(card);
  });
  sec.appendChild(grid);

  // attach handlers (delete will try API delete or fallback to alert)
  sec.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const sku = btn.dataset.sku;
      if (!confirm('Delete product ' + sku + '?')) return;
      try {
        const res = await fetch('/api/public/product/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku })
        });
        if (res.ok) { alert('Deleted'); await renderInventory(); }
        else alert('Delete failed');
      } catch (err) { alert('Delete not available on this server'); }
    });
  });
}

async function renderOrders() {
  const sec = ensureSection('ordersSection','Orders');
  sec.innerHTML = '<h2>Orders</h2>';
  try {
    const res = await fetch('/api/orders?limit=200');
    if (!res.ok) { sec.innerHTML += '<p>No orders API available.</p>'; return; }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { sec.innerHTML += '<p>No orders found.</p>'; return; }
    const table = document.createElement('table'); table.style.width='100%'; table.innerHTML = '<thead><tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>';
    const tbody = document.createElement('tbody');
    data.forEach(o => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${o.id||o._id||o.orderId||''}</td><td>${o.created_at||o.date||''}</td><td>₹${o.total||o.amount||0}</td><td>${o.status||'—'}</td>`; tbody.appendChild(tr); });
    table.appendChild(tbody); sec.appendChild(table);
  } catch (e) { sec.innerHTML += '<p>Error loading orders.</p>'; }
}

async function renderCustomers() {
  const sec = ensureSection('customersSection','Customers');
  sec.innerHTML = '<h2>Customers</h2>';
  try {
    const res = await fetch('/api/customers?limit=200');
    if (!res.ok) { sec.innerHTML += '<p>No customers API available.</p>'; return; }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { sec.innerHTML += '<p>No customers found.</p>'; return; }
    const ul = document.createElement('ul'); data.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.name||c.fullName||c.email||''} — ${c.email||''}`; ul.appendChild(li); }); sec.appendChild(ul);
  } catch (e) { sec.innerHTML += '<p>Error loading customers.</p>'; }
}

function renderReports() {
  const sec = ensureSection('reportsSection','Sales Reports');
  sec.innerHTML = '<h2>Sales Reports</h2><p>Generating summary from available data...</p>';
  // Try to summarize from orders endpoint, otherwise from products
  (async () => {
    try {
      const res = await fetch('/api/orders?limit=500');
      if (res.ok) {
        const orders = await res.json();
        const total = orders.reduce((s,o)=>s+(o.total||o.amount||0),0);
        sec.innerHTML = `<p>Total orders: ${orders.length}</p><p>Total revenue: ₹${total}</p>`;
        return;
      }
    } catch (e) {}
    // Fallback: summarize products
    const products = await fetchProducts();
    const totalItems = products.length;
    const totalStock = products.reduce((s,p)=>(s+(p.stock||0)),0);
    const estValue = products.reduce((s,p)=>(s+((p.stock||0)*(p.price||0))),0);
    sec.innerHTML = `<p>Total products: ${totalItems}</p><p>Total stock units: ${totalStock}</p><p>Estimated inventory value: ₹${estValue}</p>`;
  })();
}

function renderSettings() {
  const sec = ensureSection('settingsSection','Settings');
  sec.innerHTML = '<h2>Settings</h2>';
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="max-width:520px">
      <label style="display:block;margin-bottom:8px">Change Owner Panel Password</label>
      <input id="newOwnerPwd" type="password" style="width:100%;padding:8px;margin-bottom:8px" placeholder="New password (leave blank to keep)">
      <button id="saveOwnerPwd">Save Password</button>
      <hr style="margin:12px 0">
      <label style="display:block;margin-bottom:8px">Theme</label>
      <select id="themeSelect"><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select>
    </div>
  `;
  sec.appendChild(container);
  const saveBtn = sec.querySelector('#saveOwnerPwd');
  saveBtn.addEventListener('click', () => {
    const v = sec.querySelector('#newOwnerPwd').value.trim();
    if (!v) { alert('Password not changed'); return; }
    localStorage.setItem('ownerPanelPassword', v);
    alert('Saved. Use new password next login.');
    sec.querySelector('#newOwnerPwd').value='';
  });
  const themeSelect = sec.querySelector('#themeSelect');
  const cur = localStorage.getItem('siteTheme') || 'auto';
  themeSelect.value = cur;
  themeSelect.addEventListener('change', () => { localStorage.setItem('siteTheme', themeSelect.value); alert('Theme preference saved'); });
}

function initOwnerPanelUI() {
  // create nav if missing
  let nav = ownerPanel.querySelector('.owner-nav');
  if (!nav) {
    nav = document.createElement('div'); nav.className = 'owner-nav'; nav.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap';
    nav.innerHTML = `
      <a href="#" data-section="inventorySection">Manage Inventory</a>
      <a href="#" data-section="ordersSection">Orders</a>
      <a href="#" data-section="reportsSection">Sales Reports</a>
      <a href="#" data-section="customersSection">Customers</a>
      <a href="#" data-section="settingsSection">Settings</a>
    `;
    ownerPanel.insertBefore(nav, ownerPanel.firstChild);
  }
  // attach handlers
  nav.querySelectorAll('a[data-section]').forEach(a => {
    a.style.cursor = 'pointer';
    a.addEventListener('click', (e) => { e.preventDefault(); showSection(a.dataset.section); nav.querySelectorAll('a').forEach(x=>x.classList.remove('active')); a.classList.add('active'); });
  });

  // ensure sections exist and render default
  ensureSection('inventorySection','Manage Inventory');
  ensureSection('ordersSection','Orders');
  ensureSection('reportsSection','Sales Reports');
  ensureSection('customersSection','Customers');
  ensureSection('settingsSection','Settings');
  // show inventory by default
  showSection('inventorySection');
  renderInventory();
}

function showSection(id) {
  const secs = ownerPanel.querySelectorAll('.owner-section');
  secs.forEach(s => s.style.display = 'none');
  const target = document.getElementById(id);
  if (target) target.style.display = 'block';
  // lazy render for some sections
  if (id === 'inventorySection') renderInventory();
  if (id === 'ordersSection') renderOrders();
  if (id === 'reportsSection') renderReports();
  if (id === 'customersSection') renderCustomers();
  if (id === 'settingsSection') renderSettings();
}

// if user already logged in when page loaded, init UI
if (isLoggedIn()) {
  // call after a short delay to ensure DOM placement
  setTimeout(() => { showOwnerPanel(); initOwnerPanelUI(); }, 100);
}
