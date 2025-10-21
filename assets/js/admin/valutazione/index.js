import { ProductDataLoader } from './product-data-loader.js';
import { ProductFormManager } from './product-form-manager.js';
import { ProductChartRenderer } from './product-chart-renderer.js';
import { ProductListRenderer } from './product-list-renderer.js';

class AdminValutazioneManager {
    constructor() {
        this.dataLoader = new ProductDataLoader();
        this.formManager = new ProductFormManager();
        this.chartRenderer = new ProductChartRenderer();
        this.listRenderer = new ProductListRenderer();

        this.products = [];
        this.ratings = {};
        this.isInitialized = false;
        this.currentView = 'dashboard';

        this.listRenderer.onProductUpdated = () => this.refresh();
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

        const dashboardBtn = document.getElementById('viewDashboardBtn');
        const productsBtn = document.getElementById('viewProductsBtn');

        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => this.switchView('dashboard'));
        }

        if (productsBtn) {
            productsBtn.addEventListener('click', () => this.switchView('products'));
        }

        this.formManager.setupEventListeners();
        this.listRenderer.setupImageModal();
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
            const data = await this.dataLoader.loadAll();
            this.products = data.products;
            this.ratings = data.ratings;
        } catch (error) {
            console.error('Errore nel caricamento dati valutazioni:', error);
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

        this.listRenderer.renderStats(this.products, this.ratings);
        this.chartRenderer.renderProductCharts(this.products, this.ratings);
    }

    renderProductsList() {
        this.listRenderer.renderProductsList(this.products, this.ratings, this.formManager);
    }

    async deleteProduct(productId) {
        await this.listRenderer.deleteProduct(productId);
        await this.loadData();
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        } else {
            this.renderProductsList();
        }
    }
}

window.adminValutazioneManager = new AdminValutazioneManager();

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
});

export { AdminValutazioneManager };
