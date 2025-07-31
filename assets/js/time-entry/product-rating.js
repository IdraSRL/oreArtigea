// product-rating.js v=1.0.0 - Sistema di valutazione prodotti integrato in timeEntry
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

class ProductRatingManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.ratings = {};
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Inizializzazione ProductRatingManager...');
        
        // Verifica autenticazione
        this.currentUser = AuthService.getCurrentUser();
        if (!this.currentUser) {
            console.log('Utente non loggato');
            return;
        }

        this.displayUserInfo();
        await this.loadProducts();
        await this.loadUserRatings();
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
            console.log('Caricamento prodotti...');
            
            // Carica dalla struttura unificata Data/products
            const docRef = doc(db, 'Data', 'products');
            const docSnap = await getDoc(docRef);
            
            this.products = [];
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.products && Array.isArray(data.products)) {
                    this.products = data.products.map((product, index) => ({
                        id: product.id || index.toString(),
                        name: product.name || `Prodotto ${index + 1}`,
                        description: product.description || '',
                        imageUrl: product.imageUrl || 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400'
                    }));
                }
            }

            // Se non ci sono prodotti, crea dati di default
            if (this.products.length === 0) {
                this.products = [
                    {
                        id: "detergente-multiuso",
                        name: "Detergente Multiuso",
                        description: "Detergente per tutte le superfici",
                        imageUrl: "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400"
                    },
                    {
                        id: "sgrassatore-cucina", 
                        name: "Sgrassatore Cucina",
                        description: "Potente sgrassatore per cucine",
                        imageUrl: "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400"
                    },
                    {
                        id: "detergente-bagno",
                        name: "Detergente Bagno",
                        description: "Specifico per sanitari e piastrelle",
                        imageUrl: "https://images.pexels.com/photos/4239092/pexels-photo-4239092.jpeg?auto=compress&cs=tinysrgb&w=400"
                    }
                ];
            }

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
                    // Struttura semplificata: ProductRatings/{productId}/ratings/{userId}
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

    renderProducts() {
        const loadingElement = document.getElementById('loadingProductsMessage');
        const productsGrid = document.getElementById('productsGrid');
        const noProductsElement = document.getElementById('noProducts');

        if (loadingElement) loadingElement.style.display = 'none';

        if (this.products.length === 0) {
            if (noProductsElement) noProductsElement.style.display = 'block';
            return;
        }

        if (noProductsElement) noProductsElement.style.display = 'none';
        if (productsGrid) {
            productsGrid.style.display = 'flex';
            productsGrid.innerHTML = '';
            
            this.products.forEach(product => {
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

        // Determina classe di rating
        let ratingClass = '';
        if (existingRating) {
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
            <div class="card bg-dark ${ratingClass} h-100">
                <div class="card-header bg-secondary text-light d-flex align-items-center">
                    <img src="${product.imageUrl}" 
                         alt="${product.name}" class="product-image me-3" 
                         style="width: 50px; height: 50px; border-radius: 8px; cursor: pointer;"
                         onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                    <div>
                        <h6 class="mb-0">${product.name}</h6>
                        <small class="text-muted">${product.description || 'Valuta questo prodotto'}</small>
                    </div>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-primary">
                            <i class="fas fa-magic me-1"></i>Efficacia: <span id="efficacia-value-${product.id}">${efficacia}</span>/10
                        </label>
                        <input type="range" min="1" max="10" value="${efficacia}" 
                               class="form-range" id="efficacia-${product.id}">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-success">
                            <i class="fas fa-leaf me-1"></i>Profumo: <span id="profumo-value-${product.id}">${profumo}</span>/10
                        </label>
                        <input type="range" min="1" max="10" value="${profumo}" 
                               class="form-range" id="profumo-${product.id}">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-warning">
                            <i class="fas fa-hand-paper me-1"></i>Facilità d'uso: <span id="facilita-value-${product.id}">${facilita}</span>/10
                        </label>
                        <input type="range" min="1" max="10" value="${facilita}" 
                               class="form-range" id="facilita-${product.id}">
                    </div>
                    
                    <button class="btn btn-primary w-100 submit-rating" data-product-id="${product.id}">
                        <i class="fas fa-star me-1"></i>
                        ${existingRating ? 'Aggiorna Valutazione' : 'Invia Valutazione'}
                    </button>
                </div>
            </div>
        `;

        // Add event listeners for sliders
        const sliders = cardContainer.querySelectorAll('.form-range');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = document.getElementById(e.target.id.replace(e.target.id.split('-')[0], e.target.id.split('-')[0] + '-value'));
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
            });
        });

        // Add event listener for submit button
        const submitBtn = cardContainer.querySelector('.submit-rating');
        submitBtn.addEventListener('click', () => {
            this.submitRating(product.id);
        });

        return cardContainer;
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
            const efficacia = parseInt(document.getElementById(`efficacia-${productId}`).value);
            const profumo = parseInt(document.getElementById(`profumo-${productId}`).value);
            const facilita = parseInt(document.getElementById(`facilita-${productId}`).value);
            
            const rating = {
                efficacia,
                profumo,
                facilita,
                timestamp: serverTimestamp(),
                employeeName: this.currentUser,
                productId: productId
            };

            console.log('Salvataggio valutazione:', rating);

            // Salva in ProductRatings/{productId}/ratings/{userId}
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

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
    const prodottiTab = document.querySelector('[data-bs-target="#tab-prodotti"]');
    let productManager = null;

    if (prodottiTab) {
        prodottiTab.addEventListener('click', async () => {
            if (!productManager) {
                productManager = new ProductRatingManager();
                await productManager.init();
            }
        });
    }
});

export { ProductRatingManager };