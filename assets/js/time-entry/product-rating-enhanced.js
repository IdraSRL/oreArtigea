// product-rating-enhanced.js - Sistema di valutazione prodotti per dipendenti
import { db } from "../common/firebase-config.js";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { AuthService } from "../auth/auth.js";
import { showToast } from "../common/utils.js";
import { debounce } from "../common/utils.js";

class ProductRatingManager {
    constructor() {
        this.products = [];
        this.userRatings = {};
        this.currentUser = null;
        this.isInitialized = false;
        this.availableMarche = new Set();
        this.availableTipi = new Set();
        this.availableTags = new Set();
    }

    async init() {
        if (this.isInitialized) return;
        
        this.currentUser = AuthService.getCurrentUser();
        if (!this.currentUser) {
            this.showError('Utente non autenticato');
            return;
        }

        this.setupEventListeners();
        await this.loadProducts();
        await this.loadUserRatings();
        this.populateFilters();
        this.renderProducts();
        this.updateUserDisplay();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Filtri
        const marcaFilter = document.getElementById('marcaFilterUser');
        const tipoFilter = document.getElementById('tipoFilterUser');
        const searchInput = document.getElementById('productSearchUser');
        const resetBtn = document.getElementById('resetFiltersUser');

        if (marcaFilter) {
            marcaFilter.addEventListener('change', () => this.applyFilters());
        }

        if (tipoFilter) {
            tipoFilter.addEventListener('change', () => this.applyFilters());
        }

        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.applyFilters(), 300));
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
    }

    async loadProducts() {
        try {
            const querySnapshot = await getDocs(collection(db, 'Products'));
            this.products = [];
            
            querySnapshot.forEach((doc) => {
                const productData = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Solo prodotti visibili
                if (productData.visible !== false) {
                    this.products.push(productData);
                    
                    // Raccogli filtri
                    if (productData.tagMarca) this.availableMarche.add(productData.tagMarca);
                    if (productData.tagTipo) this.availableTipi.add(productData.tagTipo);
                    if (productData.tags && Array.isArray(productData.tags)) {
                        productData.tags.forEach(tag => this.availableTags.add(tag));
                    }
                }
            });

            // Ordina per nome
            this.products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'));
            
        } catch (error) {
            console.error('Errore caricamento prodotti:', error);
            this.showError('Errore nel caricamento dei prodotti');
        }
    }

    async loadUserRatings() {
        this.userRatings = {};
        
        try {
            for (const product of this.products) {
                const ratingRef = doc(db, 'ProductRatings', product.id, 'ratings', this.currentUser);
                const ratingSnap = await getDoc(ratingRef);
                
                if (ratingSnap.exists()) {
                    this.userRatings[product.id] = ratingSnap.data();
                }
            }
        } catch (error) {
            console.warn('Errore caricamento valutazioni utente:', error);
        }
    }

    populateFilters() {
        // Popola filtro marche
        const marcaSelect = document.getElementById('marcaFilterUser');
        if (marcaSelect) {
            marcaSelect.innerHTML = '<option value="">Tutte le marche</option>';
            Array.from(this.availableMarche).sort().forEach(marca => {
                const option = document.createElement('option');
                option.value = marca;
                option.textContent = marca;
                marcaSelect.appendChild(option);
            });
        }

        // Popola filtro tipi
        const tipoSelect = document.getElementById('tipoFilterUser');
        if (tipoSelect) {
            tipoSelect.innerHTML = '<option value="">Tutti i tipi</option>';
            Array.from(this.availableTipi).sort().forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo;
                option.textContent = tipo;
                tipoSelect.appendChild(option);
            });
        }
    }

    applyFilters() {
        const marcaFilter = document.getElementById('marcaFilterUser')?.value || '';
        const tipoFilter = document.getElementById('tipoFilterUser')?.value || '';
        const searchFilter = document.getElementById('productSearchUser')?.value.toLowerCase() || '';

        const filteredProducts = this.products.filter(product => {
            // Filtro marca
            if (marcaFilter && product.tagMarca !== marcaFilter) return false;
            
            // Filtro tipo
            if (tipoFilter && product.tagTipo !== tipoFilter) return false;
            
            // Filtro ricerca
            if (searchFilter) {
                const searchableText = [
                    product.name || '',
                    product.description || '',
                    product.tagMarca || '',
                    product.tagTipo || '',
                    ...(product.tags || [])
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchFilter)) return false;
            }
            
            return true;
        });

        this.renderProducts(filteredProducts);
    }

    resetFilters() {
        document.getElementById('marcaFilterUser').value = '';
        document.getElementById('tipoFilterUser').value = '';
        document.getElementById('productSearchUser').value = '';
        this.renderProducts();
    }

    renderProducts(productsToRender = null) {
        const loadingElement = document.getElementById('loadingProductsMessage');
        const productsGrid = document.getElementById('productsGrid');
        const noProductsElement = document.getElementById('noProducts');

        if (loadingElement) loadingElement.style.display = 'none';

        const products = productsToRender || this.products;

        if (products.length === 0) {
            if (productsGrid) productsGrid.style.display = 'none';
            if (noProductsElement) noProductsElement.style.display = 'block';
            return;
        }

        if (noProductsElement) noProductsElement.style.display = 'none';
        if (productsGrid) {
            productsGrid.style.display = 'flex';
            productsGrid.innerHTML = '';

            products.forEach(product => {
                const productCard = this.createProductCard(product);
                productsGrid.appendChild(productCard);
            });
        }
    }

    createProductCard(product) {
        const userRating = this.userRatings[product.id];
        const hasRating = !!userRating;
        
        const cardContainer = document.createElement('div');
        cardContainer.className = 'col-lg-6 col-xl-4';
        
        cardContainer.innerHTML = `
            <div class="card bg-dark border-${hasRating ? 'success' : 'secondary'} h-100">
                <div class="card-header bg-${hasRating ? 'success' : 'secondary'} text-white d-flex justify-content-between align-items-center product-card-header">
                    <div class="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
                        <img src="${product.imageUrl}" 
                             alt="${product.name}" 
                             class="product-image flex-shrink-0" 
                             style="width: 40px; height: 40px; border-radius: 6px; cursor: pointer;"
                             onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                        <div class="min-w-0 flex-grow-1">
                            <h6 class="mb-1 text-truncate" title="${product.name}">${product.name}</h6>
                            <div class="d-flex flex-wrap gap-1">
                                <span class="badge bg-primary small">${product.tagMarca || 'N/A'}</span>
                                <span class="badge bg-info small">${product.tagTipo || 'N/A'}</span>
                                ${hasRating ? '<span class="badge bg-warning text-dark small">Valutato</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-${hasRating ? 'warning' : 'primary'} btn-sm" 
                                onclick="productRatingManager.openRatingModal('${product.id}')"
                                title="${hasRating ? 'Modifica valutazione' : 'Valuta prodotto'}">
                            <i class="fas fa-${hasRating ? 'edit' : 'star'}"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body p-3">
                    <p class="card-text small text-muted mb-2">${product.description || 'Nessuna descrizione disponibile'}</p>
                    
                    ${product.tags && product.tags.length > 0 ? `
                    <div class="mb-2">
                        ${product.tags.map(tag => `<span class="badge bg-dark me-1 small">${tag}</span>`).join('')}
                    </div>
                    ` : ''}
                    
                    ${hasRating ? `
                    <div class="alert alert-success py-2 mb-0">
                        <div class="small">
                            <strong>La tua valutazione:</strong><br>
                            Efficacia: ${userRating.efficacia}/10<br>
                            Profumo: ${userRating.profumo}/10<br>
                            Facilità: ${userRating.facilita}/10<br>
                            <strong>Media: ${((userRating.efficacia + userRating.profumo + userRating.facilita) / 3).toFixed(1)}/10</strong>
                        </div>
                    </div>
                    ` : `
                    <div class="alert alert-info py-2 mb-0">
                        <div class="small text-center">
                            <i class="fas fa-star me-1"></i>Non ancora valutato
                        </div>
                    </div>
                    `}
                </div>
            </div>
        `;

        return cardContainer;
    }

    openRatingModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const userRating = this.userRatings[productId];
        const isEdit = !!userRating;

        // Crea modal dinamicamente
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title">
                            <i class="fas fa-star me-2"></i>
                            ${isEdit ? 'Modifica' : 'Valuta'} Prodotto
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <img src="${product.imageUrl}" 
                                 alt="${product.name}" 
                                 class="product-detail-image mb-3" 
                                 style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px; cursor: pointer;"
                                 onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=120'">
                            <h6 class="text-primary">${product.name}</h6>
                            <p class="small text-muted">${product.description || ''}</p>
                            <div class="d-flex justify-content-center gap-2 mb-2">
                                <span class="badge bg-primary">${product.tagMarca}</span>
                                <span class="badge bg-info">${product.tagTipo}</span>
                            </div>
                        </div>
                        
                        <form id="ratingForm">
                            <input type="hidden" id="productIdInput" value="${productId}">
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold">
                                    <i class="fas fa-magic me-1"></i>Efficacia (1-10)
                                </label>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="small text-muted">Poco efficace</span>
                                    <div class="rating-dots" data-rating="efficacia">
                                        ${[...Array(10)].map((_, i) => `
                                            <span class="rating-dot ${userRating && userRating.efficacia > i ? 'active' : ''}" 
                                                  data-value="${i + 1}"
                                                  style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; 
                                                         border: 2px solid #6c757d; margin: 0 2px; cursor: pointer; 
                                                         background-color: ${userRating && userRating.efficacia > i ? '#0d6efd' : 'transparent'};
                                                         transition: all 0.2s ease;"></span>
                                        `).join('')}
                                    </div>
                                    <span class="small text-muted">Molto efficace</span>
                                </div>
                                <input type="hidden" name="efficacia" value="${userRating?.efficacia || ''}">
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold">
                                    <i class="fas fa-leaf me-1"></i>Profumo (1-10)
                                </label>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="small text-muted">Sgradevole</span>
                                    <div class="rating-dots" data-rating="profumo">
                                        ${[...Array(10)].map((_, i) => `
                                            <span class="rating-dot ${userRating && userRating.profumo > i ? 'active' : ''}" 
                                                  data-value="${i + 1}"
                                                  style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; 
                                                         border: 2px solid #6c757d; margin: 0 2px; cursor: pointer; 
                                                         background-color: ${userRating && userRating.profumo > i ? '#0d6efd' : 'transparent'};
                                                         transition: all 0.2s ease;"></span>
                                        `).join('')}
                                    </div>
                                    <span class="small text-muted">Profumato</span>
                                </div>
                                <input type="hidden" name="profumo" value="${userRating?.profumo || ''}">
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label fw-bold">
                                    <i class="fas fa-hand-paper me-1"></i>Facilità d'uso (1-10)
                                </label>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="small text-muted">Difficile</span>
                                    <div class="rating-dots" data-rating="facilita">
                                        ${[...Array(10)].map((_, i) => `
                                            <span class="rating-dot ${userRating && userRating.facilita > i ? 'active' : ''}" 
                                                  data-value="${i + 1}"
                                                  style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; 
                                                         border: 2px solid #6c757d; margin: 0 2px; cursor: pointer; 
                                                         background-color: ${userRating && userRating.facilita > i ? 'active' : 'transparent'};
                                                         transition: all 0.2s ease;"></span>
                                        `).join('')}
                                    </div>
                                    <span class="small text-muted">Facile</span>
                                </div>
                                <input type="hidden" name="facilita" value="${userRating?.facilita || ''}">
                            </div>
                            
                            <div class="mb-3">
                                <label for="commentInput" class="form-label fw-bold">
                                    <i class="fas fa-comment me-1"></i>Commento (opzionale)
                                </label>
                                <textarea class="form-control bg-secondary text-light border-0" 
                                          id="commentInput" name="commento" rows="3" 
                                          placeholder="Condividi la tua esperienza con questo prodotto...">${userRating?.commento || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Annulla
                        </button>
                        <button type="button" class="btn btn-success" onclick="productRatingManager.saveRating()">
                            <i class="fas fa-save me-1"></i>${isEdit ? 'Aggiorna' : 'Salva'} Valutazione
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        
        // Setup rating dots
        this.setupRatingDots(modal);
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
        
        bootstrapModal.show();
    }

    setupRatingDots(modal) {
        modal.querySelectorAll('.rating-dots').forEach(container => {
            const ratingType = container.dataset.rating;
            const hiddenInput = modal.querySelector(`input[name="${ratingType}"]`);
            
            container.querySelectorAll('.rating-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const value = parseInt(dot.dataset.value);
                    hiddenInput.value = value;
                    
                    // Aggiorna visualizzazione
                    container.querySelectorAll('.rating-dot').forEach((d, index) => {
                        if (index < value) {
                            d.classList.add('active');
                            d.style.backgroundColor = '#0d6efd';
                        } else {
                            d.classList.remove('active');
                            d.style.backgroundColor = 'transparent';
                        }
                    });
                });
            });
        });
    }

    async saveRating() {
        const form = document.getElementById('ratingForm');
        const formData = new FormData(form);
        
        const productId = formData.get('productIdInput');
        const efficacia = parseInt(formData.get('efficacia')) || 0;
        const profumo = parseInt(formData.get('profumo')) || 0;
        const facilita = parseInt(formData.get('facilita')) || 0;
        const commento = formData.get('commento')?.trim() || '';

        // Validazione
        if (!efficacia || !profumo || !facilita) {
            this.showError('Completa tutte le valutazioni (1-10)');
            return;
        }

        if (efficacia < 1 || efficacia > 10 || profumo < 1 || profumo > 10 || facilita < 1 || facilita > 10) {
            this.showError('Le valutazioni devono essere tra 1 e 10');
            return;
        }

        const ratingData = {
            productId,
            employeeName: this.currentUser,
            efficacia,
            profumo,
            facilita,
            commento,
            timestamp: serverTimestamp()
        };

        try {
            const ratingRef = doc(db, 'ProductRatings', productId, 'ratings', this.currentUser);
            await setDoc(ratingRef, ratingData);
            
            // Aggiorna cache locale
            this.userRatings[productId] = ratingData;
            
            const isEdit = !!this.userRatings[productId];
            this.showSuccess(`Valutazione ${isEdit ? 'aggiornata' : 'salvata'} con successo!`);
            
            // Chiudi modal
            const modalElement = document.querySelector('.modal.show');
            if (modalElement) {
                bootstrap.Modal.getInstance(modalElement).hide();
            }
            
            // Aggiorna visualizzazione
            this.renderProducts();
            
        } catch (error) {
            console.error('Errore salvataggio valutazione:', error);
            this.showError('Errore nel salvataggio della valutazione');
        }
    }

    updateUserDisplay() {
        const userDisplay = document.getElementById('userNameProdotti');
        if (userDisplay && this.currentUser) {
            userDisplay.textContent = `Benvenuto, ${this.currentUser}!`;
        }
    }

    showSuccess(message) {
        showToast(message, 'success');
    }

    showError(message) {
        showToast(message, 'error');
    }
}

// Istanza globale
window.productRatingManager = new ProductRatingManager();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
    const prodottiTab = document.querySelector('[data-bs-target="#tab-prodotti"]');
    let ratingManager = null;

    if (prodottiTab) {
        prodottiTab.addEventListener('click', async () => {
            if (!ratingManager) {
                ratingManager = window.productRatingManager;
                await ratingManager.init();
            }
        });
    }
});

export { ProductRatingManager };