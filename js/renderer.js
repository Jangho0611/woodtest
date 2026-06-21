class CuttingRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.padding = 44;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    render(binWidth, binHeight, placedItems) {
        const wrapper = this.canvas.parentElement;
        const displayWidth = Math.max((wrapper?.clientWidth || window.innerWidth) - 48, 320);
        const displayHeight = Math.max(displayWidth * (binHeight / binWidth), 260);
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.clearRect(0, 0, displayWidth, displayHeight);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.zoom, this.zoom);

        const scale = Math.min(
            (displayWidth - this.padding * 2) / binWidth,
            (displayHeight - this.padding * 2) / binHeight
        );
        const boardWidth = binWidth * scale;
        const boardHeight = binHeight * scale;
        const x = (displayWidth - boardWidth) / 2;
        const y = (displayHeight - boardHeight) / 2;

        this.drawBoard(x, y, boardWidth, boardHeight, scale);
        const legend = this.buildLegend(placedItems);

        placedItems.forEach((item) => {
            this.drawPart(item, x, y, scale, legend.sizeMap);
        });

        this.drawDimensions(x, y, boardWidth, boardHeight, binWidth, binHeight);
        this.ctx.restore();

        return legend.items;
    }

    buildLegend(placedItems) {
        const sizeMap = {};
        const items = [];
        let nextId = 1;

        placedItems.forEach((item) => {
            const w = item.rotated ? item.height : item.width;
            const h = item.rotated ? item.width : item.height;
            const key = `${w}x${h}`;

            if (w < 200 && h < 200) {
                if (!sizeMap[key]) {
                    sizeMap[key] = nextId;
                    items.push({ id: nextId, width: w, height: h, count: 0 });
                    nextId += 1;
                }
                const target = items.find((entry) => entry.id === sizeMap[key]);
                if (target) target.count += 1;
            }
        });

        return { sizeMap, items };
    }

    drawBoard(x, y, width, height, scale) {
        this.ctx.fillStyle = '#e8dcc6';
        this.ctx.fillRect(x, y, width, height);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.clip();

        this.ctx.strokeStyle = 'rgba(139, 90, 43, 0.28)';
        this.ctx.lineWidth = 1.2;
        for (let gy = y + 12; gy < y + height; gy += 18) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, gy);
            for (let gx = x; gx <= x + width; gx += 58) {
                this.ctx.quadraticCurveTo(gx + 24, gy + Math.sin(gx * 0.03) * 4, gx + 58, gy);
            }
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(47, 79, 70, 0.12)';
        this.ctx.lineWidth = 1;
        const grid = Math.max(100 * scale, 18);
        for (let gx = x + grid; gx < x + width; gx += grid) {
            this.ctx.beginPath();
            this.ctx.moveTo(gx, y);
            this.ctx.lineTo(gx, y + height);
            this.ctx.stroke();
        }
        for (let gy = y + grid; gy < y + height; gy += grid) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, gy);
            this.ctx.lineTo(x + width, gy);
            this.ctx.stroke();
        }
        this.ctx.restore();

        this.ctx.strokeStyle = '#8b5a2b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
    }

    drawPart(item, boardX, boardY, scale, sizeMap) {
        const w = (item.rotated ? item.height : item.width) * scale;
        const h = (item.rotated ? item.width : item.height) * scale;
        const x = boardX + item.x * scale;
        const y = boardY + item.y * scale;
        const originalW = item.rotated ? item.height : item.width;
        const originalH = item.rotated ? item.width : item.height;
        const key = `${originalW}x${originalH}`;

        this.ctx.save();
        this.ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + 1, y + 1, Math.max(w - 2, 1), Math.max(h - 2, 1));

        this.ctx.shadowColor = 'transparent';
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, Math.max(w - 2, 1), Math.max(h - 2, 1));

        this.ctx.fillStyle = '#1F5E3B';
        this.ctx.fillRect(x + 1, y + 1, Math.min(14, w), 3);

        if (w > 18 && h > 18) {
            this.ctx.fillStyle = '#111827';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.font = `700 ${Math.max(11, Math.min(16, 15 * scale))}px Inter, sans-serif`;

            const isSmall = originalW < 200 && originalH < 200;
            const label = isSmall && this.zoom <= 2.5 && sizeMap[key]
                ? this.getCircledNumber(sizeMap[key])
                : `${originalW}×${originalH}`;
            this.ctx.fillText(label, x + w / 2, y + h / 2);
        }
        this.ctx.restore();
    }

    drawDimensions(x, y, width, height, binWidth, binHeight) {
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = '700 12px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${binWidth} mm`, x + width / 2, y - 14);

        this.ctx.save();
        this.ctx.translate(x - 16, y + height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(`${binHeight} mm`, 0, 0);
        this.ctx.restore();
    }

    getCircledNumber(num) {
        const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
        return circles[num - 1] || `(${num})`;
    }
}

window.CuttingRenderer = CuttingRenderer;
