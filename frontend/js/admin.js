// Owner Panel Login Credentials
const OWNER_USERNAME = 'NaYanRajput';
const OWNER_PASSWORD = 'Nayan_953787';

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const ownerPanel = document.getElementById('ownerPanel');
const ownerLoginForm = document.getElementById('ownerLoginForm');
const loginError = document.getElementById('loginError');

// Check if already logged in
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('ownerPanelLoggedIn');
    if (isLoggedIn) {
        showOwnerPanel();
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    ownerPanel.style.display = 'none';
}

// Show owner panel
function showOwnerPanel() {
    loginScreen.style.display = 'none';
    ownerPanel.style.display = 'block';
    initializeOwnerPanel();
}

// Login form submission
ownerLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('ownerUsername').value;
    const password = document.getElementById('ownerPassword').value;
    
    if (username === OWNER_USERNAME && password === OWNER_PASSWORD) {
        localStorage.setItem('ownerPanelLoggedIn', 'true');
        loginError.style.display = 'none';
        showOwnerPanel();
        ownerLoginForm.reset();
    } else {
        loginError.style.display = 'block';
    }
});

// Initialize Owner Panel
function initializeOwnerPanel() {
    let products = JSON.parse(localStorage.getItem('products')) || [];

    // DOM Elements
    const productForm = document.getElementById('productForm');
    const productName = document.getElementById('productName');
    const productCategory = document.getElementById('productCategory');
    const productPrice = document.getElementById('productPrice');
    const productStock = document.getElementById('productStock');
    const productDescription = document.getElementById('productDescription');
    const productImages = document.getElementById('productImages');
    const imagePreview = document.getElementById('imagePreview');
    const successMessage = document.getElementById('successMessage');
    const productsList = document.getElementById('productsList');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const logoutBtn = document.getElementById('logoutBtn');

    // Store for multiple image previews
    let selectedImages = [];

    // Multi-Image Preview Handler
    productImages.addEventListener('change', (e) => {
        const files = e.target.files;
        selectedImages = [];
        imagePreview.innerHTML = '';
        
        if (files && files.length > 0) {
            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedImages.push(event.target.result);
                    
                    // Create preview thumbnail
                    const previewWrapper = document.createElement('div');
                    previewWrapper.style.cssText = 'position: relative; width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;';
                    
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.textContent = '✕';
                    removeBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;';
                    removeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        selectedImages.splice(index, 1);
                        previewWrapper.remove();
                    });
                    
                    previewWrapper.appendChild(img);
                    previewWrapper.appendChild(removeBtn);
                    imagePreview.appendChild(previewWrapper);
                };
                reader.readAsDataURL(file);
            });
        }
    });

    // Form Submission
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (selectedImages.length === 0) {
            alert('Please select at least one product image');
            return;
        }

        const sizeCheckboxes = document.querySelectorAll('input[name="sizes"]:checked');
        const selectedSizes = Array.from(sizeCheckboxes).map(cb => cb.value);

        const product = {
            id: Date.now(),
            name: productName.value,
            category: productCategory.value,
            price: parseFloat(productPrice.value),
            stock: parseInt(productStock.value),
            description: productDescription.value,
            sizes: selectedSizes,
            images: selectedImages, // Now stores multiple images
            addedDate: new Date().toLocaleDateString('en-IN')
        };

        products.push(product);
        localStorage.setItem('products', JSON.stringify(products));

        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);

        productForm.reset();
        imagePreview.innerHTML = '';
        selectedImages = [];

        displayProducts();
    });

    // Display Products
    function displayProducts() {
        if (products.length === 0) {
            productsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products added yet.</p>';
            return;
        }

        productsList.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-card-image">
                    ${product.images && product.images.length > 0 
                        ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; height: auto;">` 
                        : '<p style="color: #999;">No Image</p>'}
                </div>
                <div class="product-card-body">
                    <h3>${product.name}</h3>
                    <p><strong>Category:</strong> ${capitalizeCategory(product.category)}</p>
                    <p class="price">₹${product.price.toFixed(2)}</p>
                    <p class="stock">Stock: ${product.stock}</p>
                    <p><strong>Sizes:</strong> ${product.sizes.join(', ') || 'Not specified'}</p>
                    <p><strong>Images:</strong> ${product.images ? product.images.length : 0} photo(s)</p>
                    ${product.description ? `<p><strong>Description:</strong> ${product.description}</p>` : ''}
                    <p><small>Added: ${product.addedDate}</small></p>
                    <div class="product-card-actions">
                        <button class="btn-small btn-edit" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn-small btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Delete Product
    window.deleteProduct = function(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            products = products.filter(p => p.id !== id);
            localStorage.setItem('products', JSON.stringify(products));
            displayProducts();
        }
    };

    // Edit Product
    window.editProduct = function(id) {
        const product = products.find(p => p.id === id);
        if (product) {
            productName.value = product.name;
            productCategory.value = product.category;
            productPrice.value = product.price;
            productStock.value = product.stock;
            productDescription.value = product.description;

            document.querySelectorAll('input[name="sizes"]').forEach(cb => {
                cb.checked = product.sizes.includes(cb.value);
            });

            // Handle image previews for edit
            if (product.images && product.images.length > 0) {
                selectedImages = [...product.images];
                imagePreview.innerHTML = '';
                selectedImages.forEach((imgData, index) => {
                    const previewWrapper = document.createElement('div');
                    previewWrapper.style.cssText = 'position: relative; width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;';
                    
                    const img = document.createElement('img');
                    img.src = imgData;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                    
                    previewWrapper.appendChild(img);
                    imagePreview.appendChild(previewWrapper);
                });
            }

            products = products.filter(p => p.id !== id);
            localStorage.setItem('products', JSON.stringify(products));
            displayProducts();

            productName.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href').substring(1);

            sections.forEach(section => section.classList.remove('active'));

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');

                if (targetId === 'inventory') {
                    displayProducts();
                }
            }
        });
    });

    // Capitalize category
    function capitalizeCategory(category) {
        const categoryMap = {
            'mens': "Men's",
            'womens': "Women's",
            'kids': "Kids",
            'accessories': 'Accessories'
        };
        return categoryMap[category] || category;
    }

    // Logout
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ownerPanelLoggedIn');
            showLoginScreen();
        }
    });

    // Initialize display
    displayProducts();
}

// Check login status on page load
window.addEventListener('DOMContentLoaded', checkLoginStatus);
