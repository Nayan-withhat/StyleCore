// products.js - Fetch and display products on main page

async function loadProducts() {
    try {
        const response = await fetch('/api/products?limit=50');
        const products = await response.json();

        // Create products section on main page
        // prefer an existing `#Products` placeholder, otherwise use `.main-drop`, then `.container`
        const targetRoot = document.getElementById('Products') || document.querySelector('.main-drop') || document.querySelector('.container');

        if (targetRoot && products.length > 0) {
            const productsSection = document.createElement('section');
            productsSection.className = 'products-section';
            productsSection.innerHTML = `
                <div style="max-width: 1400px; margin: 40px auto; padding: 0 20px;">
                    <h2 style="font-size: 32px; font-weight: 700; margin-bottom: 30px; text-align: center;">
                        Our Products
                    </h2>
                    <div id="productsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                        <!-- Products will be inserted here -->
                    </div>
                </div>
            `;

            targetRoot.appendChild(productsSection);

            const grid = document.getElementById('productsGrid');
            // try to load static index mapping (id/sku -> static page)
            let indexMap = {};
            try {
                const raw = await fetch('/product/product_index.json');
                if (raw.ok) indexMap = await raw.json();
            } catch (e) { /* ignore */ }

            products.forEach(product => {
                const card = document.createElement('div');
                card.style.cssText = `
                    background-color: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    transition: all 0.3s;
                    cursor: pointer;
                `;
                card.innerHTML = `
                    <div style="width: 100%; height: 250px; background-color: #e5e7eb; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        <img src="${product.images?.[0] || '/assets/placeholder.png'}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 15px;">
                        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${product.title}
                        </h3>
                        <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0; text-transform: uppercase;">
                            ${product.category}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 18px; font-weight: 700; color: #111827;">₹${product.price}</span>
                            <span style="font-size: 12px; color: #6b7280;">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                        </div>
                        <button style="width: 100%; margin-top: 12px; padding: 10px; background-color: #111827; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif; transition: all 0.3s;"
                                onclick="(function(){ const key = '${product.id || product._id || product.sku || ''}'; const path = indexMap[key]; window.location.href = path || '/htmls/productdetail.html?id=${product.id || product._id || product.sku || ''}'; })()">
                            View Details
                        </button>
                    </div>
                `;

                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    card.style.transform = 'translateY(-4px)';
                });

                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    card.style.transform = 'translateY(0)';
                });

                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load products when page loads
window.addEventListener('load', loadProducts);
