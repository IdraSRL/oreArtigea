// admin-valutazione.js - Gestione valutazioni prodotti nel pannello admin
import { db } from "../../common/firebase-config.js";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { showToast } from "../../common/utils.js";

class AdminValutazioneManager {
    constructor() {
        this.products = [];
        this.ratings = {};
        this.charts = {};
        this.isInitialized = false;
        this.currentView = 'dashboard'; // 'dashboard' | 'products'
        this.editingProduct = null; // Per tracciare il prodotto in modifica
        this.availableTags = new Set(); // Per tracciare i tag disponibili
    }

    async init() {
        if (this.isInitialized) {
            return;
        }
        
        this.setupEventListeners();
        await this.loadData();
        this.renderDashboard();
        this.isInitialized = true;
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshProductsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Form aggiunta prodotto
        const saveProductBtn = document.getElementById('saveProductBtn');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', () => this.handleAddProduct());
        }

        // Preview immagine
        const imageFileInput = document.getElementById('productImageFile');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }

        // Auto-genera ID prodotto dal nome
        const productNameInput = document.getElementById('productName');
        const productIdInput = document.getElementById('productId');
        if (productNameInput && productIdInput) {
            productNameInput.addEventListener('input', (e) => {
                if (!productIdInput.value || !this.editingProduct) {
                    const autoId = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '-')
                        .substring(0, 30);
                    productIdInput.value = autoId;
                }
            });
        }

        // Gestione tag input
        const tagsInput = document.getElementById('productTags');
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTagFromInput();
                }
            });
        }

        // Toggle view buttons
        const dashboardBtn = document.getElementById('viewDashboardBtn');
        const productsBtn = document.getElementById('viewProductsBtn');
        
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => this.switchView('dashboard'));
        }
        
        if (productsBtn) {
            productsBtn.addEventListener('click', () => this.switchView('products'));
        }

        // Setup image modal functionality
        this.setupImageModal();
    }

    switchView(view) {
        this.currentView = view;
        const dashboardContent = document.getElementById('dashboardProductsContent');
        const productsListContent = document.getElementById('productsListContent');
        const dashboardBtn = document.getElementById('viewDashboardBtn');
        const productsBtn = document.getElementById('viewProductsBtn');

        if (view === 'dashboard') {
            if (dashboardContent) dashboardContent.style.display = 'block';
            if (productsListContent) productsListContent.style.display = 'none';
            if (dashboardBtn) dashboardBtn.classList.add('active');
            if (productsBtn) productsBtn.classList.remove('active');
            this.renderDashboard();
        } else {
            if (dashboardContent) dashboardContent.style.display = 'none';
            if (productsListContent) productsListContent.style.display = 'block';
            if (dashboardBtn) dashboardBtn.classList.remove('active');
            if (productsBtn) productsBtn.classList.add('active');
            this.renderProductsList();
        }
    }

    setupImageModal() {
        // Riutilizza la logica del modal per le immagini
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image') || e.target.classList.contains('product-detail-image')) {
                this.openImageModal(e.target.src, e.target.alt);
            }
        });

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

    async refresh() {
        const refreshBtn = document.getElementById('refreshProductsBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
            refreshBtn.disabled = true;

            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }

            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    async loadData() {
        try {
            await this.loadProducts();
            await this.loadRatings();
        } catch (error) {
            console.error('Errore nel caricamento dati valutazioni:', error);
            this.showError('Errore nel caricamento dei dati valutazioni.');
        }
    }

    async loadProducts() {
        try {
            // Carica dalla collezione Products
            const querySnapshot = await getDocs(collection(db, 'Products'));
            
            this.products = [];
            
            querySnapshot.forEach((doc) => {
                const productData = {
                    id: doc.id,
                    ...doc.data()
                };
                this.products.push(productData);
                
                // Raccogli i tag per il sistema di filtri
                if (productData.tags && Array.isArray(productData.tags)) {
                    productData.tags.forEach(tag => this.availableTags.add(tag));
                }
            });

        } catch (error) {
            console.warn('Errore caricamento prodotti:', error);
        }
    }

    async loadRatings() {
        this.ratings = {};
        
        try {
            for (const product of this.products) {
                try {
                    // Carica tutte le valutazioni per questo prodotto
                    const ratingsRef = collection(db, 'ProductRatings', product.id, 'ratings');
                    const querySnapshot = await getDocs(ratingsRef);
                    
                    this.ratings[product.id] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        this.ratings[product.id].push({
                            userId: doc.id,
                            ...data
                        });
                    });
                } catch (error) {
                    this.ratings[product.id] = [];
                }
            }
            
        } catch (error) {
            console.warn('Errore caricamento valutazioni:', error);
        }
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        if (file) {
            // Verifica tipo file
            if (!file.type.startsWith('image/')) {
                this.showError('Seleziona un file immagine valido');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }
            
            // Verifica dimensione (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }
            
            // Mostra anteprima
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Pulisci il campo nome file manuale
            const manualInput = document.getElementById('productImage');
            if (manualInput) {
                manualInput.value = '';
            }
        } else {
            preview.style.display = 'none';
        }
    }

    addTagFromInput() {
        const tagsInput = document.getElementById('productTags');
        const tagsContainer = document.getElementById('selectedTags');
        
        if (!tagsInput || !tagsContainer) return;
        
        const tagText = tagsInput.value.trim().toLowerCase();
        if (!tagText) return;
        
        // Evita duplicati
        const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(
            item => item.dataset.tag
        );
        
        if (existingTags.includes(tagText)) {
            tagsInput.value = '';
            return;
        }
        
        // Crea elemento tag
        const tagElement = document.createElement('span');
        tagElement.className = 'badge bg-info me-1 mb-1 tag-item';
        tagElement.dataset.tag = tagText;
        tagElement.innerHTML = `
            ${tagText}
            <button type="button" class="btn-close btn-close-white ms-1" style="font-size: 0.7em;" onclick="this.parentElement.remove()"></button>
        `;
        
        tagsContainer.appendChild(tagElement);
        tagsInput.value = '';
    }

    getSelectedTags() {
        const tagsContainer = document.getElementById('selectedTags');
        if (!tagsContainer) return [];
        
        return Array.from(tagsContainer.querySelectorAll('.tag-item')).map(
            item => item.dataset.tag
        );
    }

    setSelectedTags(tags) {
        const tagsContainer = document.getElementById('selectedTags');
        if (!tagsContainer || !Array.isArray(tags)) return;
        
        tagsContainer.innerHTML = '';
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'badge bg-info me-1 mb-1 tag-item';
            tagElement.dataset.tag = tag;
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="btn-close btn-close-white ms-1" style="font-size: 0.7em;" onclick="this.parentElement.remove()"></button>
            `;
            tagsContainer.appendChild(tagElement);
        });
    }

    // Nuova funzione per aprire il modal in modalità modifica
    openEditModal(product) {
        this.editingProduct = product;
        
        // Popola i campi del form con i dati del prodotto
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productMarca').value = product.tagMarca || '';
        document.getElementById('productTipo').value = product.tagTipo || '';
        
        // Imposta i tag
        this.setSelectedTags(product.tags || []);
        
        // Estrai il nome del file dall'URL dell'immagine
        const imageFileName = product.imageUrl ? product.imageUrl.split('/').pop() : '';
        document.getElementById('productImage').value = imageFileName;
        
        // Reset del campo file upload per evitare conflitti
        const fileInput = document.getElementById('productImageFile');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Nascondi preview se presente
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
        }
        
        // Disabilita il campo ID in modalità modifica
        document.getElementById('productId').disabled = true;
        
        // Cambia il titolo del modal
        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Prodotto';
        
        // Cambia il testo del pulsante
        document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-save me-1"></i>Aggiorna Prodotto';
        
        // Mostra il modal
        new bootstrap.Modal(document.getElementById('addProductModal')).show();
    }

    // Nuova funzione per duplicare un prodotto
    duplicateProduct(product) {
        this.editingProduct = null; // Non è una modifica, è una duplicazione
        
        // Popola i campi del form con i dati del prodotto da duplicare
        document.getElementById('productId').value = product.id + '-copia';
        document.getElementById('productName').value = product.name + ' (Copia)';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productMarca').value = product.tagMarca || '';
        document.getElementById('productTipo').value = product.tagTipo || '';
        
        // Duplica i tag
        this.setSelectedTags(product.tags || []);
        
        // Estrai il nome del file dall'URL dell'immagine
        const imageFileName = product.imageUrl ? product.imageUrl.split('/').pop() : '';
        document.getElementById('productImage').value = imageFileName;
        
        // Assicurati che il campo ID sia abilitato
        document.getElementById('productId').disabled = false;
        
        // Cambia il titolo del modal
        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-copy me-2"></i>Duplica Prodotto';
        
        // Cambia il testo del pulsante
        document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-save me-1"></i>Salva Duplicato';
        
        // Mostra il modal
        new bootstrap.Modal(document.getElementById('addProductModal')).show();
    }

    // Reset del modal per nuovi prodotti
    resetModal() {
        this.editingProduct = null;
        
        // Reset form
        document.getElementById('addProductForm').reset();
        
        // Reset tag
        this.setSelectedTags([]);
        
        // Riabilita il campo ID
        document.getElementById('productId').disabled = false;
        
        // Riabilita e reset pulsante salvataggio
        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salva Prodotto';
        }
        
        // Reset campo file upload
        const fileInput = document.getElementById('productImageFile');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Reset titolo e pulsante
        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-plus me-2"></i>Aggiungi Nuovo Prodotto';
        
        // Nascondi preview
        const preview = document.getElementById('imagePreview');
        if (preview) preview.style.display = 'none';
    }

    async handleAddProduct() {
        const form = document.getElementById('addProductForm');
        const formData = new FormData(form);
        
        // Disabilita il pulsante di salvataggio per prevenire doppi click
        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
        
        // Se stiamo modificando, usa l'ID del prodotto esistente, altrimenti prendi dal form
        const productId = this.editingProduct ? 
            this.editingProduct.id : 
            (formData.get('productId') || '').trim();
        
        // Gestione immagine: solo se è un nuovo prodotto o se è stata selezionata una nuova immagine
        const imageFile = formData.get('productImageFile');
        const imageFileName = (formData.get('productImage') || '').trim();
        
        let finalImageFileName = '';
        
        if (imageFile && imageFile.size > 0) {
            // C'è un file da caricare
            try {
                const uploadResult = await this.uploadProductImage(imageFile, productId);
                if (!uploadResult.success) {
                    // Riabilita il pulsante in caso di errore
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    this.showError(uploadResult.message);
                    return;
                }
                finalImageFileName = uploadResult.fileName;
            } catch (error) {
                console.error('Errore upload immagine:', error);
                // Riabilita il pulsante in caso di errore
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                this.showError('Errore durante il caricamento dell\'immagine. Usa il campo nome file manuale.');
                return;
            }
        } else if (imageFileName) {
            // Usa il nome file inserito manualmente
            finalImageFileName = imageFileName;
        } else if (this.editingProduct && this.editingProduct.imageUrl) {
            // In modifica senza nuova immagine: mantieni quella esistente
            finalImageFileName = this.editingProduct.imageUrl.split('/').pop();
        } else {
            // Nuovo prodotto senza immagine
            // Riabilita il pulsante in caso di errore
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            this.showError('Seleziona un\'immagine da caricare o inserisci il nome di un file esistente');
            return;
        }
        
        // Assicurati che il nome file sia valido
        const safeImageFileName = finalImageFileName || 'default.jpg';
        
        // Determina il percorso corretto in base alla posizione della pagina
        let imagePath;
        if (window.location.pathname.includes('/pages/')) {
            // Siamo in una sottocartella, usa percorso relativo
            imagePath = `../assets/img/products/${safeImageFileName}`;
        } else {
            // Siamo nella root, usa percorso diretto
            imagePath = `assets/img/products/${safeImageFileName}`;
        }
        
        const productData = {
            id: productId,
            name: (formData.get('productName') || '').trim(),
            description: (formData.get('productDescription') || '').trim(),
            imageUrl: imagePath,
            tagMarca: (formData.get('productMarca') || '').trim(),
            tagTipo: (formData.get('productTipo') || '').trim(),
            tags: this.getSelectedTags(), // Aggiungi i tag selezionati
            visible: this.editingProduct ? this.editingProduct.visible : true,
            updatedAt: serverTimestamp()
        };

        // Se è un nuovo prodotto, aggiungi createdAt
        if (!this.editingProduct) {
            productData.createdAt = serverTimestamp();
        }

        // Validazione
        if (!productData.id || !productData.name || !productData.tagMarca || !productData.tagTipo) {
            // Riabilita il pulsante in caso di errore
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            this.showError('Tutti i campi sono obbligatori');
            return;
        }
        

        // Verifica se l'ID esiste già (solo per nuovi prodotti)
        if (!this.editingProduct && this.products.find(p => p.id === productData.id)) {
            // Riabilita il pulsante in caso di errore
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            this.showError('Un prodotto con questo ID esiste già');
            return;
        }
        

        try {
            await setDoc(doc(db, 'Products', productData.id), productData);
            
            const action = this.editingProduct ? 'aggiornato' : 'aggiunto';
            this.showSuccess(`Prodotto ${action} con successo!`);
            
            // Chiudi modal in modo più robusto
            this.closeModalSafely();
            
            // Ricarica i dati e aggiorna la vista
            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }
        } catch (error) {
            // Riabilita il pulsante in caso di errore
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            this.showError('Errore nel salvataggio del prodotto');
        }
    }

    closeModalSafely() {
        const modalElement = document.getElementById('addProductModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        
        // Riabilita il pulsante di salvataggio prima di chiudere
        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salva Prodotto';
        }
        
        if (modal) {
            modal.hide();
        }
        
        // Cleanup completo con timeout più lungo
        setTimeout(() => {
            // Rimuovi tutti i backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });
            
            // Reset body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Reset del form
            this.resetModal();
            
            // Forza re-render per evitare stati inconsistenti
            if (this.currentView === 'products') {
                this.renderProductsList();
            }
        }, 500);
    }

    async uploadProductImage(file, productId) {
        // Determina il percorso corretto dell'API
        let apiPath;
        if (window.location.pathname.includes('/pages/')) {
            apiPath = '../api/upload-product-image.php';
        } else {
            apiPath = 'api/upload-product-image.php';
        }
        
        const formData = new FormData();
        formData.append('productImage', file);
        formData.append('productId', productId);
        

        try {
            const response = await fetch(apiPath, {
                method: 'POST',
                body: formData
            });


            if (!response.ok) {
                return {
                    success: false,
                    message: `Errore server HTTP ${response.status}. Usa il campo nome file manuale.`
                };
            }

            const responseText = await response.text();
            
            // Verifica se la risposta contiene HTML di errore PHP
            if (responseText.includes('<br />') || responseText.includes('<?php') || responseText.includes('<html>')) {
                return {
                    success: false,
                    message: 'Errore del server PHP. Verifica la configurazione o usa il campo nome file manuale.'
                };
            }
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                return {
                    success: false,
                    message: 'Risposta del server non valida. Usa il campo nome file manuale.'
                };
            }
            
            return result;
        } catch (error) {
            // Se l'errore è di rete, potrebbe essere un problema di configurazione server
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return {
                    success: false,
                    message: 'Errore di connessione al server. Verifica la configurazione del server o usa il campo nome file manuale.'
                };
            }
            
            return {
                success: false,
                message: `Errore durante l'upload: ${error.message}. Usa il campo nome file manuale.`
            };
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

        try {
            await deleteDoc(doc(db, 'Products', productId));
            this.showSuccess('Prodotto eliminato con successo!');
            await this.loadData();
            if (this.currentView === 'dashboard') {
                this.renderDashboard();
            } else {
                this.renderProductsList();
            }
        } catch (error) {
            this.showError('Errore nell\'eliminazione del prodotto');
        }
    }

    async toggleProductVisibility(productId, visible) {
        try {
            await updateDoc(doc(db, 'Products', productId), {
                visible: visible,
                updatedAt: serverTimestamp()
            });
            
            // Aggiorna il prodotto locale
            const product = this.products.find(p => p.id === productId);
            if (product) {
                product.visible = visible;
            }
            
            this.showSuccess(`Prodotto ${visible ? 'reso visibile' : 'nascosto'} ai dipendenti`);
        } catch (error) {
            this.showError('Errore nell\'aggiornamento della visibilità');
        }
    }

    renderDashboard() {
        const loadingElement = document.getElementById('loadingProductsMessage');
        const dashboardContent = document.getElementById('dashboardProductsContent');
        const noDataElement = document.getElementById('noProductsData');

        if (loadingElement) loadingElement.style.display = 'none';

        const hasData = this.products.length > 0 && Object.keys(this.ratings).some(key => this.ratings[key].length > 0);

        if (!hasData) {
            if (noDataElement) noDataElement.style.display = 'block';
            if (dashboardContent) dashboardContent.style.display = 'none';
            return;
        }

        if (noDataElement) noDataElement.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';

        this.renderStats();
        this.renderProductCharts();
    }

    renderProductsList() {
        const productsListContent = document.getElementById('productsListContent');
        if (!productsListContent) return;

        if (this.products.length === 0) {
            productsListContent.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-box fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nessun prodotto disponibile</h4>
                    <p class="text-muted">Aggiungi il primo prodotto per iniziare.</p>
                </div>
            `;
            return;
        }

        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Immagine</th>
                            <th>Nome</th>
                            <th>Marca</th>
                            <th>Tipo</th>
                            <th>Valutazioni</th>
                            <th>Media</th>
                            <th style="width: 120px;">Visibilità</th>
                            <th style="width: 140px;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.products.map(product => this.renderProductRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        productsListContent.innerHTML = tableHtml;

        // Aggiungi event listeners per i toggle di visibilità
        this.products.forEach(product => {
            const toggle = document.getElementById(`visibility-toggle-${product.id}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.toggleProductVisibility(product.id, e.target.checked);
                });
            }
        });
    }

    renderProductRow(product) {
        const productRatings = this.ratings[product.id] || [];
        const ratingsCount = productRatings.length;
        
        let averageRating = 0;
        if (ratingsCount > 0) {
            const totalScore = productRatings.reduce((sum, rating) => {
                return sum + rating.efficacia + rating.profumo + rating.facilita;
            }, 0);
            averageRating = (totalScore / (ratingsCount * 3)).toFixed(1);
        }

        const isVisible = product.visible !== false; // Default true se non specificato

        // Crea un ID univoco per questo prodotto per evitare problemi con JSON
        const productDataId = `product_${product.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Salva i dati del prodotto in una variabile globale temporanea
        if (!window.tempProductData) window.tempProductData = {};
        window.tempProductData[productDataId] = product;
        
        return `
            <tr>
                <td>
                    <img src="${product.imageUrl}" 
                         alt="${product.name}" 
                         class="product-image" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer;"
                         onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                </td>
                <td>
                    <div>
                        <strong>${product.name}</strong>
                        <br>
                        <small class="text-muted">${product.description || 'Nessuna descrizione'}</small>
                        ${product.tags && product.tags.length > 0 ? `
                        <div class="mt-1">
                            ${product.tags.map(tag => `<span class="badge bg-dark me-1">${tag}</span>`).join('')}
                        </div>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${product.tagMarca || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge bg-secondary">${product.tagTipo || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${ratingsCount > 0 ? 'bg-success' : 'bg-warning'}">${ratingsCount}</span>
                </td>
                <td class="text-center">
                    ${ratingsCount > 0 ? 
                        `<strong class="text-warning">${averageRating}/10</strong>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td class="text-center">
                    <div class="form-check form-switch">
                        <input class="form-check-input" 
                               type="checkbox" 
                               id="visibility-toggle-${product.id}"
                               ${isVisible ? 'checked' : ''}>
                        <label class="form-check-label small" for="visibility-toggle-${product.id}">
                            ${isVisible ? 'Visibile' : 'Nascosto'}
                        </label>
                    </div>
                </td>
                <td class="text-center">
                    <div class="d-flex flex-column gap-1 justify-content-center">
                        <div class="d-flex gap-1">
                            <button class="btn btn-warning btn-sm px-2 py-1" 
                                    onclick="adminValutazioneManager.openEditModal(window.tempProductData['${productDataId}'])"
                                    title="Modifica prodotto">
                                <i class="fas fa-edit"></i> Modifica
                            </button>
                            <button class="btn btn-info btn-sm px-2 py-1" 
                                    onclick="adminValutazioneManager.duplicateProduct(window.tempProductData['${productDataId}'])"
                                    title="Duplica prodotto">
                                <i class="fas fa-copy"></i> Duplica
                            </button>
                        </div>
                        <button class="btn btn-danger btn-sm px-2 py-1" 
                                onclick="adminValutazioneManager.deleteProduct('${product.id}')"
                                title="Elimina prodotto">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderStats() {
        const totalProducts = this.products.length;
        const visibleProducts = this.products.filter(p => p.visible !== false).length;
        
        // Conta solo i prodotti che hanno almeno 1 valutazione
        const ratedProducts = Object.keys(this.ratings).filter(productId => 
            this.ratings[productId] && this.ratings[productId].length > 0
        ).length;
        
        let totalRatings = 0;
        let totalScore = 0;
        let scoreCount = 0;

        Object.values(this.ratings).forEach(productRatings => {
            totalRatings += productRatings.length;
            productRatings.forEach(rating => {
                totalScore += rating.efficacia + rating.profumo + rating.facilita;
                scoreCount += 3;
            });
        });

        const overallAverage = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;

        const ratedProductsEl = document.getElementById('totalProductsCount');
        const visibleProductsEl = document.getElementById('visibleProductsCount');
        const totalRatingsEl = document.getElementById('totalRatingsCount');
        const overallAverageEl = document.getElementById('overallAverageScore');
        const lastUpdateEl = document.getElementById('lastUpdateTime');

        if (ratedProductsEl) ratedProductsEl.textContent = ratedProducts;
        if (visibleProductsEl) visibleProductsEl.textContent = visibleProducts;
        if (totalRatingsEl) totalRatingsEl.textContent = totalRatings;
        if (overallAverageEl) overallAverageEl.textContent = overallAverage;
        if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleString('it-IT');
    }

    renderProductCharts() {
        const chartsContainer = document.getElementById('productsChartsContainer');
        if (!chartsContainer) return;

        // Pulisci container esistente
        chartsContainer.innerHTML = '';

        // Crea un grafico per ogni prodotto
        this.products.forEach(product => {
            const productRatings = this.ratings[product.id] || [];
            if (productRatings.length === 0) return;

            // Calcola medie per questo prodotto
            let efficaciaSum = 0, profumoSum = 0, facilitaSum = 0;
            productRatings.forEach(rating => {
                efficaciaSum += rating.efficacia;
                profumoSum += rating.profumo;
                facilitaSum += rating.facilita;
            });

            const count = productRatings.length;
            const efficaciaAvg = (efficaciaSum / count).toFixed(1);
            const profumoAvg = (profumoSum / count).toFixed(1);
            const facilitaAvg = (facilitaSum / count).toFixed(1);

            // Calcola media generale per colorazione
            const overallAvg = (parseFloat(efficaciaAvg) + parseFloat(profumoAvg) + parseFloat(facilitaAvg)) / 3;
            
            // Determina classe di rating
            let ratingClass = '';
            if (overallAvg < 4) {
                ratingClass = 'border-danger';
            } else if (overallAvg < 7) {
                ratingClass = 'border-warning';
            } else {
                ratingClass = 'border-success';
            }

            // Crea card del grafico
            const chartCard = document.createElement('div');
            chartCard.className = 'col-lg-6 col-xl-4';
            chartCard.innerHTML = `
                <div class="card bg-secondary ${ratingClass} h-100">
                    <div class="card-header bg-dark text-light p-2">
                        <div class="d-flex align-items-start gap-2">
                            <img src="${product.imageUrl}" 
                                 alt="${product.name}" class="product-image flex-shrink-0" 
                                 style="width: 45px; height: 45px; border-radius: 6px; cursor: pointer;"
                                 onerror="this.src='https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=60'">
                            <div class="flex-grow-1 min-w-0">
                                <h6 class="mb-1 text-truncate" title="${product.name}">${product.name}</h6>
                                <div class="small text-muted mb-1">${count} val. - ${overallAvg.toFixed(1)}/10</div>
                                <div class="d-flex flex-wrap gap-1 mb-1">
                                    <span class="badge bg-primary small">${product.tagMarca || 'N/A'}</span>
                                    <span class="badge bg-secondary small">${product.tagTipo || 'N/A'}</span>
                                    ${product.visible === false ? '<span class="badge bg-warning text-dark small">Nascosto</span>' : ''}
                                </div>
                                ${product.tags && product.tags.length > 0 ? `
                                <div class="d-flex flex-wrap gap-1">
                                    ${product.tags.slice(0, 3).map(tag => `<span class="badge bg-dark small">${tag}</span>`).join('')}
                                    ${product.tags.length > 3 ? `<span class="badge bg-outline-light small">+${product.tags.length - 3}</span>` : ''}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="height: 250px;">
                            <canvas id="chart-${product.id}"></canvas>
                        </div>
                        <div class="mt-3">
                            <h6 class="text-light">Valutazioni per dipendente:</h6>
                            <div class="small text-muted" style="max-height: 100px; overflow-y: auto;">
                                ${productRatings.map(r => `<div>${r.employeeName}: ${((r.efficacia + r.profumo + r.facilita) / 3).toFixed(1)}/10</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            chartsContainer.appendChild(chartCard);

            // Crea grafico
            this.createProductChart(product.id, {
                efficacia: parseFloat(efficaciaAvg),
                profumo: parseFloat(profumoAvg),
                facilita: parseFloat(facilitaAvg)
            });
        });
    }

    createProductChart(productId, averages) {
        const canvas = document.getElementById(`chart-${productId}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Distruggi grafico esistente se presente
        if (this.charts[productId]) {
            this.charts[productId].destroy();
        }

        this.charts[productId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Efficacia', 'Profumo', 'Facilità d\'uso'],
                datasets: [{
                    label: 'Media Valutazioni',
                    data: [averages.efficacia, averages.profumo, averages.facilita],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)', 
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#f1f5f9',
                        borderColor: '#334155',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.y + '/10';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.3)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.3)'
                        }
                    }
                }
            }
        });
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        showToast(message, 'error');
    }
    
    showSuccess(message) {
        showToast(message, 'success');
    }
}

// Istanza globale
window.adminValutazioneManager = new AdminValutazioneManager();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
    const valutazioneTab = document.getElementById('valutazione-tab');
    let valutazioneManager = null;

    if (valutazioneTab) {
        valutazioneTab.addEventListener('shown.bs.tab', async () => {
            if (!valutazioneManager) {
                valutazioneManager = window.adminValutazioneManager;
                await valutazioneManager.init();
            }
        });
    }

    // Reset del modal quando viene chiuso
    const addProductModal = document.getElementById('addProductModal');
    if (addProductModal) {
        addProductModal.addEventListener('hidden.bs.modal', () => {
            if (window.adminValutazioneManager) {
                window.adminValutazioneManager.resetModal();
            }
        });
    }
});

export { AdminValutazioneManager };