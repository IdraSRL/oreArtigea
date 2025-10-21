export class ProductChartRenderer {
    constructor() {
        this.charts = {};
    }

    renderProductCharts(products, ratings) {
        const chartsContainer = document.getElementById('productsChartsContainer');
        if (!chartsContainer) return;

        chartsContainer.innerHTML = '';

        products.forEach(product => {
            const productRatings = ratings[product.id] || [];
            if (productRatings.length === 0) return;

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

            const overallAvg = (parseFloat(efficaciaAvg) + parseFloat(profumoAvg) + parseFloat(facilitaAvg)) / 3;

            let ratingClass = '';
            if (overallAvg < 4) {
                ratingClass = 'border-danger';
            } else if (overallAvg < 7) {
                ratingClass = 'border-warning';
            } else {
                ratingClass = 'border-success';
            }

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
                            label: function (context) {
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

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}
