import { db } from "../../common/firebase-config.js";
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { showToast } from "../../common/utils.js";

export class ProductFormManager {
    constructor() {
        this.editingProduct = null;
    }

    setupEventListeners() {
        const saveProductBtn = document.getElementById('saveProductBtn');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', () => this.handleSave());
        }

        const imageFileInput = document.getElementById('productImageFile');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }

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

        const tagsInput = document.getElementById('productTags');
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTagFromInput();
                }
            });
        }

        const addProductModal = document.getElementById('addProductModal');
        if (addProductModal) {
            addProductModal.addEventListener('hidden.bs.modal', () => {
                this.resetModal();
            });
        }
    }

    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Seleziona un file immagine valido', 'error');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast('L\'immagine è troppo grande. Massimo 5MB consentiti.', 'error');
                event.target.value = '';
                preview.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);

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

        const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(
            item => item.dataset.tag
        );

        if (existingTags.includes(tagText)) {
            tagsInput.value = '';
            return;
        }

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

    openEditModal(product) {
        this.editingProduct = product;

        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productMarca').value = product.tagMarca || '';
        document.getElementById('productTipo').value = product.tagTipo || '';

        this.setSelectedTags(product.tags || []);

        const imageFileName = product.imageUrl ? product.imageUrl.split('/').pop() : '';
        document.getElementById('productImage').value = imageFileName;

        const fileInput = document.getElementById('productImageFile');
        if (fileInput) {
            fileInput.value = '';
        }

        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
        }

        document.getElementById('productId').disabled = true;

        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Modifica Prodotto';

        document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-save me-1"></i>Aggiorna Prodotto';

        new bootstrap.Modal(document.getElementById('addProductModal')).show();
    }

    duplicateProduct(product) {
        this.editingProduct = null;

        document.getElementById('productId').value = product.id + '-copia';
        document.getElementById('productName').value = product.name + ' (Copia)';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productMarca').value = product.tagMarca || '';
        document.getElementById('productTipo').value = product.tagTipo || '';

        this.setSelectedTags(product.tags || []);

        const imageFileName = product.imageUrl ? product.imageUrl.split('/').pop() : '';
        document.getElementById('productImage').value = imageFileName;

        document.getElementById('productId').disabled = false;

        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-copy me-2"></i>Duplica Prodotto';

        document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-save me-1"></i>Salva Duplicato';

        new bootstrap.Modal(document.getElementById('addProductModal')).show();
    }

    resetModal() {
        this.editingProduct = null;

        const form = document.getElementById('addProductForm');
        if (form) form.reset();

        this.setSelectedTags([]);

        document.getElementById('productId').disabled = false;

        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salva Prodotto';
        }

        const fileInput = document.getElementById('productImageFile');
        if (fileInput) {
            fileInput.value = '';
        }

        document.getElementById('addProductModalLabel').innerHTML = '<i class="fas fa-plus me-2"></i>Aggiungi Nuovo Prodotto';

        const preview = document.getElementById('imagePreview');
        if (preview) preview.style.display = 'none';
    }

    async handleSave() {
        const form = document.getElementById('addProductForm');
        const formData = new FormData(form);

        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

        const productId = this.editingProduct ?
            this.editingProduct.id :
            (formData.get('productId') || '').trim();

        const imageFile = formData.get('productImageFile');
        const imageFileName = (formData.get('productImage') || '').trim();

        let finalImageFileName = '';

        if (imageFile && imageFile.size > 0) {
            try {
                const uploadResult = await this.uploadProductImage(imageFile, productId);
                if (!uploadResult.success) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    showToast(uploadResult.message, 'error');
                    return;
                }
                finalImageFileName = uploadResult.fileName;
            } catch (error) {
                console.error('Errore upload immagine:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                showToast('Errore durante il caricamento dell\'immagine. Usa il campo nome file manuale.', 'error');
                return;
            }
        } else if (imageFileName) {
            finalImageFileName = imageFileName;
        } else if (this.editingProduct && this.editingProduct.imageUrl) {
            finalImageFileName = this.editingProduct.imageUrl.split('/').pop();
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showToast('Seleziona un\'immagine da caricare o inserisci il nome di un file esistente', 'error');
            return;
        }

        const safeImageFileName = finalImageFileName || 'default.jpg';

        let imagePath;
        if (window.location.pathname.includes('/pages/')) {
            imagePath = `../assets/img/products/${safeImageFileName}`;
        } else {
            imagePath = `assets/img/products/${safeImageFileName}`;
        }

        const productData = {
            id: productId,
            name: (formData.get('productName') || '').trim(),
            description: (formData.get('productDescription') || '').trim(),
            imageUrl: imagePath,
            tagMarca: (formData.get('productMarca') || '').trim(),
            tagTipo: (formData.get('productTipo') || '').trim(),
            tags: this.getSelectedTags(),
            visible: this.editingProduct ? this.editingProduct.visible : true,
            updatedAt: serverTimestamp()
        };

        if (!this.editingProduct) {
            productData.createdAt = serverTimestamp();
        }

        if (!productData.id || !productData.name || !productData.tagMarca || !productData.tagTipo) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showToast('Tutti i campi sono obbligatori', 'error');
            return;
        }

        try {
            await setDoc(doc(db, 'Products', productData.id), productData);

            const action = this.editingProduct ? 'aggiornato' : 'aggiunto';
            showToast(`Prodotto ${action} con successo!`, 'success');

            this.closeModalSafely();

            return { success: true, productData };
        } catch (error) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showToast('Errore nel salvataggio del prodotto', 'error');
            return { success: false, error };
        }
    }

    closeModalSafely() {
        const modalElement = document.getElementById('addProductModal');
        const modal = bootstrap.Modal.getInstance(modalElement);

        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salva Prodotto';
        }

        if (modal) {
            modal.hide();
        }

        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });

            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            this.resetModal();
        }, 500);
    }

    async uploadProductImage(file, productId) {
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
}
