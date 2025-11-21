// Profile page JavaScript - modular, uses fetch helpers and updates UI
(function(){
    'use strict';

    async function apiFetch(path, options = {}){
        const opts = { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', ...(options.headers||{}) }, credentials: 'include' };
        if (options.body) opts.body = JSON.stringify(options.body);
        const res = await fetch('/api' + path, opts);
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : await res.text();
        if (!res.ok){
            if (res.status === 401){
                localStorage.removeItem('site-access-token');
                localStorage.removeItem('site-refresh-token');
                window.location.href = '/htmls/loginpage.html';
            }
            const msg = (data && data.message) ? data.message : 'Request failed';
            throw new Error(msg);
        }
        return data;
    }

    function authHeaders(){
        try{ const t = localStorage.getItem('site-access-token'); if (t) return { Authorization: 'Bearer ' + t }; }catch(e){}
        return {};
    }

    function showMessage(msg, type='success'){
        const el = document.getElementById('message');
        if(!el) return;
        el.textContent = msg;
        el.className = 'message ' + type;
        el.style.display = 'block';
        setTimeout(()=> el.style.display = 'none', 4000);
    }

    function switchTab(tab){
        document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
        const tEl = document.getElementById(tab);
        if (tEl) tEl.classList.add('active');
        // highlight button containing same word
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tab.substring(0,3))) btn.classList.add('active');
        });
        if (tab === 'orders') loadOrders();
        else if (tab === 'addresses') loadAddresses();
        else if (tab === 'profile') loadProfile();
    }

    async function loadProfile(){
        const container = document.getElementById('profileView');
        try{
            const user = await apiFetch('/users/me', { headers: authHeaders() });
            container.innerHTML = `
                <div class="form-group"><label>Name:</label><div style="padding:10px;background:#222;border-radius:5px;border:1px solid #444">${user.name||'N/A'}</div></div>
                <div class="form-group"><label>Email:</label><div style="padding:10px;background:#222;border-radius:5px;border:1px solid #444">${user.email||'N/A'}</div></div>
                <div class="form-group"><label>Phone:</label><div style="padding:10px;background:#222;border-radius:5px;border:1px solid #444">${user.phone||'N/A'}</div></div>
                <div class="form-group"><label>Email Verified:</label><div style="padding:10px;background:#222;border-radius:5px;border:1px solid #444">${user.isVerified?'<span style="color:var(--accent)"><i class="fas fa-check"></i> Verified</span>':'<span style="color:#ff9800"><i class="fas fa-clock"></i> Pending</span>'}</div></div>
                <button class="btn btn-edit" id="btnEditProfile"><i class="fas fa-edit"></i> Edit Profile</button>
            `;
            const btnEdit = document.getElementById('btnEditProfile');
            if (btnEdit) {
                btnEdit.addEventListener('click', () => openEditProfileModal(user.name||'', user.email||'', user.phone||''));
            }
        }catch(err){
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i> ${err.message}</div>`;
        }
    }

    async function loadOrders(){
        const container = document.getElementById('ordersView');
        try{
            const orders = await apiFetch('/orders/my-orders', { headers: authHeaders() });
            if (!orders || orders.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> No orders yet</div>'; return; }
            const html = orders.map(order => `
                <div class="order-card">
                    <div class="order-header"><div class="order-id">Order #${(order.id||'').substring(0,8)}</div><div class="order-status status-${order.status||'pending'}">${order.status||'Pending'}</div></div>
                    <div class="order-details"><div><strong>Date:</strong> ${new Date(order.createdAt||Date.now()).toLocaleDateString()}</div><div><strong>Total:</strong> ₹${(order.totalPrice||0).toFixed(2)}</div><div><strong>Items:</strong> ${order.items?.length||0}</div></div>
                </div>
            `).join('');
            container.innerHTML = html;
        }catch(err){ container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i> ${err.message}</div>`; }
    }

    async function loadAddresses(){
        const container = document.getElementById('addressesView');
        try{
            const user = await apiFetch('/users/me', { headers: authHeaders() });
            const addresses = user.addresses||[];
            if (!addresses.length){ container.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i> No addresses saved yet</div>'; return; }
            const html = addresses.map((addr, idx) => `
                <div class="address-card">
                    <div class="address-label">${addr.label||'Address '+(idx+1)}</div>
                    <div class="address-text"><div><strong>${addr.name}</strong> | ${addr.phone}</div><div>${addr.street||''}</div><div>${addr.city}, ${addr.state} ${addr.postalCode||''}</div><div>${addr.country||''}</div></div>
                    <div class="address-actions"><button class="btn btn-edit" data-addr='${encodeURIComponent(JSON.stringify(addr))}' >Edit</button><button class="btn btn-delete" data-id='${addr.id}'>Delete</button></div>
                </div>
            `).join('');
            container.innerHTML = html;
            // attach handlers
            container.querySelectorAll('.btn.btn-edit').forEach(b=> {
                b.addEventListener('click', ()=> {
                    try{
                        const obj = JSON.parse(decodeURIComponent(b.dataset.addr));
                        editAddress(obj);
                    }catch(e){ console.error('failed to parse address data', e); }
                });
            });
            container.querySelectorAll('.btn.btn-delete').forEach(b=> b.addEventListener('click', ()=> deleteAddress(b.dataset.id)));
        }catch(err){ container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i> ${err.message}</div>`; }
    }

    function openEditProfileModal(name,email,phone){
        document.getElementById('editName').value = name;
        document.getElementById('editEmail').value = email;
        document.getElementById('editPhone').value = phone;
        document.getElementById('editProfileModal').classList.add('active');
    }

    function closeEditProfileModal(){ document.getElementById('editProfileModal').classList.remove('active'); }

    function openAddAddressForm(){
        document.getElementById('addressForm').reset();
        document.getElementById('addressForm').dataset.id = '';
        document.getElementById('addressModal').classList.add('active');
    }

    function closeAddressModal(){ document.getElementById('addressModal').classList.remove('active'); }

    async function deleteAddress(id){ if (!confirm('Delete this address?')) return; try{ await apiFetch(`/users/addresses/${id}`, { method:'DELETE', headers: authHeaders() }); showMessage('Address deleted!', 'success'); loadAddresses(); }catch(err){ showMessage('Error: '+err.message,'error'); } }

    function editAddress(addr){
        document.getElementById('addressLabel').value = addr.label||'';
        document.getElementById('addressName').value = addr.name||'';
        document.getElementById('addressPhone').value = addr.phone||'';
        document.getElementById('addressPincode').value = addr.postalCode||'';
        document.getElementById('addressCity').value = addr.city||'';
        document.getElementById('addressState').value = addr.state||'';
        document.getElementById('addressStreet').value = addr.street||'';
        document.getElementById('addressCountry').value = addr.country||'India';
        document.getElementById('addressForm').dataset.id = addr.id||'';
        document.getElementById('addressModal').classList.add('active');
    }

    // form submits
    document.addEventListener('DOMContentLoaded', ()=>{
        document.getElementById('editProfileForm').addEventListener('submit', async (e)=>{
            e.preventDefault();
            try{
                await apiFetch('/users/me', { method:'PATCH', headers: authHeaders(), body: { name: document.getElementById('editName').value, email: document.getElementById('editEmail').value, phone: document.getElementById('editPhone').value } });
                showMessage('Profile updated successfully!','success'); closeEditProfileModal(); loadProfile();
            }catch(err){ showMessage('Error: '+err.message,'error'); }
        });

        document.getElementById('addressForm').addEventListener('submit', async (e)=>{
            e.preventDefault();
            const id = e.target.dataset.id;
            const body = { label: document.getElementById('addressLabel').value, name: document.getElementById('addressName').value, phone: document.getElementById('addressPhone').value, postalCode: document.getElementById('addressPincode').value, city: document.getElementById('addressCity').value, state: document.getElementById('addressState').value, street: document.getElementById('addressStreet').value, country: document.getElementById('addressCountry').value };
            try{
                await apiFetch('/users/me/address', { method: 'POST', headers: authHeaders(), body });
                showMessage('Address saved successfully!','success'); closeAddressModal(); loadAddresses();
            }catch(err){ showMessage('Error: '+err.message,'error'); }
        });

        // tab buttons (attach handlers if inline handlers aren't available)
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', ()=> switchTab(btn.dataset.tab || btn.textContent.trim().toLowerCase().split(' ')[0])));

        // Add address button handler by id (reliable)
        const addBtn = document.getElementById('addAddressBtn');
        if(addBtn) addBtn.addEventListener('click', (e)=> { e.preventDefault(); openAddAddressForm(); });

        // logout button (attach here to avoid inline onclick)
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', ()=> { window.logout && window.logout(); });

        // modal cancel buttons (close their closest backdrop)
        document.querySelectorAll('.modal .btn-cancel').forEach(btn => btn.addEventListener('click', (e)=>{
            const bd = btn.closest('.modal-backdrop'); if (bd) bd.classList.remove('active');
        }));

        // modal close on backdrop click
        document.getElementById('editProfileModal').addEventListener('click', (e)=>{ if (e.target === e.currentTarget) closeEditProfileModal(); });
        document.getElementById('addressModal').addEventListener('click', (e)=>{ if (e.target === e.currentTarget) closeAddressModal(); });

        // initial load
        const token = localStorage.getItem('site-access-token');
        if (!token) { window.location.href = '/htmls/loginpage.html'; return; }
        const hash = window.location.hash.substring(1) || 'profile';
        switchTab(hash);
        window.addEventListener('hashchange', ()=>{ const h = window.location.hash.substring(1) || 'profile'; if (['profile','orders','addresses'].includes(h)) switchTab(h); });
    });

    // expose small helpers for inline handlers if any
    window.openAddAddressForm = openAddAddressForm;
    window.logout = function(){ localStorage.removeItem('site-access-token'); localStorage.removeItem('site-refresh-token'); localStorage.removeItem('site-logged-in'); window.location.href = '/htmls/loginpage.html'; };
    // expose modal/tab helpers so inline onclick in HTML still works
    window.switchTab = switchTab;
    window.openEditProfileModal = openEditProfileModal;
    window.closeEditProfileModal = closeEditProfileModal;
    window.closeAddressModal = closeAddressModal;

})();