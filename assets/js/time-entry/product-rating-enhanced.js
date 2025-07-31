// product-rating-enhanced.js - Sistema di valutazione prodotti con filtri avanzati
import { db } from "../common/firebase-config.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { AuthService } from "../auth/auth.js";

class ProductRatingManagerEnhanced {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.filteredProducts = [];
        this.ratings = {};
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Inizializzazione ProductRatingManagerEnhanced...');
        
        // Verifica autenticazione
        this.currentUser = AuthService.getCurrentUser();
        if (!this.currentUser) {
            console.log('Utente non loggato');
            return;
        }

        this.displayUserInfo();
        await this.loadProducts();
        await this.loadUserRatings();
        this.populateFilters();
        this.setupEventListeners();
        this.renderProducts();
        this.setupImageModal();
        this.isInitialized = true;
    }

    displayUserInfo() {
        const userNameElement = document.getElementById('userNameProdotti');
        if (userNameElement) {
            userNameElement.textContent = `Benvenuto, ${this.currentUser}!`;
        }
    }

    async loadProducts() {
        try {
            console.log('Caricamento prodotti da Firestore...');
            const querySnapshot = await getDocs(collection(db, 'Products'));
            this.products = [];
            
            querySnapshot.forEach((doc) => {
                const productData = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Mostra solo i prodotti visibili (visible !== false)
                if (productData.visible !== false) {
                    this.products.push(productData);
                }
            });


            this.filteredProducts = [...this.products];
            console.log('Prodotti caricati:', this.products.length);
        } catch (error) {
            console.error('Errore nel caricamento prodotti:', error);
            this.showError('Errore nel caricamento dei prodotti.');
        }
    }

    async loadUserRatings() {
        try {
            console.log('Caricamento valutazioni utente...');
            this.ratings = {};
            
            for (const product of this.products) {
                try {
                    const ratingRef = doc(db, 'ProductRatings', product.id, 'ratings', this.currentUser);
                    const ratingSnap = await getDoc(ratingRef);
                    
                    if (ratingSnap.exists()) {
                        this.ratings[product.id] = ratingSnap.data();
                    }
                } catch (error) {
                    console.log(`Nessuna valutazione per prodotto ${product.id}`);
                }
            }
            
            console.log('Valutazioni caricate:', Object.keys(this.ratings).length);
        } catch (error) {
            console.error('Errore nel caricamento valutazioni:', error);
        }
    }

    setupEventListeners() {
        // Filtri
        const marcaFilter = document.getElementById('marcaFilterUser');
        const tipoFilter = document.getElementById('tipoFilterUser');
        const searchInput = document.getElementById('productSearchUser');

        if (marcaFilter) marcaFilter.addEventListener('change', () => this.applyFilters());
        if (tipoFilter) tipoFilter.addEventListener('change', () => this.applyFilters());
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
        }

        // Reset filtri
        const resetBtn = document.getElementById('resetFiltersUser');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    populateFilters() {
        const marcaFilter = document.getElementById('marcaFilterUser');
        const tipoFilter = document.getElementById('tipoFilterUser');

        if (marcaFilter) {
            const marche = [...new Set(this.products.map(p => p.tagMarca))].sort();
            marcaFilter.innerHTML = '<option value="">Tutte le marche</option>' +
                marche.map(marca => `<option value="${marca}">${marca}</option>`).join('');
        }

        if (tipoFilter) {
            const tipi = [...new Set(this.products.map(p => p.tagTipo))].sort();
            tipoFilter.innerHTML = '<option value="">Tutti i tipi</option>' +
                tipi.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('');
        }
    }

    applyFilters() {
        const marcaFilter = document.getElementById('marcaFilterUser')?.value || '';
        const tipoFilter = document.getElementById('tipoFilterUser')?.value || '';
        const searchText = document.getElementById('productSearchUser')?.value.toLowerCase() || '';

        this.filteredProducts = this.products.filter(product => {
            const matchesMarca = !marcaFilter || product.tagMarca === marcaFilter;
            const matchesTipo = !tipoFilter || product.tagTipo === tipoFilter;
            const matchesSearch = !searchText || 
                product.name.toLowerCase().includes(searchText) ||
                (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchText)));
            
            return matchesMarca && matchesTipo && matchesSearch;
        });

        this.renderProducts();
    }

    resetFilters() {
        document.getElementById('marcaFilterUser').value = '';
        document.getElementById('tipoFilterUser').value = '';
        document.getElementById('productSearchUser').value = '';
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }

    renderProducts() {
        const loadingElement = document.getElementById('loadingProductsMessage');
        const productsGrid = document.getElementById('productsGrid');
        const noProductsElement = document.getElementById('noProducts');

        if (loadingElement) loadingElement.style.display = 'none';

        if (this.filteredProducts.length === 0) {
            if (noProductsElement) {
                noProductsElement.style.display = 'flex';
                noProductsElement.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Nessun prodotto trovato con i filtri selezionati.</p>
                        <button class="btn btn-secondary btn-sm" onclick="productRatingManager.resetFilters()">
                            <i class="fas fa-undo me-1"></i>Reset Filtri
                        </button>
                    </div>
                `;
            }
            if (productsGrid) productsGrid.style.display = 'none';
            return;
        }

        if (noProductsElement) noProductsElement.style.display = 'none';
        if (productsGrid) {
            productsGrid.style.display = 'flex';
            productsGrid.innerHTML = '';
            
            this.filteredProducts.forEach(product => {
                const productCard = this.createProductCard(product);
                productsGrid.appendChild(productCard);
            });
        }
    }

    createProductCard(product) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'col-lg-6 col-xl-4';
        
        const existingRating = this.ratings[product.id];
        
        const efficacia = existingRating ? existingRating.efficacia : 5;
        const profumo = existingRating ? existingRating.profumo : 5;
        const facilita = existingRating ? existingRating.facilita : 5;

        // Determina classe di rating e sfondo
        let ratingClass = '';
        let cardBgClass = 'bg-dark';
        if (existingRating) {
            cardBgClass = 'bg-success bg-opacity-25'; // Sfondo verdolino per prodotti già valutati
            const avg = (efficacia + profumo + facilita) / 3;
            if (avg < 4) {
                ratingClass = 'border-danger';
            } else if (avg < 7) {
                ratingClass = 'border-warning';
            } else {
                ratingClass = 'border-success';
            }
        }

        cardContainer.innerHTML = `
            <div class="card ${cardBgClass} ${ratingClass} h-100">
                <div class="card-header bg-secondary text-light d-flex align-items-center">
                    <img src="${product.imageUrl}" 
                         alt="${product.name}" class="product-image me-3" 
                         style="width: 150px; height: 150px; border-radius: 8px; cursor: pointer;"
                         onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${product.name}</h6>
                        <small class="text-muted">${product.description || 'Valuta questo prodotto'}</small>
                        <div class="mt-1">
                            <span class="badge bg-primary me-1">${product.tagMarca}</span>
                            <span class="badge bg-secondary">${product.tagTipo}</span>
                            ${product.tags && product.tags.length > 0 ? `
                            <div class="mt-1">
                                ${product.tags.map(tag => `<span class="badge bg-dark me-1">${tag}</span>`).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <button class="btn btn-outline-light btn-sm w-100" type="button" 
                                onclick="productRatingManager.toggleRatingForm('${product.id}')">
                            <i class="fas fa-star me-1"></i>
                            ${existingRating ? 'Modifica Valutazione' : 'Valuta Prodotto'}
                            <i class="fas fa-chevron-down ms-1" id="chevron-${product.id}"></i>
                        </button>
                    </div>
                    
                    <div class="collapse" id="rating-form-${product.id}" style="display: none;">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-primary">
                                <i class="fas fa-magic me-1"></i>Efficacia: <span id="efficacia-value-${product.id}">${efficacia}</span>/10
                            </label>
                            <div class="rating-dots" data-rating="efficacia" data-product="${product.id}" data-value="${efficacia}">
                                ${this.createRatingDots('efficacia', product.id, efficacia)}
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-success">
                                <i class="fas fa-leaf me-1"></i>Profumo: <span id="profumo-value-${product.id}">${profumo}</span>/10
                            </label>
                            <div class="rating-dots" data-rating="profumo" data-product="${product.id}" data-value="${profumo}">
                                ${this.createRatingDots('profumo', product.id, profumo)}
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-warning">
                                <i class="fas fa-hand-paper me-1"></i>Facilità d'uso: <span id="facilita-value-${product.id}">${facilita}</span>/10
                            </label>
                            <div class="rating-dots" data-rating="facilita" data-product="${product.id}" data-value="${facilita}">
                                ${this.createRatingDots('facilita', product.id, facilita)}
                            </div>
                        </div>
                        
                        <button class="btn btn-primary w-100 submit-rating" data-product-id="${product.id}">
                            <i class="fas fa-save me-1"></i>
                            ${existingRating ? 'Aggiorna Valutazione' : 'Salva Valutazione'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for rating dots
        const ratingDots = cardContainer.querySelectorAll('.rating-dots');
        ratingDots.forEach(container => {
            const dots = container.querySelectorAll('.rating-dot');
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const value = parseInt(e.target.dataset.value);
                    const rating = container.dataset.rating;
                    const productId = container.dataset.product;
                    
                    // Aggiorna il valore visualizzato
                    const valueSpan = document.getElementById(`${rating}-value-${productId}`);
                    if (valueSpan) {
                        valueSpan.textContent = value;
                    }
                    
                    // Aggiorna l'aspetto dei dots
                    this.updateRatingDots(container, value);
                    
                    // Salva il valore nel dataset del container
                    container.dataset.value = value;
                });
            });
        });

        // Add event listener for submit button
        const submitBtn = cardContainer.querySelector('.submit-rating');
        submitBtn.addEventListener('click', () => {
            this.submitRating(product.id);
        });

        return cardContainer;
    }

    toggleRatingForm(productId) {
        const formElement = document.getElementById(`rating-form-${productId}`);
        const chevronElement = document.getElementById(`chevron-${productId}`);
        
        if (formElement.style.display === 'none' || formElement.style.display === '') {
            // Apri il form
            formElement.style.display = 'block';
            formElement.classList.add('show');
            if (chevronElement) {
                chevronElement.classList.remove('fa-chevron-down');
                chevronElement.classList.add('fa-chevron-up');
            }
        } else {
            // Chiudi il form
            formElement.style.display = 'none';
            formElement.classList.remove('show');
            if (chevronElement) {
                chevronElement.classList.remove('fa-chevron-up');
                chevronElement.classList.add('fa-chevron-down');
            }
        }
    }

    createRatingDots(rating, productId, currentValue) {
        let dotsHtml = '';
        for (let i = 1; i <= 10; i++) {
            const isActive = i <= currentValue;
            dotsHtml += `
                <span class="rating-dot ${isActive ? 'active' : ''}" 
                      data-value="${i}" 
                      style="cursor: pointer; display: inline-block; width: 20px; height: 20px; 
                             border-radius: 50%; margin: 2px; border: 2px solid #6c757d;
                             background-color: ${isActive ? '#0d6efd' : 'transparent'};
                             transition: all 0.2s ease;">
                </span>
            `;
        }
        return dotsHtml;
    }

    updateRatingDots(container, value) {
        const dots = container.querySelectorAll('.rating-dot');
        dots.forEach((dot, index) => {
            const dotValue = index + 1;
            if (dotValue <= value) {
                dot.classList.add('active');
                dot.style.backgroundColor = '#0d6efd';
            } else {
                dot.classList.remove('active');
                dot.style.backgroundColor = 'transparent';
            }
        });
    }

    setupImageModal() {
        // Crea modal se non esiste
        if (!document.getElementById('productImageModal')) {
            const modal = document.createElement('div');
            modal.id = 'productImageModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content bg-dark">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title text-light">Immagine Prodotto</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img id="modalProductImage" class="img-fluid" style="max-height: 70vh;">
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Add click listeners to product images
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image')) {
                this.openImageModal(e.target.src, e.target.alt);
            }
        });
    }

    openImageModal(src, alt) {
        const modal = document.getElementById('productImageModal');
        const modalImg = document.getElementById('modalProductImage');
        
        if (modal && modalImg) {
            modalImg.src = src;
            modalImg.alt = alt;
            new bootstrap.Modal(modal).show();
        }
    }

    async submitRating(productId) {
        try {
            // Ottieni i valori dai rating dots
            const efficaciaContainer = document.querySelector(`[data-rating="efficacia"][data-product="${productId}"]`);
            const profumoContainer = document.querySelector(`[data-rating="profumo"][data-product="${productId}"]`);
            const facilitaContainer = document.querySelector(`[data-rating="facilita"][data-product="${productId}"]`);
            
            const efficacia = parseInt(efficaciaContainer.dataset.value);
            const profumo = parseInt(profumoContainer.dataset.value);
            const facilita = parseInt(facilitaContainer.dataset.value);
            
            const rating = {
                efficacia,
                profumo,
                facilita,
                timestamp: serverTimestamp(),
                employeeName: this.currentUser,
                productId: productId
            };

            console.log('Salvataggio valutazione:', rating);

            const ratingRef = doc(db, 'ProductRatings', productId, 'ratings', this.currentUser);
            await setDoc(ratingRef, rating);
            
            // Update local ratings
            this.ratings[productId] = rating;
            
            // Show success message
            this.showSuccess('Valutazione salvata con successo!');
            
            // Re-render to update card styling
            this.renderProducts();
            
        } catch (error) {
            console.error('Errore nel salvataggio valutazione:', error);
            this.showError('Errore nel salvataggio. Riprova.');
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        if (type === 'error') {
            toast.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
        } else if (type === 'success') {
            toast.style.background = 'linear-gradient(45deg, #10b981, #059669)';
        } else {
            toast.style.background = 'linear-gradient(45deg, #6366f1, #4f46e5)';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Istanza globale
window.productRatingManager = new ProductRatingManagerEnhanced();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
    const prodottiTab = document.querySelector('[data-bs-target="#tab-prodotti"]');
    let productManager = null;

    if (prodottiTab) {
        prodottiTab.addEventListener('click', async () => {
            if (!productManager) {
                productManager = window.productRatingManager;
                await productManager.init();
            }
        });
    }
});

export { ProductRatingManagerEnhanced };