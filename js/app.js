class CuttingAppMobile {
    constructor() {
        this.currentStep = 1;
        this.currentField = 'width';
        this.inputValues = {
            boardWidth: '2440',
            boardHeight: '1220',
            width: '0',
            height: '0',
            qty: '0'
        };
        this.parts = [];
        this.kerf = 4.2;
        this.lastResult = null;
        this.currentBoardIndex = 0;
        this.renderer = null;
        this.bindEvents();
        this.updateStepIndicator();
        this.updateGrainUI();
    }

    bindEvents() {
        document.querySelector('.logo')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('newProjectBtn')?.addEventListener('click', () => this.newProject());
        document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.saveProject());
        document.getElementById('previewBtn')?.addEventListener('click', () => this.openPdfModal());

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
                this.currentField = event.currentTarget.dataset.boardField;
                document.querySelectorAll('.input-field').forEach((el) => el.classList.remove('active'));
                event.currentTarget.classList.add('active');
            });
        });

        document.querySelectorAll('.input-box-compact[data-field]').forEach((box) => {
            box.addEventListener('click', (event) => this.selectField(event.currentTarget.dataset.field));
        });

        document.querySelectorAll('.key').forEach((key) => {
            key.addEventListener('click', (event) => this.handleKeyPress(event.currentTarget.dataset.key));
        });

        document.getElementById('keypadOverlay')?.addEventListener('click', (event) => {
            if (event.target.id === 'keypadOverlay') this.setKeypadVisibility(false);
        });

        ['boardWidth', 'boardHeight', 'boardThickness', 'kerfInput'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => this.syncBoardInputs());
        });

        document.getElementById('prevBoard')?.addEventListener('click', () => this.navigateBoard(-1));
        document.getElementById('nextBoard')?.addEventListener('click', () => this.navigateBoard(1));
        document.getElementById('shareBtn')?.addEventListener('click', () => this.openPdfModal());
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.openPdfModal());
        document.getElementById('pdfCloseBtn')?.addEventListener('click', () => this.closePdfModal());
        document.getElementById('pdfDownloadBtn')?.addEventListener('click', () => this.downloadPDF());
        document.getElementById('pdfShareBtn')?.addEventListener('click', () => this.share());

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
        const boardWidth = document.getElementById('boardWidth')?.value || '2440';
        const boardHeight = document.getElementById('boardHeight')?.value || '1220';
        const kerf = parseFloat(document.getElementById('kerfInput')?.value || '4.2');

        this.inputValues.boardWidth = boardWidth;
        this.inputValues.boardHeight = boardHeight;
        this.kerf = Number.isFinite(kerf) ? kerf : 4.2;

        const displayBoardWidth = document.getElementById('displayBoardWidth');
        const displayBoardHeight = document.getElementById('displayBoardHeight');
        if (displayBoardWidth) displayBoardWidth.textContent = boardWidth;
        if (displayBoardHeight) displayBoardHeight.textContent = boardHeight;
    }

    selectField(field) {
        this.currentField = field;
        document.querySelectorAll('.input-box-compact').forEach((box) => box.classList.remove('active'));
        document.querySelector(`[data-field="${field}"]`)?.classList.add('active');
        this.inputValues[field] = '';
        this.updateInputField(field, '');
        this.updateKeypadHeader();
        this.setKeypadVisibility(true);
    }

    updateKeypadHeader() {
        const labels = { width: '치수1', height: '치수2', qty: '수량' };
        document.getElementById('keypadFieldLabel').textContent = labels[this.currentField] || '값 입력';
        document.getElementById('keypadUnit').textContent = this.currentField === 'qty' ? '개' : 'mm';
        document.getElementById('keypadPreview').textContent = this.inputValues[this.currentField] || '0';
    }

    setKeypadVisibility(visible) {
        document.getElementById('keypadOverlay')?.classList.toggle('hidden', !visible);
        if (!visible) {
            document.querySelectorAll('.input-box-compact').forEach((box) => box.classList.remove('active'));
        }
    }

    handleKeyPress(key) {
        let current = this.inputValues[this.currentField] || '';
        if (current === '0') current = '';

        if (key === 'done') {
            if (this.currentField === 'width') this.selectField('height');
            else if (this.currentField === 'height') this.selectField('qty');
            else this.setKeypadVisibility(false);
            return;
        }

        if (key === 'backspace') {
            current = current.slice(0, -1);
        } else if (/^\d$/.test(key)) {
            if (!(current === '' && key === '0')) current += key;
        }

        this.inputValues[this.currentField] = current || '0';
        this.updateInputField(this.currentField, current || '0');
        document.getElementById('keypadPreview').textContent = current || '0';
    }

    updateInputField(field, value) {
        const displayId = `input${field.charAt(0).toUpperCase()}${field.slice(1)}`;
        const target = document.getElementById(displayId);
        if (target) target.textContent = value || '0';
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
        const width = Number(this.inputValues.width);
        const height = Number(this.inputValues.height);
        const qty = Number(this.inputValues.qty) || 1;

        if (!width || !height || width <= 0 || height <= 0) {
            this.showToast('치수1과 치수2를 입력하세요.', 'error');
            return;
        }

        const rotatable = document.getElementById('partRotatable')?.checked ?? true;
        this.parts.push({ width, height, qty, rotatable });
        this.renderPartsList();
        this.resetPartInputs();
        this.showToast('부품을 추가했습니다.', 'success');
    }

    resetPartInputs() {
        this.inputValues.width = '0';
        this.inputValues.height = '0';
        this.inputValues.qty = '0';
        this.updateInputField('width', '0');
        this.updateInputField('height', '0');
        this.updateInputField('qty', '0');
    }

    renderPartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;

        if (this.parts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyState">
                    <span class="empty-text">부품을 추가하세요</span>
                    <span class="empty-hint">치수와 수량 입력 후 부품 추가</span>
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
        this.lastResult = null;
        this.clearResult();
        this.updatePartsCount();
    }

    updatePartsCount() {
        const totalParts = this.parts.reduce((sum, part) => sum + part.qty, 0);
        const count = document.getElementById('partsCount');
        if (count) count.textContent = `절단 ${totalParts}개`;
    }

    removePart(index) {
        this.parts.splice(index, 1);
        this.renderPartsList();
    }

    clearParts() {
        this.parts = [];
        this.lastResult = null;
        this.renderPartsList();
        this.clearResult();
    }

    calculate() {
        if (this.parts.length === 0) {
            this.showToast('부품을 먼저 추가하세요.', 'error');
            return;
        }

        this.syncBoardInputs();
        let boardWidth = Number(document.getElementById('boardWidth').value);
        let boardHeight = Number(document.getElementById('boardHeight').value);
        const thickness = Number(document.getElementById('boardThickness').value);
        const preCutting = document.getElementById('preCutting')?.checked ?? false;

        if (preCutting) {
            boardWidth -= 14;
            boardHeight -= 14;
        }

        const packer = new GuillotinePacker(boardWidth, boardHeight, this.kerf);
        const result = packer.pack(this.parts);
        this.lastResult = result;
        this.currentBoardIndex = 0;

        const totalCuts = result.bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);
        const cost = this.calculateCuttingCost(thickness, totalCuts);
        const efficiency = result.totalEfficiency || 0;

        document.getElementById('statCost').textContent = `${cost.toLocaleString()}원`;
        document.getElementById('statCuts').textContent = `${totalCuts}회`;
        document.getElementById('statBoards').textContent = `${result.bins.length}장`;
        document.getElementById('statEfficiency').textContent = `${efficiency.toFixed(1)}%`;
        document.getElementById('boardSizeLabel').textContent = `${boardWidth} × ${boardHeight} mm`;

        this.goToStep(3);
        requestAnimationFrame(() => this.renderResult());
        this.showToast('최적화 계산이 완료되었습니다.', 'success');
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

        const boardWidth = Number(document.getElementById('boardWidth').value);
        const boardHeight = Number(document.getElementById('boardHeight').value);
        const legend = this.renderer.render(boardWidth, boardHeight, bin.placed, this.kerf);

        document.getElementById('boardIndicator').textContent = `${this.currentBoardIndex + 1} / ${this.lastResult.bins.length}`;
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
        const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
        container.innerHTML = `<span class="legend-title">범례</span> ${legend.map((item) => {
            const circle = circles[item.id - 1] || `(${item.id})`;
            return `${circle} ${item.width}×${item.height} ×${item.count}`;
        }).join('   ')}`;
    }

    navigateBoard(delta) {
        if (!this.lastResult) return;
        const next = this.currentBoardIndex + delta;
        if (next < 0 || next >= this.lastResult.bins.length) return;
        this.currentBoardIndex = next;
        if (this.renderer) {
            this.renderer.zoom = 1;
            this.renderer.offsetX = 0;
            this.renderer.offsetY = 0;
        }
        this.updateZoomUI();
        this.renderResult();
    }

    zoom(delta) {
        if (!this.renderer || !this.lastResult) return;
        this.renderer.zoom = Math.min(Math.max(this.renderer.zoom + delta, 0.5), 4);
        this.updateZoomUI();
        this.renderResult();
    }

    updateZoomUI() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel && this.renderer) zoomLevel.textContent = `${Math.round(this.renderer.zoom * 100)}%`;
    }

    clearResult() {
        ['statCost', 'statCuts', 'statBoards', 'statEfficiency'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        document.getElementById('emptyDrawing')?.classList.remove('is-hidden');
        const legend = document.getElementById('legendSection');
        if (legend) legend.innerHTML = '';
    }

    openPdfModal() {
        if (!this.lastResult) {
            this.showToast('먼저 최적화 계산을 실행하세요.', 'error');
            return;
        }
        this.goToStep(2);
        requestAnimationFrame(() => {
            this.renderResult();
            const sourceCanvas = document.getElementById('resultCanvas');
            const previewCanvas = document.getElementById('pdfPreviewCanvas');
            const modal = document.getElementById('pdfModal');
            if (!sourceCanvas || !previewCanvas || !modal) return;

            previewCanvas.width = sourceCanvas.width;
            previewCanvas.height = sourceCanvas.height;
            previewCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
            modal.classList.remove('hidden');
        });
    }

    closePdfModal() {
        document.getElementById('pdfModal')?.classList.add('hidden');
    }

    downloadPDF() {
        if (!window.jspdf || !this.lastResult) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const canvas = document.getElementById('resultCanvas');

        doc.setFontSize(18);
        doc.text('대산 Ai 재단 최적화', 20, 20);
        doc.setFontSize(11);
        doc.text(`판재: ${document.getElementById('boardWidth').value} x ${document.getElementById('boardHeight').value} mm`, 20, 32);
        doc.text(`판재수: ${document.getElementById('statBoards').textContent}`, 20, 40);
        doc.text(`재단 횟수: ${document.getElementById('statCuts').textContent}`, 20, 48);
        doc.text(`재단비: ${document.getElementById('statCost').textContent}`, 20, 56);

        if (canvas) {
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 68, 180, 0);
        }
        doc.save(`daesan-ai-${Date.now()}.pdf`);
    }

    share() {
        const text = [
            '[대산 Ai 재단 최적화]',
            `총 판재수: ${document.getElementById('statBoards').textContent}`,
            `재단 횟수: ${document.getElementById('statCuts').textContent}`,
            `총 재단비: ${document.getElementById('statCost').textContent}`,
            `배치 효율: ${document.getElementById('statEfficiency').textContent}`
        ].join('\n');

        if (navigator.share) {
            navigator.share({ title: '대산 Ai 재단 최적화', text }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            this.showToast('결과를 클립보드에 복사했습니다.', 'success');
        }
    }

    saveProject() {
        const payload = {
            board: {
                width: document.getElementById('boardWidth').value,
                height: document.getElementById('boardHeight').value,
                thickness: document.getElementById('boardThickness').value,
                kerf: document.getElementById('kerfInput').value
            },
            parts: this.parts
        };
        localStorage.setItem('daesan-ai-project', JSON.stringify(payload));
        this.showToast('현재 프로젝트를 저장했습니다.', 'success');
    }

    newProject() {
        this.parts = [];
        this.lastResult = null;
        this.currentBoardIndex = 0;
        document.getElementById('boardWidth').value = '2440';
        document.getElementById('boardHeight').value = '1220';
        document.getElementById('boardThickness').value = '18';
        document.getElementById('kerfInput').value = '4.2';
        document.getElementById('preCutting').checked = false;
        this.syncBoardInputs();
        this.resetPartInputs();
        this.renderPartsList();
        this.clearResult();
        this.goToStep(1);
    }

    showToast(message, type = 'info') {
        document.querySelector('.toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%);
            z-index: 9999;
            padding: 12px 18px;
            border-radius: 10px;
            background: ${type === 'error' ? '#ef4444' : '#111827'};
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 12px 36px rgba(15, 23, 42, 0.2);
        `;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 2400);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CuttingAppMobile();
});
