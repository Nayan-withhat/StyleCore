// main.js - interactivity for main.html
(function(){
  // Helpers
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  
  // Cart functionality
  const cart = {
    items: [],
    total: 0,
    add(item) {
      this.items.push(item);
      this.updateTotal();
      this.updateUI();
    },
    remove(itemId) {
      this.items = this.items.filter(item => item.id !== itemId);
      this.updateTotal();
      this.updateUI();
    },
    updateTotal() {
      this.total = this.items.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.quantity || 1))), 0);
    },
    updateUI() {
      const cartIcon = $('a[href="#cart"] i');
      if (cartIcon && this.items.length > 0) {
        cartIcon.setAttribute('data-count', this.items.length);
      }
    },
    clear() {
      this.items = [];
      this.total = 0;
      this.updateUI();
    }
  };

  // Expose cart to the global scope so inline handlers (onclick="cart.remove(...)") work
  try { window.cart = cart; } catch (e) { /* ignore in restrictive environments */ }

  // Search functionality
  const search = {
    isOpen: false,
    toggle() {
      this.isOpen = !this.isOpen;
      const searchIcon = $('a[href="#search"]');
      if (searchIcon) {
        if (this.isOpen) {
          this.showSearchBar();
        } else {
          this.hideSearchBar();
        }
      }
    },
    showSearchBar() {
      const nav = $('.desktop-nav, .mobile-nav');
      if (!$('.search-bar')) {
        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';
        searchBar.innerHTML = `
          <input type="search" placeholder="Search products...">
          <button class="search-close"><i class="fa-solid fa-x"></i></button>
        `;
        nav.appendChild(searchBar);
        
        // Focus the input
        searchBar.querySelector('input').focus();
        
        // Close on escape or close button
        searchBar.querySelector('.search-close').onclick = () => this.toggle();
      }
    },
    hideSearchBar() {
      const searchBar = $('.search-bar');
      if (searchBar) {
        searchBar.remove();
      }
    }
  };

  // Mobile menu open/close
  const menuBtn = $('.mobile-nav .menu');
  const menuDropdown = $('.mobile-nav .menu .menu-dropdown');
  const menuIcons = $('.mobile-nav .menu .menu-icons');
  
  function closeMenu() {
    menuDropdown.classList.remove('open');
    menuBtn.classList.remove('active');
    document.body.style.overflow = ''; // Enable scrolling
  }

  function openMenu() {
    menuDropdown.classList.add('open');
    menuBtn.classList.add('active');
    document.body.style.overflow = 'hidden'; // Disable scrolling
  }

  if(menuBtn && menuDropdown){
    // Toggle menu on hamburger icon click
    menuIcons.addEventListener('click', (e)=>{
      e.stopPropagation(); // Prevent event bubbling
      if(!menuDropdown.classList.contains('open')){
        openMenu();
      }
    });

    // Close menu when clicking the close button
    const closeButton = $('.menu-dropdown .close-menu');
    if(closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
      });
    }

    // Close menu when clicking on the overlay (outside the menu)
    menuDropdown.addEventListener('click', (ev)=>{
      // Check if click is on the overlay and not on menu content
      if(!ev.target.closest('.top') && !ev.target.closest('.bottom') && !ev.target.closest('.menu-header')) {
        closeMenu();
      }
    });

    // Close menu when clicking menu items
    $$('.menu-dropdown a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });
  }

  // Profile/login register toggle simulation
  // Profile/login register toggle (simulated auth state)
  let loggedIn = false;
  function setLoggedIn(v){
    loggedIn = !!v;
    // persist state for page reloads (simple simulation)
    try { localStorage.setItem('site-logged-in', loggedIn ? '1' : '0'); } catch(e) {}
    // toggle all matching UI blocks
    $$('.login-register-before').forEach(el=> el.style.display = loggedIn ? 'none' : 'block');
    $$('.login-register-after').forEach(el=> el.style.display = loggedIn ? 'block' : 'none');
    // update greeting with saved name if available
    let label = 'StyleCore';
    try {
      const n = localStorage.getItem('site-user-name');
      if (loggedIn && n) label = `Hello, ${n}`;
      else if (loggedIn) label = 'Hello';
    } catch(e){ if (loggedIn) label = 'Hello'; }
    $$('.pfp-name span').forEach(el=> el.textContent = label);
  }
  // Initialize from persisted state if available
  const persisted = (function(){ try { return localStorage.getItem('site-logged-in'); } catch(e){ return null; } })();
  setLoggedIn(persisted === '1');

  // Clicking Login/Register inside nav (either mobile or desktop) will simulate login
  $$("a[href='#login'], a[href='#register']").forEach(a=>{
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      setLoggedIn(true);
    });
  });
  // Logout
  $$("#Logout, a[href='#logout']").forEach(a=>{
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      setLoggedIn(false);
      // close any open dropdowns
      if(menuDropdown) menuDropdown.classList.remove('open');
    });
  });

  // Dark / Light mode toggle
  const darkToggleLinks = $$('a[href="#dark-light"]');
  function applyTheme(dark){
    if(dark){
      document.body.classList.add('dark');
      localStorage.setItem('site-theme','dark');
      // Update icons visibility
      $$('.darkmod').forEach(el => el.style.display = 'none');
      $$('.lightmod').forEach(el => el.style.display = 'flex');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('site-theme','light');
      // Update icons visibility
      $$('.darkmod').forEach(el => el.style.display = 'flex');
      $$('.lightmod').forEach(el => el.style.display = 'none');
    }
  }
  // Initialize from localStorage
  const saved = localStorage.getItem('site-theme');
  applyTheme(saved === 'dark');
  darkToggleLinks.forEach(a=> a.addEventListener('click', (e)=>{
    e.preventDefault();
    applyTheme(!document.body.classList.contains('dark'));
  }));

  // Expose applyTheme for other scripts to reuse (unify theme toggling)
  try { window.applySiteTheme = applyTheme; } catch(e) {}

  // Close mobile menu when clicking a link inside it
  $$('.menu-dropdown a').forEach(a=> a.addEventListener('click', ()=>{
    if(menuDropdown) menuDropdown.classList.remove('open');
  }));

  // Product Navigation
  const productNav = {
    init() {
      this.setupDropdownDelays();
      this.setupMobileNav();
      this.setupDesktopNav();
    },
    setupDropdownDelays() {
      let timeout;
      // Handle main menu items
      $$('.products-links li, .other li').forEach(li => {
        const dropdown = li.querySelector('ul');
        if (!dropdown) return;

        li.addEventListener('mouseenter', () => {
          clearTimeout(timeout);
          // Close all other dropdowns
          $$('.products-links li ul, .other li ul').forEach(otherDropdown => {
            if (otherDropdown !== dropdown) {
              otherDropdown.style.display = 'none';
              otherDropdown.style.opacity = '0';
            }
          });
          
          // Show current dropdown
          dropdown.style.display = 'block';
          dropdown.style.opacity = '0';
          dropdown.style.transform = 'translateX(-10px)';
          requestAnimationFrame(() => {
            dropdown.style.transition = 'all 0.2s ease-out';
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateX(0)';
          });
        });
        
        // Add event listeners to both parent li and dropdown
        [li, dropdown].forEach(element => {
          element.addEventListener('mouseleave', (e) => {
            // Check if mouse moved to the dropdown or parent li
            const relatedTarget = e.relatedTarget;
            if (dropdown.contains(relatedTarget) || li.contains(relatedTarget)) {
              return;
            }
            
            timeout = setTimeout(() => {
              dropdown.style.opacity = '0';
              dropdown.style.transform = 'translateX(-10px)';
              setTimeout(() => {
                dropdown.style.display = 'none';
              }, 200);
            }, 100);
          });
        });
      });
    },
    setupMobileNav() {
      $$('.mobile-nav .rightside a').forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (href === '#search') {
            e.preventDefault();
            search.toggle();
          } else if (href === '#cart') {
            e.preventDefault();
            this.showCart();
          }
        });
      });
    },
    setupDesktopNav() {
      $$('.desktop-nav .products-links a').forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (href.startsWith('#')) {
            e.preventDefault();
            this.handleNavigation(href.substring(1));
          }
        });
      });

      // Desktop: open cart when clicking cart icon/link
      $$('.desktop-nav a[href="#cart"]').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.showCart();
        });
      });
    },
    showCart() {
      // Create and show cart overlay
      const cartOverlay = document.createElement('div');
      cartOverlay.className = 'cart-overlay';
      cartOverlay.innerHTML = `
        <div class="cart-panel">
          <div class="cart-header">
            <h3>Your Cart (${cart.items.length})</h3>
            <button class="close-cart"><i class="fa-solid fa-x"></i></button>
          </div>
          <div class="cart-items">
            ${cart.items.length ? this.renderCartItems() : '<p>Your cart is empty</p>'}
          </div>
          <div class="cart-footer">
            <div class="cart-total">Total: ₹${Number(cart.total).toFixed(2)}</div>
            <button class="checkout-btn" ${cart.items.length ? '' : 'disabled'}>
              Checkout • ₹${Number(cart.total).toFixed(2)}
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(cartOverlay);
      
      // Handle close
      cartOverlay.querySelector('.close-cart').onclick = () => cartOverlay.remove();
      cartOverlay.onclick = (e) => {
        if (e.target === cartOverlay) cartOverlay.remove();
      };
    },
    renderCartItems() {
      return cart.items.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}">
          <div class="item-details">
            <h4>${item.name}</h4>
            <p>₹${Number(item.price).toFixed(2)}</p>
          </div>
          <button data-remove-id="${item.id}" onclick="cart.remove('${item.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `).join('');
    },
    handleNavigation(section) {
      // Add loading state
      document.body.classList.add('loading');
      
      // Simulate loading content
      setTimeout(() => {
        document.body.classList.remove('loading');
        // You would typically fetch and render content here
        console.log('Navigated to:', section);
      }, 500);
    }
  };

  // Initialize product navigation
  productNav.init();

  // Restore cart from backend (preferred) or localStorage fallback
  (async function restoreCart() {
    try {
      const savedCartId = localStorage.getItem('site-cart-id');
      if (savedCartId) {
        const resp = await fetch(`/api/cart/${savedCartId}`);
        if (resp.ok) {
          const json = await resp.json();
          cart.items = (json.items || []).map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '', quantity: it.quantity || 1 }));
          cart.updateTotal();
          cart.updateUI();
          // Update checkout buttons
          document.querySelectorAll('.checkout-btn').forEach(cb => {
            cb.textContent = `Checkout • ₹${cart.total.toFixed(2)}`;
            cb.disabled = cart.items.length === 0;
          });
          return;
        }
      }
    } catch (e) { /* ignore and fallback */ }

    // Fallback: try old `site-cart` localStorage
    try {
      const saved = localStorage.getItem('site-cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          cart.items = parsed.map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '' }));
          cart.updateTotal();
          cart.updateUI();
          document.querySelectorAll('.checkout-btn').forEach(cb => {
            cb.textContent = `Checkout • ₹${cart.total.toFixed(2)}`;
            cb.disabled = cart.items.length === 0;
          });
        }
      }
    } catch (e) { console.warn('Could not restore cart', e); }
  })();

  // Delegate Add To Cart button clicks (support `.btn1` card buttons and `.add-to-cart` on product pages)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn1, .add-to-cart');
    if (!btn) return;

    // If it's a grid/list card with .card container, use that structure
    const card = btn.closest('.card');
    let id, rawName, price, image, quantity = 1;

    if (card) {
      const nameEl = card.querySelector('.info p') || card.querySelector('.info span') || card.querySelector('h3');
      rawName = nameEl ? nameEl.textContent.trim() : 'Product';
      const priceEl = card.querySelector('.mone h4') || card.querySelector('.info h4') || card.querySelector('h4');
      const rawPrice = priceEl ? priceEl.textContent.trim() : '';
      price = Number(String(rawPrice).replace(/[^0-9\.]/g, '')) || 0;
      image = card.querySelector('.img img') ? card.querySelector('.img img').getAttribute('src') : '';
      id = card.dataset.sku || card.getAttribute('data-id') || (`p_${Date.now()}`);
    } else {
      // Possibly on a single product page (product-detail layout)
      const productDetail = btn.closest('.product-detail') || document.querySelector('.product-detail');
      if (!productDetail) return;
      const nameH = productDetail.querySelector('.product-info-side h3');
      const descP = productDetail.querySelector('.product-info-side p');
      rawName = (nameH ? nameH.textContent.trim() : '') + (descP ? ' - ' + descP.textContent.trim() : '');
      // price: prefer .discount (shown price) else .kat (original)
      const discountEl = productDetail.querySelector('.product-info-side .discount');
      const katEl = productDetail.querySelector('.product-info-side .kat');
      const rawPrice = (discountEl ? discountEl.textContent : (katEl ? katEl.textContent : '')) || '';
      price = Number(String(rawPrice).replace(/[^0-9\.]/g, '')) || 0;
      const imgEl = productDetail.querySelector('.main-images img') || productDetail.querySelector('.product-images-side img');
      image = imgEl ? imgEl.getAttribute('src') : '';
      const qtyEl = productDetail.querySelector('#quantity');
      quantity = qtyEl ? Number(qtyEl.value || 1) : 1;
      id = productDetail.dataset.sku || productDetail.getAttribute('data-id') || (`p_${Date.now()}`);
    }

    // Try backend API (POST /api/cart expects { item, cartId } as used elsewhere)
    try {
      const payload = { item: { id, name: rawName, price, image, quantity } };
      const cartId = localStorage.getItem('site-cart-id');
      if (cartId) payload.cartId = cartId;
      const resp = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (resp.ok) {
        const json = await resp.json();
        if (json.cartId) localStorage.setItem('site-cart-id', json.cartId);
        cart.items = (json.items || []).map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '', quantity: it.quantity || 1 }));
        cart.updateTotal();
        cart.updateUI();
        document.querySelectorAll('.checkout-btn').forEach(cb => {
          cb.textContent = `Checkout • ₹${cart.total.toFixed(0)}`;
          cb.disabled = cart.items.length === 0;
        });
        try { localStorage.setItem('site-cart', JSON.stringify(cart.items)); } catch(e) {}
        return;
      }
    } catch (e) {
      console.warn('Cart API failed, falling back to localStorage', e);
    }

    // Fallback: local-only cart
    // If item already exists, increase quantity
    const existing = cart.items.find(it => it.id === id);
    if (existing) {
      existing.quantity = Number(existing.quantity || 1) + Number(quantity || 1);
    } else {
      cart.add({ id, name: rawName, price, image, quantity });
    }
    try { localStorage.setItem('site-cart', JSON.stringify(cart.items)); } catch (err) { console.warn('Could not save cart', err); }
    document.querySelectorAll('.checkout-btn').forEach(cb => {
      cb.textContent = `Checkout • ₹${cart.total.toFixed(0)}`;
      cb.disabled = cart.items.length === 0;
    });
    cart.updateUI();
  });

  // Delegated remove handler for cart overlay buttons (works even if inline onclick is malformed)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-remove-id]');
    if (!btn) return;
    const rid = btn.getAttribute('data-remove-id');
    if (!rid) return;
    // remove from cart and persist
    cart.remove(rid);
    try { localStorage.setItem('site-cart', JSON.stringify(cart.items)); } catch (err) { }
    // If a server-side cart exists, try to persist the updated cart to backend
    (async function persistRemoval(){
      try {
        const cartId = localStorage.getItem('site-cart-id');
        if (!cartId) return;
        // call the server-side remove endpoint with cartId and itemId
        const resp = await fetch('/api/cart/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartId, itemId: rid }) });
        if (resp.ok) {
          const json = await resp.json();
          // sync local snapshot from server response
          if (Array.isArray(json.items)) {
            try { localStorage.setItem('site-cart', JSON.stringify(json.items)); } catch(e) {}
            if (window.cart && Array.isArray(window.cart.items)) {
              window.cart.items = json.items.map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '', quantity: it.quantity || 1 }));
              window.cart.updateTotal();
              window.cart.updateUI();
            }
          }
        }
      } catch (err) {
        // ignore but keep local changes
        console.warn('Could not persist cart removal to server', err);
      }
    })();
    // re-render overlay if open
    const overlay = document.querySelector('.cart-overlay');
    if (overlay) {
      overlay.remove();
      if (typeof productNav !== 'undefined' && productNav && typeof productNav.showCart === 'function') {
        productNav.showCart();
      }
    }
  });

  // Checkout button handler: require login then go to checkout
  document.addEventListener('click', (e) => {
    const cb = e.target.closest('.checkout-btn');
    if (!cb) return;
    e.preventDefault();
    // if cart empty do nothing
    if (!cart.items || cart.items.length === 0) return;
    const logged = (function(){ try { return localStorage.getItem('site-logged-in') === '1' || !!localStorage.getItem('site-access-token') || !!localStorage.getItem('site-token'); } catch(e){ return false; } })();
    if (!logged) {
      // Redirect to login with return URL
      const next = encodeURIComponent('/htmls/checkout.html');
      window.location.href = `/htmls/loginpage.html?next=${next}`;
      return;
    }
    // go to checkout
    window.location.href = '/htmls/checkout.html';
  });

  // Profile link behavior: open profile dropdown on click (both desktop and mobile)
  (function setupProfileToggles(){
    const profileAnchors = $$('a[href="#profile"]');
    profileAnchors.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        // find the nearest parent li that contains the dropdown
        const li = a.closest('li');
        if (!li) return;
        const dropdown = li.querySelector('ul');
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains('open') || dropdown.style.display === 'block';
        // close other profile dropdowns (but keep product menus untouched)
        $$('.other li > ul, .mobile-nav .rightside ul, .menu-dropdown li > ul').forEach(u => {
          if (u !== dropdown) {
            u.classList.remove('open');
            u.style.display = 'none';
          }
        });

        if (isOpen) {
          dropdown.classList.remove('open');
          dropdown.style.display = 'none';
        } else {
          dropdown.classList.add('open');
          dropdown.style.display = 'block';
        }
      });
    });

    // Close profile dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[href="#profile"]') || e.target.closest('.login-register-before') || e.target.closest('.login-register-after')) return;
      $$('.other li > ul, .mobile-nav .rightside ul, .menu-dropdown li > ul').forEach(u => {
        u.classList.remove('open');
        u.style.display = 'none';
      });
    });
  })();

  // Error handling for navigation
  window.addEventListener('error', (e) => {
    console.error('Navigation error:', e);
    // Show user-friendly error message
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    errorToast.textContent = 'Something went wrong. Please try again.';
    document.body.appendChild(errorToast);
    setTimeout(() => errorToast.remove(), 3000);
  });

  // Accessibility: close menus on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (menuDropdown) menuDropdown.classList.remove('open');
      if (search.isOpen) search.toggle();
      const cartOverlay = $('.cart-overlay');
      if (cartOverlay) cartOverlay.remove();
    }
  });

  // Initialize search events
  $$('a[href="#search"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      search.toggle();
    });
  });

})();


// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', (event) => {
    
    // Select the main interactive elements using their classes
    const menuToggle = document.querySelector('.mobile-nav .menu');
    const menuDropdown = document.querySelector('.mobile-nav .menu .menu-dropdown');
    const closeMenuButton = document.querySelector('.close-menu');
    
    // Select the light/dark mode toggles
    const darkModeToggles = document.querySelectorAll('a[href="#dark-light"]');

    // Function to open the mobile menu
    function openMenu() {
        // Add 'active' to the menu container (for icon rotation/opacity)
        menuToggle.classList.add('active');
        // Add 'open' to the dropdown overlay/panel container
        menuDropdown.classList.add('open');
        // Optional: Prevent background scrolling when menu is open
        document.body.style.overflow = 'hidden'; 
    }

    // Function to close the mobile menu
    function closeMenu() {
        // Remove 'active' from the menu container
        menuToggle.classList.remove('active');
        // Remove 'open' from the dropdown overlay/panel container
        menuDropdown.classList.remove('open');
        // Optional: Restore background scrolling
        document.body.style.overflow = '';
    }

    // Add event listener to the main menu clickable area (Menu text + icons)
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            // Check if the click occurred on the "close menu" button within the panel itself, 
            // if so, let that handler deal with it.
            if (e.target.closest('.close-menu')) {
                return;
            }
            
            // Toggle menu state: if open, close it; if closed, open it.
            if (menuDropdown.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    // Add event listener to the dedicated close button inside the menu panel
    if (closeMenuButton) {
        closeMenuButton.addEventListener('click', closeMenu);
    }

    // Add event listener to the dropdown overlay itself to close when clicking outside the panel
    if (menuDropdown) {
        menuDropdown.addEventListener('click', (e) => {
            // Only close if the exact background overlay is clicked, not the panel content
            if (e.target === menuDropdown) {
                closeMenu();
            }
        });
    }


    // NOTE: Theme toggling is handled centrally by `applySiteTheme` exposed by the
    // main interactive module above. Remove duplicate handlers to avoid
    // conflicting class names and side effects.
});


var flkty = new Flickity('.main-slider', {
    cellAlign: 'left',
    contain: true,
    draggable: true,
    wrapAround: true,
    fade: true,
    autoPlay: 3000,
    pauseAutoPlayOnHover: false,
    pageDots: true,
    prevNextButtons: false,
    draggable: false,
});

const buttons = document.querySelectorAll(".button button");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

const tabs = document.querySelectorAll(".button .tab");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {

        tabs.forEach(t => t.classList.remove("active"));

        tab.classList.add("active");

        let target = tab.getAttribute("data-collection");

        document.querySelector(".oversized-sweatshirts").style.display = "none";
        document.querySelector(".oversized-hoodies").style.display = "none";

        document.querySelector("." + target).style.display = "flex";
    });
});

