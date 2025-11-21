// Product Detail Page - Image Gallery Interaction

document.addEventListener('DOMContentLoaded', function() {
    const sideImages = document.querySelectorAll('.product-images-side img');
    const mainImage = document.querySelector('.main-images img');

    // Set first image as active on load
    if (sideImages.length > 0) {
        sideImages[0].classList.add('active');
        if (mainImage && sideImages[0].src) {
            mainImage.src = sideImages[0].src;
        }
    }

    // Add click event to each side image
    sideImages.forEach((img, index) => {
        img.addEventListener('click', function() {
            // Remove active class from all images
            sideImages.forEach(image => image.classList.remove('active'));

            // Add active class to clicked image
            this.classList.add('active');

            // Update main image with fade effect
            if (mainImage && this.src) {
                // Add fade out effect
                mainImage.classList.add('fade-out');

                // Change image after fade out
                setTimeout(() => {
                    mainImage.src = this.src;
                    mainImage.classList.remove('fade-out');
                    mainImage.classList.add('fade-in');
                }, 150);

                // Remove fade-in class after animation
                setTimeout(() => {
                    mainImage.classList.remove('fade-in');
                }, 300);
            }
        });

        // Optional: Add keyboard navigation (arrow keys)
        img.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && index < sideImages.length - 1) {
                sideImages[index + 1].click();
                sideImages[index + 1].focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                sideImages[index - 1].click();
                sideImages[index - 1].focus();
            }
        });
    });

    // Handle "Add to Cart" button
    const addToCartBtn = document.querySelector('.add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async function() {
            const size = document.querySelector('#size')?.value || 'Not selected';
            const quantity = Number(document.querySelector('#quantity')?.value || '1');
            const productName = document.querySelector('.product-info-side p')?.textContent || 'Product';
            const imageSrc = mainImage?.src || '';
            const priceText = document.querySelector('.product-info-side .discount')?.textContent || document.querySelector('.product-info-side .kat')?.textContent || '';
            const price = Number(String(priceText).replace(/[^0-9\.]/g, '')) || 0;
            const id = document.querySelector('.product-detail')?.dataset.sku || document.querySelector('.product-detail')?.getAttribute('data-id') || (`p_${Date.now()}`);

            const item = { id, name: productName + (size ? ` (Size: ${size})` : ''), price, image: imageSrc, quantity };

            // Try server-first: POST /api/cart { item, cartId }
            try {
                const payload = { item };
                const cartId = localStorage.getItem('site-cart-id');
                if (cartId) payload.cartId = cartId;
                const resp = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (resp.ok) {
                    const json = await resp.json();
                    if (json.cartId) localStorage.setItem('site-cart-id', json.cartId);
                    // sync local fallback store
                    try { localStorage.setItem('site-cart', JSON.stringify(json.items || [])); } catch(e){}
                    // update global cart object if available
                    if (window.cart && Array.isArray(json.items)) {
                        window.cart.items = (json.items || []).map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '', quantity: it.quantity || 1 }));
                        window.cart.updateTotal();
                        window.cart.updateUI();
                    }
                    // lightweight confirmation
                    alert(`${quantity}x ${productName} added to cart`);
                    return;
                }
            } catch (err) {
                console.warn('Cart API failed from product page, falling back to client cart', err);
            }

            // Fallback to client-side cart
            try {
                if (window.cart && typeof window.cart.add === 'function') {
                    window.cart.add(item);
                    try { localStorage.setItem('site-cart', JSON.stringify(window.cart.items)); } catch(e){}
                    alert(`${quantity}x ${productName} added to cart`);
                } else {
                    // Basic fallback: persist into site-cart localStorage
                    const prev = JSON.parse(localStorage.getItem('site-cart') || '[]');
                    const existing = prev.find(p => p.id === item.id);
                    if (existing) existing.quantity = Number(existing.quantity || 1) + Number(item.quantity || 1);
                    else prev.push(item);
                    localStorage.setItem('site-cart', JSON.stringify(prev));
                    alert(`${quantity}x ${productName} added to cart`);
                }
            } catch (e) {
                console.warn('Add to cart fallback failed', e);
                alert('Could not add to cart. Please try again.');
            }
        });
    }

    // Handle "Buy Now" button
    const buyNowBtn = document.querySelector('.buy-now');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async function() {
            const size = document.querySelector('#size')?.value;
            const quantity = Number(document.querySelector('#quantity')?.value || '1');

            if (!size) {
                alert('Please select a size!');
                return;
            }

            // Add the item to cart first (server-first, fallback to client)
            const productName = document.querySelector('.product-info-side p')?.textContent || 'Product';
            const imageSrc = mainImage?.src || '';
            const priceText = document.querySelector('.product-info-side .discount')?.textContent || document.querySelector('.product-info-side .kat')?.textContent || '';
            const price = Number(String(priceText).replace(/[^0-9\.]/g, '')) || 0;
            const id = document.querySelector('.product-detail')?.dataset.sku || document.querySelector('.product-detail')?.getAttribute('data-id') || (`p_${Date.now()}`);
            const item = { id, name: productName + (size ? ` (Size: ${size})` : ''), price, image: imageSrc, quantity };

            try {
                const payload = { item };
                const cartId = localStorage.getItem('site-cart-id');
                if (cartId) payload.cartId = cartId;
                const resp = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (resp.ok) {
                    const json = await resp.json();
                    if (json.cartId) localStorage.setItem('site-cart-id', json.cartId);
                    try { localStorage.setItem('site-cart', JSON.stringify(json.items || [])); } catch(e){}
                    if (window.cart && Array.isArray(json.items)) {
                        window.cart.items = (json.items || []).map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, image: it.image || '', quantity: it.quantity || 1 }));
                        window.cart.updateTotal();
                        window.cart.updateUI();
                    }
                } else {
                    // fallback to client
                    if (window.cart && typeof window.cart.add === 'function') window.cart.add(item);
                    else {
                        const prev = JSON.parse(localStorage.getItem('site-cart') || '[]');
                        prev.push(item); localStorage.setItem('site-cart', JSON.stringify(prev));
                    }
                }
            } catch (err) {
                console.warn('Buy Now: could not persist cart to server, using client fallback', err);
                if (window.cart && typeof window.cart.add === 'function') window.cart.add(item);
                else {
                    const prev = JSON.parse(localStorage.getItem('site-cart') || '[]');
                    prev.push(item); localStorage.setItem('site-cart', JSON.stringify(prev));
                }
            }

            // Now require login as main checkout flow does
            const logged = (function(){ try { return localStorage.getItem('site-logged-in') === '1' || !!localStorage.getItem('site-access-token') || !!localStorage.getItem('site-token'); } catch(e){ return false; } })();
            if (!logged) {
                const next = encodeURIComponent('/htmls/checkout.html');
                window.location.href = `/htmls/loginpage.html?next=${next}`;
                return;
            }
            // go to checkout
            window.location.href = '/htmls/checkout.html';
        });
    }

    // Handle Home button
    const homeBtn = document.querySelector('.top button.home');
    if (homeBtn) {
        homeBtn.addEventListener('click', function() {
            window.location.href = '/';
        });
    }

    // Optional: Keyboard shortcut to navigate through images
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight') {
            const active = document.querySelector('.product-images-side img.active');
            if (active) {
                const nextImg = active.nextElementSibling;
                if (nextImg && nextImg.tagName === 'IMG') {
                    nextImg.click();
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const active = document.querySelector('.product-images-side img.active');
            if (active) {
                const prevImg = active.previousElementSibling;
                if (prevImg && prevImg.tagName === 'IMG') {
                    prevImg.click();
                }
            }
        }
    });
});
