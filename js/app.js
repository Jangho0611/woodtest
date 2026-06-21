class CuttingAppMobile {
    constructor() {
        this.currentStep = 1;
        this.parts = [];
        this.kerf = 4.2;
        this.lastResult = null;
        this.currentBoardIndex = 0;
        this.renderer = null;
        this.resultBoardWidth = 2440;
        this.resultBoardHeight = 1220;
        this.bindEvents();
        this.updateStepIndicator();
        this.updateGrainUI();
        this.syncBoardInputs();
    }

    bindEvents() {
        document.querySelector('.logo')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('newProjectBtn')?.addEventListener('click', () => this.newProject());
        document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.saveProject());
        document.getElementById('previewBtn')?.addEventListener('click', () => this.previewDrawing());

        document.querySelectorAll('.step-indicator .step').forEach((step) => {
            step.addEventListener('click', (event) => {
                this.goToStep(Number(event.currentTarget.dataset.step));
            });
        });

        document.getElementById('toStep2Btn')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('backToInputBtn')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('addPartBtn')?.addEventListener('click', () => this.addPart());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearParts());
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculate());
        document.getElementById('grainToggle')?.addEventListener('click', () => this.toggleGrain());

        document.querySelectorAll('[data-board-field]').forEach((field) => {
            field.addEventListener('click', (event) => {
                document.querySelectorAll('.input-field').forEach((el) => el.classList.remove('active'));
                event.currentTarget.classList.add('active');
            });
        });

        ['boardWidth', 'boardHeight', 'boardThickness', 'kerfInput'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => this.syncBoardInputs());
        });

        ['inputWidth', 'inputHeight', 'inputQty'].forEach((id) => {
            const input = document.getElementById(id);
            input?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addPart();
                }
            });
        });

        document.getElementById('prevBoard')?.addEventListener('click', () => this.navigateBoard(-1));
        document.getElementById('nextBoard')?.addEventListener('click', () => this.navigateBoard(1));
        document.getElementById('shareBtn')?.addEventListener('click', () => this.previewDrawing());
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.downloadPDF());

        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoom(0.25));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoom(-0.25));
    }

    goToStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active', 'prev'));
        document.getElementById(`step${step}`)?.classList.add('active');
        this.updateStepIndicator();

        if (step === 2 && this.lastResult) {
            requestAnimationFrame(() => this.renderResult());
        }
    }

    updateStepIndicator() {
        document.querySelectorAll('.step-indicator .step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === this.currentStep);
            step.classList.toggle('done', stepNumber < this.currentStep);
        });
    }

    syncBoardInputs() {
        const boardWidth = this.getPositiveNumber('boardWidth', 2440);
        const boardHeight = this.getPositiveNumber('boardHeight', 1220);
        const kerf = parseFloat(document.getElementById('kerfInput')?.value || '4.2');

        this.kerf = Number.isFinite(kerf) && kerf >= 0 ? kerf : 4.2;

        const displayBoardWidth = document.getElementById('displayBoardWidth');
        const displayBoardHeight = document.getElementById('displayBoardHeight');
        if (displayBoardWidth) displayBoardWidth.textContent = boardWidth;
        if (displayBoardHeight) displayBoardHeight.textContent = boardHeight;
    }

    getPositiveNumber(id, fallback = 0) {
        const value = Number(document.getElementById(id)?.value);
        return Number.isFinite(value) && value > 0 ? value : fallback;
    }

    toggleGrain() {
        const checkbox = document.getElementById('partRotatable');
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        this.updateGrainUI();
    }

    updateGrainUI() {
        const checkbox = document.getElementById('partRotatable');
        const grainToggle = document.getElementById('grainToggle');
        const label = grainToggle?.querySelector('.grain-label-tiny');
        if (!checkbox || !grainToggle || !label) return;

        grainToggle.classList.toggle('active', !checkbox.checked);
        label.textContent = checkbox.checked ? '회전 가능' : '결 고정';
    }

    addPart() {
        const width = this.getPositiveNumber('inputWidth');
        const height = this.getPositiveNumber('inputHeight');
        const qty = this.getPositiveNumber('inputQty', 1);

        if (!width || !height || width <= 0 || height <= 0 || qty <= 0) {
            this.showToast('가로, 세로, 수량을 1 이상으로 입력하세요.', 'error');
            return;
        }

        const rotatable = document.getElementById('partRotatable')?.checked ?? true;
        this.parts.push({
            width: Math.round(width),
            height: Math.round(height),
            qty: Math.round(qty),
            rotatable
        });
        this.renderPartsList();
        this.resetPartInputs();
        this.clearResult();
        this.showToast('부품을 추가했습니다.', 'success');
    }

    resetPartInputs() {
        ['inputWidth', 'inputHeight', 'inputQty'].forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = '0';
        });
    }

    renderPartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;

        if (this.parts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyState">
                    <span class="empty-text">부품을 추가하세요</span>
                    <span class="empty-hint">가로, 세로, 수량 입력 후 부품 추가</span>
                </div>
            `;
        } else {
            container.innerHTML = this.parts.map((part, index) => `
                <div class="part-item-wrap" data-index="${index}">
                    <div class="part-item">
                        <div class="part-dimensions">
                            <label class="part-edit-label">
                                <span>가로</span>
                                <input class="part-edit-input" type="number" min="1" step="1" value="${part.width}" data-index="${index}" data-field="width">
                            </label>
                            <label class="part-edit-label">
                                <span>세로</span>
                                <input class="part-edit-input" type="number" min="1" step="1" value="${part.height}" data-index="${index}" data-field="height">
                            </label>
                        </div>
                        <label class="part-edit-label">
                            <span>수량</span>
                            <input class="part-edit-input" type="number" min="1" step="1" value="${part.qty}" data-index="${index}" data-field="qty">
                        </label>
                        <span class="part-qty">${part.rotatable ? '가능' : '고정'}</span>
                    </div>
                    <button class="swipe-delete-btn" type="button" onclick="app.removePart(${index})">삭제</button>
                </div>
            `).join('');
            this.bindPartEditEvents();
        }

        this.updatePartsCount();
    }

    bindPartEditEvents() {
        document.querySelectorAll('.part-edit-input').forEach((input) => {
            const commit = () => this.updatePartFromInput(input);
            input.addEventListener('change', commit);
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                    input.blur();
                }
            });
        });
    }

    updatePartFromInput(input) {
        const index = Number(input.dataset.index);
        const field = input.dataset.field;
        const part = this.parts[index];
        if (!part || !['width', 'height', 'qty'].includes(field)) return;

        const previous = part[field];
        const next = Number(input.value);
        if (!Number.isFinite(next) || next <= 0) {
            input.value = previous;
            return;
        }

        part[field] = Math.round(next);
        input.value = part[field];
        this.clearResult();
        this.updatePartsCount();
    }

    updatePartsCount() {
        const totalParts = this.parts.reduce((sum, part) => sum + part.qty, 0);
        const count = document.getElementById('partsCount');
        if (count) count.textContent = `원단 ${totalParts}개`;
    }

    removePart(index) {
        this.parts.splice(index, 1);
        this.renderPartsList();
        this.clearResult();
    }

    clearParts() {
        this.parts = [];
        this.renderPartsList();
        this.clearResult();
    }

    calculate() {
        if (this.parts.length === 0) {
            this.showToast('부품을 먼저 추가하세요.', 'error');
            return;
        }

        this.syncBoardInputs();
        let boardWidth = this.getPositiveNumber('boardWidth', 2440);
        let boardHeight = this.getPositiveNumber('boardHeight', 1220);
        const thickness = this.getPositiveNumber('boardThickness', 18);
        const preCutting = document.getElementById('preCutting')?.checked ?? false;

        if (preCutting) {
            boardWidth -= 14;
            boardHeight -= 14;
        }

        if (boardWidth <= 0 || boardHeight <= 0) {
            this.showToast('판재 크기를 확인하세요.', 'error');
            return;
        }

        const packer = new GuillotinePacker(boardWidth, boardHeight, this.kerf);
        const result = packer.pack(this.parts);
        this.lastResult = result;
        this.currentBoardIndex = 0;
        this.resultBoardWidth = boardWidth;
        this.resultBoardHeight = boardHeight;

        const totalCuts = result.bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);
        const cost = this.calculateCuttingCost(thickness, totalCuts);
        const efficiency = result.totalEfficiency || 0;

        this.setText('statCost', `${cost.toLocaleString()}원`);
        this.setText('statCuts', `${totalCuts}회`);
        this.setText('statBoards', `${result.bins.length}장`);
        this.setText('statEfficiency', `${efficiency.toFixed(1)}%`);
        this.setText('boardSizeLabel', `${boardWidth} × ${boardHeight} mm`);

        this.goToStep(3);
        requestAnimationFrame(() => this.renderResult());
        this.showToast('최적화 계산을 완료했습니다.', 'success');
    }

    calculateCuttingCost(thickness, totalCuts) {
        if (thickness >= 24) return totalCuts * 2000;
        if (thickness >= 13) return totalCuts * 1500;
        return totalCuts * 1000;
    }

    renderResult() {
        if (!this.lastResult || this.lastResult.bins.length === 0) return;
        const bin = this.lastResult.bins[this.currentBoardIndex];
        if (!this.renderer) this.renderer = new CuttingRenderer('resultCanvas');

        const boardWidth = this.resultBoardWidth || this.getPositiveNumber('boardWidth', 2440);
        const boardHeight = this.resultBoardHeight || this.getPositiveNumber('boardHeight', 1220);
        const legend = this.renderer.render(boardWidth, boardHeight, bin.placed, this.kerf);

        this.setText('boardIndicator', `${this.currentBoardIndex + 1} / ${this.lastResult.bins.length}`);
        document.getElementById('emptyDrawing')?.classList.add('is-hidden');
        this.updateLegend(legend);
    }

    updateLegend(legend) {
        const container = document.getElementById('legendSection');
        if (!container) return;
        if (!legend || legend.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="legend-title">작은 부품 번호</div>
            ${legend.map((item) => `${this.getCircledNumber(item.id)} ${item.width} × ${item.height} mm (${item.count}개)`).join('<br>')}
        `;
    }

    getCircledNumber(num) {
        const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
        return circles[num - 1] || `(${num})`;
    }

    navigateBoard(direction) {
        if (!this.lastResult || this.lastResult.bins.length === 0) return;
        const nextIndex = this.currentBoardIndex + direction;
        if (nextIndex < 0 || nextIndex >= this.lastResult.bins.length) return;
        this.currentBoardIndex = nextIndex;
        this.renderResult();
    }

    zoom(delta) {
        if (!this.renderer) return;
        this.renderer.zoom = Math.max(0.5, Math.min(3, this.renderer.zoom + delta));
        this.setText('zoomLevel', `${Math.round(this.renderer.zoom * 100)}%`);
        this.renderResult();
    }

    previewDrawing() {
        if (!this.lastResult) {
            this.showToast('먼저 최적화 계산을 실행하세요.', 'error');
            return;
        }
        this.goToStep(2);
        requestAnimationFrame(() => this.renderResult());
    }

    clearResult() {
        this.lastResult = null;
        this.currentBoardIndex = 0;
        this.resultBoardWidth = this.getPositiveNumber('boardWidth', 2440);
        this.resultBoardHeight = this.getPositiveNumber('boardHeight', 1220);
        this.setText('statCost', '-');
        this.setText('statCuts', '-');
        this.setText('statBoards', '-');
        this.setText('statEfficiency', '-');
        this.setText('boardIndicator', '1 / 1');
        document.getElementById('emptyDrawing')?.classList.remove('is-hidden');
        const legend = document.getElementById('legendSection');
        if (legend) legend.innerHTML = '';
    }

    saveProject() {
        const payload = {
            boardWidth: this.getPositiveNumber('boardWidth', 2440),
            boardHeight: this.getPositiveNumber('boardHeight', 1220),
            boardThickness: this.getPositiveNumber('boardThickness', 18),
            kerf: this.kerf,
            parts: this.parts
        };
        localStorage.setItem('daesan-ai-cutting-project', JSON.stringify(payload));
        this.showToast('프로젝트를 저장했습니다.', 'success');
    }

    newProject() {
        this.parts = [];
        this.lastResult = null;
        ['boardWidth', 'boardHeight', 'boardThickness', 'kerfInput'].forEach((id) => {
            const defaults = { boardWidth: '2440', boardHeight: '1220', boardThickness: '18', kerfInput: '4.2' };
            const input = document.getElementById(id);
            if (input) input.value = defaults[id];
        });
        this.resetPartInputs();
        document.getElementById('partRotatable').checked = true;
        this.updateGrainUI();
        this.syncBoardInputs();
        this.renderPartsList();
        this.clearResult();
        this.goToStep(1);
        this.showToast('새 프로젝트를 시작합니다.', 'success');
    }

    downloadPDF() {
        if (!this.lastResult) {
            this.showToast('먼저 최적화 계산을 실행하세요.', 'error');
            return;
        }

        const canvas = document.getElementById('resultCanvas');
        if (!canvas) return;

        const createPdf = () => {
            const jsPDF = window.jspdf?.jsPDF;
            if (!jsPDF) {
                this.showToast('PDF 라이브러리를 불러오지 못했습니다.', 'error');
                return;
            }

            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            pdf.setFontSize(16);
            pdf.text('대산 Ai 재단 최적화 결과', 12, 14);
            pdf.addImage(imgData, 'PNG', 12, 22, 273, 150);
            pdf.save(`daesan-ai-cutting-${Date.now()}.pdf`);
            this.showToast('PDF를 다운로드했습니다.', 'success');
        };

        if (this.currentStep !== 2) {
            this.goToStep(2);
            requestAnimationFrame(() => {
                this.renderResult();
                createPdf();
            });
            return;
        }

        this.renderResult();
        createPdf();
    }

    share() {
        this.previewDrawing();
    }

    setText(id, value) {
        const target = document.getElementById(id);
        if (target) target.textContent = value;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 200);
        }, 2200);
    }
}

const app = new CuttingAppMobile();
window.app = app;
