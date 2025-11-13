import { DatabaseService } from './database-service.js';

export class ProductService {
  static PRODUCTS_TABLE = 'products';
  static RATINGS_TABLE = 'product_ratings';

  static async getAllProducts() {
    return await DatabaseService.query(this.PRODUCTS_TABLE, {
      filters: { is_active: true },
      order: { column: 'nome', ascending: true }
    });
  }

  static async getProductById(productId) {
    return await DatabaseService.query(this.PRODUCTS_TABLE, {
      filters: { product_id: productId },
      single: true
    });
  }

  static async createProduct(productData) {
    const data = {
      product_id: productData.productId,
      nome: productData.nome,
      descrizione: productData.descrizione || null,
      marca: productData.marca || null,
      tipo: productData.tipo || null,
      image_url: productData.imageUrl || null,
      tags: productData.tags || [],
      is_active: true,
      visible: productData.visible ?? true,
      created_at: new Date().toISOString()
    };

    return await DatabaseService.insert(this.PRODUCTS_TABLE, data);
  }

  static async updateProduct(id, productData) {
    const data = {
      nome: productData.nome,
      descrizione: productData.descrizione || null,
      marca: productData.marca || null,
      tipo: productData.tipo || null,
      image_url: productData.imageUrl || null,
      tags: productData.tags || [],
      visible: productData.visible ?? true,
      updated_at: new Date().toISOString()
    };

    return await DatabaseService.update(this.PRODUCTS_TABLE, id, data);
  }

  static async deleteProduct(id) {
    return await DatabaseService.update(this.PRODUCTS_TABLE, id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
  }

  static async addRating(ratingData) {
    const data = {
      product_id: ratingData.productId,
      employee_id: ratingData.employeeId,
      rating: ratingData.rating,
      comment: ratingData.comment || null,
      created_at: new Date().toISOString()
    };

    return await DatabaseService.insert(this.RATINGS_TABLE, data);
  }

  static async getRatingsForProduct(productId) {
    return await DatabaseService.query(this.RATINGS_TABLE, {
      filters: { product_id: productId },
      order: { column: 'created_at', ascending: false }
    });
  }

  static async getProductsWithRatings() {
    const productsResult = await this.getAllProducts();
    if (!productsResult.success) return productsResult;

    const products = productsResult.data;
    const productsWithRatings = [];

    for (const product of products) {
      const ratingsResult = await this.getRatingsForProduct(product.product_id);
      const ratings = ratingsResult.success ? ratingsResult.data : [];

      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      productsWithRatings.push({
        ...product,
        ratings,
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalRatings: ratings.length
      });
    }

    return { success: true, data: productsWithRatings };
  }
}
