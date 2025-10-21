import { db } from "../../common/firebase-config.js";
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

export class ProductDataLoader {
    constructor() {
        this.products = [];
        this.ratings = {};
        this.availableTags = new Set();
    }

    async loadAll() {
        await this.loadProducts();
        await this.loadRatings();
        return { products: this.products, ratings: this.ratings, availableTags: this.availableTags };
    }

    async loadProducts() {
        try {
            const querySnapshot = await getDocs(collection(db, 'Products'));

            this.products = [];
            this.availableTags.clear();

            querySnapshot.forEach((doc) => {
                const productData = {
                    id: doc.id,
                    ...doc.data()
                };
                this.products.push(productData);

                if (productData.tags && Array.isArray(productData.tags)) {
                    productData.tags.forEach(tag => this.availableTags.add(tag));
                }
            });

            return this.products;
        } catch (error) {
            console.warn('Errore caricamento prodotti:', error);
            return [];
        }
    }

    async loadRatings() {
        this.ratings = {};

        try {
            for (const product of this.products) {
                try {
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

            return this.ratings;
        } catch (error) {
            console.warn('Errore caricamento valutazioni:', error);
            return {};
        }
    }

    getProducts() {
        return this.products;
    }

    getRatings() {
        return this.ratings;
    }

    getProductRatings(productId) {
        return this.ratings[productId] || [];
    }

    getAvailableTags() {
        return Array.from(this.availableTags);
    }
}
