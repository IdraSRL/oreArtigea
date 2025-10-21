import { db } from "../../common/firebase-config.js";
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { showToast } from "../../common/utils.js";

export class ProductListRenderer {
    constructor() {
        this.onProductUpdated = null;
    }

    renderProductsList(products, ratings, formManager) {
        const productsListContent = document.getElementById('productsListContent');
        if (!productsListContent) return;

        if (products.length === 0) {
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
                        ${products.map(product => this.renderProductRow(product, ratings, formManager)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        productsListContent.innerHTML = tableHtml;

        products.forEach(product => {
            const toggle = document.getElementById(`visibility-toggle-${product.id}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.toggleProductVisibility(product.id, e.target.checked);
                });
            }
        });
    }

    renderProductRow(product, ratings, formManager) {
        const productRatings = ratings[product.id] || [];
        const ratingsCount = productRatings.length;

        let averageRating = 0;
        if (ratingsCount > 0) {
            const totalScore = productRatings.reduce((sum, rating) => {
                return sum + rating.efficacia + rating.profumo + rating.facilita;
            }, 0);
            averageRating = (totalScore / (ratingsCount * 3)).toFixed(1);
        }

        const isVisible = product.visible !== false;

        const productDataId = `product_${product.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (!window.tempProductData) window.tempProductData = {};
        window.tempProductData[productDataId] = product;

        if (!window.productFormManager) window.productFormManager = formManager;

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
                                    onclick="window.productFormManager.openEditModal(window.tempProductData['${productDataId}'])"
                                    title="Modifica prodotto">
                                <i class="fas fa-edit"></i> Modifica
                            </button>
                            <button class="btn btn-info btn-sm px-2 py-1"
                                    onclick="window.productFormManager.duplicateProduct(window.tempProductData['${productDataId}'])"
                                    title="Duplica prodotto">
                                <i class="fas fa-copy"></i> Duplica
                            </button>
                        </div>
                        <button class="btn btn-danger btn-sm px-2 py-1"
                                onclick="window.adminValutazioneManager.deleteProduct('${product.id}')"
                                title="Elimina prodotto">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async deleteProduct(productId) {
        if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

        try {
            await deleteDoc(doc(db, 'Products', productId));
            showToast('Prodotto eliminato con successo!', 'success');

            if (this.onProductUpdated) {
                await this.onProductUpdated();
            }
        } catch (error) {
            showToast('Errore nell\'eliminazione del prodotto', 'error');
        }
    }

    async toggleProductVisibility(productId, visible) {
        try {
            await updateDoc(doc(db, 'Products', productId), {
                visible: visible,
                updatedAt: serverTimestamp()
            });

            showToast(`Prodotto ${visible ? 'reso visibile' : 'nascosto'} ai dipendenti`, 'success');

            if (this.onProductUpdated) {
                await this.onProductUpdated();
            }
        } catch (error) {
            showToast('Errore nell\'aggiornamento della visibilità', 'error');
        }
    }

    renderStats(products, ratings) {
        const totalProducts = products.length;
        const visibleProducts = products.filter(p => p.visible !== false).length;

        const ratedProducts = Object.keys(ratings).filter(productId =>
            ratings[productId] && ratings[productId].length > 0
        ).length;

        let totalRatings = 0;
        let totalScore = 0;
        let scoreCount = 0;

        Object.values(ratings).forEach(productRatings => {
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

    setupImageModal() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image') || e.target.classList.contains('product-detail-image')) {
                this.openImageModal(e.target.src, e.target.alt);
            }
        });

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
}
