let editingCardId = null; // Variável para armazenar o ID da carta sendo editada

        let currentArchetypeFilter = 'all';
        // Funções auxiliares
        function toggleRules() {
            const content = document.getElementById('rulesContent');
            const toggle = document.getElementById('rulesToggle');
            content.classList.toggle('expanded');
            toggle.textContent = content.classList.contains('expanded') ? '▲' : '▼';
        }

        function getManaDisplay(mana) {
            if (mana <= 6) {
                return `<div class="mana-dice"><img src="${getDiceImage(mana)}" alt="mana ${mana}"></div>`;
            } else {
                return `<div class="mana-dice"><img src="${getDiceImage(6)}" alt="6"></div><div class="mana-dice"><img src="${getDiceImage(mana - 6)}" alt="${mana - 6}"></div>`;
            }
        }

        function adjustNameFontSize(element, text) {
            const length = text.length;
            if (length > 25) {
                element.setAttribute('data-length', 'very-long');
            } else if (length > 15) {
                element.setAttribute('data-length', 'long');
            } else {
                element.setAttribute('data-length', 'normal');
            }
        }

        function getDiceImage(number) {
            const svgs = {
                1: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='50' cy='50' r='8' fill='black'/></svg>`,
                2: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='30' cy='30' r='8' fill='black'/><circle cx='70' cy='70' r='8' fill='black'/></svg>`,
                3: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='30' cy='30' r='8' fill='black'/><circle cx='50' cy='50' r='8' fill='black'/><circle cx='70' cy='70' r='8' fill='black'/></svg>`,
                4: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='30' cy='30' r='8' fill='black'/><circle cx='70' cy='30' r='8' fill='black'/><circle cx='30' cy='70' r='8' fill='black'/><circle cx='70' cy='70' r='8' fill='black'/></svg>`,
                5: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='30' cy='30' r='8' fill='black'/><circle cx='70' cy='30' r='8' fill='black'/><circle cx='50' cy='50' r='8' fill='black'/><circle cx='30' cy='70' r='8' fill='black'/><circle cx='70' cy='70' r='8' fill='black'/></svg>`,
                6: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white' stroke='black' stroke-width='3' rx='15'/><circle cx='30' cy='30' r='8' fill='black'/><circle cx='70' cy='30' r='8' fill='black'/><circle cx='30' cy='50' r='8' fill='black'/><circle cx='70' cy='50' r='8' fill='black'/><circle cx='30' cy='70' r='8' fill='black'/><circle cx='70' cy='70' r='8' fill='black'/></svg>`
            };
            return `data:image/svg+xml,${encodeURIComponent(svgs[number])}`;
        }

        function compressImage(base64, maxWidth = 200, maxHeight = 200, quality = 0.6) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = base64;
            });
        }

        function formatWithDiceIcons(text) {
            if (!text) return '-';
            let formatted = text.replace(/\[(\d)\]/g, (match, num) => {
                return `<span class="dice-row"><img class="dice-image" src="${getDiceImage(parseInt(num))}" alt="d${num}"></span>`;
            });
            formatted = formatted.replace(/\|/g, '<span style="margin: 0 5px;">|</span>');
            formatted = formatted.replace(/\n/g, '<br>');
            return formatted;
        }

        let cards = [];
        let printSelections = {}; // Armazena {cardId: {selected: bool, quantity: number}}
        
        function loadCards() {
            try {
                const saved = localStorage.getItem('battleDiceCards');
                if (saved) cards = JSON.parse(saved);
                // Inicializar seleções
                cards.forEach(card => {
                    if (!printSelections[card.id]) {
                        printSelections[card.id] = { selected: true, quantity: 1 };
                    }
                });
            } catch (error) { cards = []; }
            updateThumbnails();
            updateArchetypeFilter();
            updatePrintList();
            updatePrintCounter();
        }
        
        function saveCards() {
            try {
                if (cards.length > 50) {
                    showNotification('Muitas cartas! As mais antigas serão removidas.', 'warning');
                    cards = cards.slice(-50);
                }
                localStorage.setItem('battleDiceCards', JSON.stringify(cards));
                updateThumbnails();
                updateArchetypeFilter();
                updatePrintList();
                updatePrintCounter();
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    showNotification('Limite excedido! Removendo imagens grandes...', 'error');
                    cards = cards.map(card => {
                        if (card.imageUrl && card.imageUrl.length > 50000) card.imageUrl = '';
                        return card;
                    });
                    try {
                        localStorage.setItem('battleDiceCards', JSON.stringify(cards));
                        saveToLocalStorage();
                        updateArchetypeFilter();
                        updateThumbnails();
                        updatePrintList();
                        updatePrintCounter();
                        showNotification('Imagens grandes removidas.', 'success');
                    } catch (e) {
                        showNotification('Limpe algumas cartas para continuar.', 'error');
                    }
                }
            }
        }
        
        function updatePrintCounter() {
                    let selectedCards = 0;
                    let totalCopies = 0;
                    
                    cards.forEach(card => {
                        const selection = printSelections[card.id];
                        if (selection && selection.selected) {
                            selectedCards++;
                            totalCopies += selection.quantity;
                        }
                    });
                    
                    const cardsPerPage = 8; // 4x2 grid
                    const totalPages = Math.ceil(totalCopies / cardsPerPage);
                    
                    document.getElementById('selectedCardsCount').textContent = selectedCards;
                    document.getElementById('totalCopiesCount').textContent = totalCopies;
                    document.getElementById('totalPagesCount').textContent = totalPages;
        }

        function updatePrintList() {
            const container = document.getElementById('printList');
            const filteredCards = getFilteredCards();
            
            if (filteredCards.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Nenhuma carta encontrada com este filtro</div>';
                return;
            }
            
            container.innerHTML = filteredCards.map(card => {
                const selection = printSelections[card.id] || { selected: true, quantity: 1 };
                return `
                    <div class="print-item">
                        <div class="print-item-info">
                            <input type="checkbox" class="print-item-checkbox" data-id="${card.id}" ${selection.selected ? 'checked' : ''} onchange="toggleCardSelection(${card.id}, this.checked)">
                            <span class="print-item-name">${escapeHtml(card.name)}</span>
                            ${card.archetype ? `<span class="print-item-archetype">🏷️ ${escapeHtml(card.archetype)}</span>` : '<span class="print-item-archetype" style="background:rgba(0,0,0,0.4);">❌ Sem arquétipo</span>'}
                        </div>
                        <div class="print-item-quantity">
                            <button onclick="changeCardQuantity(${card.id}, -1)">-</button>
                            <input type="number" id="qty-${card.id}" value="${selection.quantity}" min="1" max="99" onchange="setCardQuantity(${card.id}, this.value)" style="width:50px; text-align:center;">
                            <button onclick="changeCardQuantity(${card.id}, 1)">+</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function toggleCardSelection(cardId, selected) {
            if (!printSelections[cardId]) {
                printSelections[cardId] = { selected: true, quantity: 1 };
            }
            printSelections[cardId].selected = selected;
            updatePrintCounter();
        }
        
        function changeCardQuantity(cardId, delta) {
            if (!printSelections[cardId]) {
                printSelections[cardId] = { selected: true, quantity: 1 };
            }
            let newQty = printSelections[cardId].quantity + delta;
            if (newQty < 1) newQty = 1;
            if (newQty > 99) newQty = 99;
            printSelections[cardId].quantity = newQty;
            const input = document.getElementById(`qty-${cardId}`);
            if (input) input.value = newQty;
        }
        
        function setCardQuantity(cardId, value) {
            let qty = parseInt(value);
            if (isNaN(qty) || qty < 1) qty = 1;
            if (qty > 99) qty = 99;
            if (!printSelections[cardId]) {
                printSelections[cardId] = { selected: true, quantity: 1 };
            }
            printSelections[cardId].quantity = qty;
        }
        

        function changeCardQuantity(cardId, delta) {
            if (!printSelections[cardId]) printSelections[cardId] = { selected: true, quantity: 1 };
            let newQty = printSelections[cardId].quantity + delta;
            if (newQty < 1) newQty = 1;
            if (newQty > 99) newQty = 99;
            printSelections[cardId].quantity = newQty;
            const input = document.getElementById(`qty-${cardId}`);
            if (input) input.value = newQty;
            updatePrintCounter();
        }

        function setCardQuantity(cardId, value) {
            let qty = parseInt(value);
            if (isNaN(qty) || qty < 1) qty = 1;
            if (qty > 99) qty = 99;
            if (!printSelections[cardId]) printSelections[cardId] = { selected: true, quantity: 1 };
            printSelections[cardId].quantity = qty;
            updatePrintCounter();
        }

        function selectAllCards() {

            const filteredCards = getFilteredCards();
            
            if (filteredCards.length === 0) {
                cards.forEach(card => {
                    if (!printSelections[card.id]) {
                        printSelections[card.id] = { selected: true, quantity: 1 };
                    }
                    printSelections[card.id].selected = true;
                });
            }else{
                filteredCards.forEach(card => {
                    if (!printSelections[card.id]) {
                        printSelections[card.id] = { selected: true, quantity: 1 };
                    }
                    printSelections[card.id].selected = true;
                });
            }

            updatePrintList();
            updatePrintCounter();
            showNotification('Todas as cartas selecionadas!', 'success');
        }
        
        function deselectAllCards() {
            cards.forEach(card => {
                if (!printSelections[card.id]) {
                    printSelections[card.id] = { selected: true, quantity: 1 };
                }
                printSelections[card.id].selected = false;
            });
            updatePrintList();
            updatePrintCounter();
            showNotification('Todas as cartas desmarcadas!', 'success');
        }
        
        function printSelectedCards() {
            const selectedCards = [];
            cards.forEach(card => {
                const selection = printSelections[card.id];
                if (selection && selection.selected) {
                    for (let i = 0; i < selection.quantity; i++) {
                        selectedCards.push(card);
                    }
                }
            });
            
            if (selectedCards.length === 0) {
                showNotification('Nenhuma carta selecionada para impressão!', 'error');
                return;
            }
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Battle Dice - Cartas do Jogo</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', sans-serif; background: white; padding: 0; margin: 0; }
                        .print-grid { display: grid; grid-template-columns: repeat(4, 63mm); gap: 5mm; justify-content: center; padding: 5mm; page-break-inside: avoid; }
                        .print-card {
                            width: 63mm;
                            height: 88mm;
                            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                            border-radius: 3mm;
                            padding: 2mm;
                            border: 1.0mm solid #ffd700;
                            break-inside: avoid;
                            page-break-inside: avoid;
                            position: relative;
                            display: flex;
                            flex-direction: column;
                            box-sizing: border-box;
                            overflow: hidden;
                        }
                        .print-card-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.5; z-index: 0; }
                        .print-card-content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; gap: 0.8mm; }
                        .print-card.magic-card { background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%); border-color: #9b59b6; }
                        .print-card-header { display: flex; justify-content: space-between; align-items: center; gap: 1mm; background: rgba(255,255,255,0.85); padding: 1mm; border-radius: 1.5mm; flex-shrink: 0; }
                        .print-card-name { font-weight: bold; text-align: center; color: rgba(255,255,255,0.9); padding: 0.8mm 1.5mm; border-radius: 1.5mm; flex: 1; word-wrap: break-word; line-height: 1.2; white-space: normal; font-size: 3mm; }
                        .print-card-name[data-length="long"] { font-size: 2.6mm; }
                        .print-card-name[data-length="very-long"] { font-size: 2.2mm; }
                        .print-card-bg-criatura{ background: rgba(194, 175, 9, 0.6); }
                        .print-card-bg-magia{ background: rgba(188, 4, 167, 0.6); }
                        .print-card-mana { display: flex; gap: 0.8mm; background: rgba(0,0,0,0.7); padding: 0.8mm 1.5mm; border-radius: 3mm; flex-shrink: 0; }
                        .print-mana-dice { width: 5mm; height: 5mm; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                        .print-mana-dice img { width: 4mm; height: 4mm; }
                        .print-card-spacer { width: 7mm; visibility: hidden; flex-shrink: 0; }
                        .print-image-container { position: relative; margin: 0.5mm 0; border-radius: 1.5mm; overflow: hidden; background: rgba(44,62,80,0.3); flex-shrink: 0; height: 38mm; }
                        .print-card-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; }
                        .print-card-image img { width: 100%; height: 100%; object-fit: inherit; opacity: 0.85; }
                        .print-card-image div { font-size: 2mm; color: #999; text-align: center; }
                        .print-overlay-stats { position: absolute; top: 1mm; right: 1mm; background: rgba(0,0,0,0.7); padding: 0.8mm 1.2mm; border-radius: 1.5mm; }
                        .print-overlay-stat { color: white; font-size: 2.5mm; display: flex; gap: 0.8mm; font-weight: bold; line-height: 1.2; }
                        .print-archetype {
                            position: absolute;
                            bottom: 1mm;
                            left: 1mm;
                            background: rgba(0,0,0,0.75);
                            color: #ffd700;
                            padding: 0.5mm 1mm;
                            border-radius: 2mm;
                            font-size: 1.4mm;
                            font-weight: bold;
                            z-index: 2;
                            max-width: 22mm;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        .print-effects { flex: 1; background: rgba(255,255,255,0.45); border-radius: 1.5mm; padding: 1mm; min-height: 0; display: flex; flex-direction: column; overflow: visible; }
                        .print-effect-section { background: rgba(255,255,255,0.85); margin: 0.6mm 0; padding: 0.8mm; border-radius: 1.2mm; border-left: 0.6mm solid; }
                        .print-effect-section.attack-effect { border-left-color: #e74c3c; }
                        .print-effect-section.defense-effect { border-left-color: #3498db; }
                        .print-effect-section.other-effect { border-left-color: #9b59b6; }
                        .print-effect-title { font-weight: bold; margin-bottom: 0.3mm; font-size: 1.2mm; }
                        .print-effect-text { color: #555; font-size: 1.6mm; line-height: 1.2; word-break: break-word; white-space: pre-wrap; }
                        .print-dice-image { width: 1.8mm; height: 1.8mm; display: inline-block; vertical-align: middle; }
                        .print-dice-image img { width: 100%; height: 120%; object-fit: contain;image-rendering: high-quality;}
                        .print-type-badge { position: absolute; bottom: 1.2mm; right: 1.2mm; background: rgba(0,0,0,0.6); color: white; padding: 0.4mm 0.8mm; border-radius: 1.5mm; font-size: 1.8mm; font-weight: bold; z-index: 2; }
                    </style>
                </head>
                <body>
                    <div class="print-grid">
            `);
            
            selectedCards.forEach(card => {
                const formatForPrint = (text) => {
                    if (!text) return '-';
                    return text.replace(/\[(\d)\]/g, (match, num) => {
                        return `<span class="print-dice-image"><img src="${getDiceImage(parseInt(num))}" style="width:1.8mm; height:1.8mm;"></span>`;
                    }).replace(/\|/g, ' | ').replace(/\n/g, '<br>');
                };
                
                const nameLength = card.name.length;
                let nameAttr = '';
                if (nameLength > 25) nameAttr = 'very-long';
                else if (nameLength > 15) nameAttr = 'long';
                
                const manaDisplay = card.mana <= 6 ? 
                    `<div class="print-mana-dice"><img src="${getDiceImage(card.mana)}"></div>` :
                    `<div class="print-mana-dice"><img src="${getDiceImage(6)}"></div><div class="print-mana-dice"><img src="${getDiceImage(card.mana - 6)}"></div>`;
                
                printWindow.document.write(`
                    <div class="print-card ${card.type === 'magic' ? 'magic-card' : ''}">
                        <div class="print-card-bg" style="background-image: url('${card.imageUrl || ''}');"></div>
                        <div class="print-card-content">
                            <div class="${card.type === 'creature' ? 'print-card-bg-criatura' : 'print-card-bg-magia'} print-card-header">
                                <div class="print-card-mana">${manaDisplay}</div>
                                <div class="${card.type === 'creature' ? 'print-card-bg-criatura' : 'print-card-bg-magia'} print-card-name" data-length="${nameAttr}">${escapeHtml(card.name)}</div>
                                <div class="print-card-spacer"></div>
                            </div>
                            <div class="print-image-container">
                                <div class="print-card-image">
                                    ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}">` : '<div>Sem imagem</div>'}
                                </div>
                                ${card.type === 'creature' ? `
                                <div class="print-overlay-stats">
                                    <div class="print-overlay-stat">⚔️ ${card.attack}</div>
                                    <div class="print-overlay-stat">🛡️ ${card.defense}</div>
                                </div>
                                ` : ''}
                                <div>
                                    ${card.archetype ? `<div class="print-archetype" title="${escapeHtml(card.archetype)}">🏷️ ${escapeHtml(card.archetype.length > 12 ? card.archetype.substring(0, 10) + '...' : card.archetype)}</div>` : ''}
                                    <div class="print-type-badge">${card.type === 'magic' ? '✨ Magia' : '🦎 Criatura'}</div>
                                </div>
                            </div>
                            <div class="print-effects">
                                ${card.type === 'creature' ? `
                                <div class="print-effect-section attack-effect">
                                    <div class="print-effect-title">⚔️ Efeito de Ataque</div>
                                    <div class="print-effect-text">${formatForPrint(card.attackEffect)}</div>
                                </div>
                                <div class="print-effect-section defense-effect">
                                    <div class="print-effect-title">🛡️ Efeito de Defesa</div>
                                    <div class="print-effect-text">${formatForPrint(card.defenseEffect)}</div>
                                </div>
                                ` : ''}
                                <div class="print-effect-section other-effect">
                                    <div class="print-effect-title">✨ Efeito Principal</div>
                                    <div class="print-effect-text">${formatForPrint(card.mainEffect)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
            });
            
            printWindow.document.write(`</div></body></html>`);
            printWindow.document.close();
            printWindow.print();
        }
        
        function toggleCardType() {
            const cardType = document.getElementById('cardType').value;
            const statsFields = document.getElementById('statsFields');
            const attackEffectGroup = document.getElementById('attackEffectGroup');
            const defenseEffectGroup = document.getElementById('defenseEffectGroup');
            const overlayStats = document.getElementById('overlayStats');
            const attackEffectSection = document.getElementById('attackEffectSection');
            const defenseEffectSection = document.getElementById('defenseEffectSection');
            const cardPreview = document.getElementById('cardPreview');
            
            if (cardType === 'magic') {
                statsFields.style.display = 'none';
                attackEffectGroup.style.display = 'none';
                defenseEffectGroup.style.display = 'none';
                overlayStats.style.display = 'none';
                attackEffectSection.style.display = 'none';
                defenseEffectSection.style.display = 'none';
                cardPreview.classList.add('magic-card');
                document.getElementById('cardTypeBadge').innerHTML = '✨ Magia';
                document.getElementById('cardTypeBadge').style.background = '#9b59b6';
            } else {
                statsFields.style.display = 'flex';
                attackEffectGroup.style.display = 'block';
                defenseEffectGroup.style.display = 'block';
                overlayStats.style.display = 'flex';
                attackEffectSection.style.display = 'block';
                defenseEffectSection.style.display = 'block';
                cardPreview.classList.remove('magic-card');
                document.getElementById('cardTypeBadge').innerHTML = '🦎 Criatura';
                document.getElementById('cardTypeBadge').style.background = 'rgba(0,0,0,0.7)';
            }
            updatePreview();
        }
        
        function updatePreview() {
            const name = document.getElementById('cardName').value || 'Nome da Carta';
            const archetype = document.getElementById('archetype').value || '';
            const cardType = document.getElementById('cardType').value;
            const attack = document.getElementById('baseAttack').value || 0;
            const defense = document.getElementById('baseDefense').value || 0;
            const mana = parseInt(document.getElementById('manaCost').value) || 1;
            const attackEffect = document.getElementById('attackEffect').value;
            const defenseEffect = document.getElementById('defenseEffect').value;
            const mainEffect = document.getElementById('mainEffect').value;
            const imageUrl = document.getElementById('imageUrl').value;
            
            const nameElement = document.getElementById('previewName');
            nameElement.textContent = name;
            adjustNameFontSize(nameElement, name);
            
            const archetypeElement = document.getElementById('previewArchetype');
            if (archetype) {
                archetypeElement.textContent = `🏷️ ${archetype}`;
                archetypeElement.style.display = 'block';
            } else {
                archetypeElement.style.display = 'none';
            }
            
            document.getElementById('previewMana').innerHTML = getManaDisplay(mana);
            document.getElementById('overlayAttack').textContent = attack;
            document.getElementById('overlayDefense').textContent = defense;
            document.getElementById('previewAttackEffect').innerHTML = formatWithDiceIcons(attackEffect);
            document.getElementById('previewDefenseEffect').innerHTML = formatWithDiceIcons(defenseEffect);
            document.getElementById('previewMainEffect').innerHTML = formatWithDiceIcons(mainEffect);
            
            const imageDiv = document.getElementById('previewImage');
            const bgImage = document.getElementById('cardBgImage');
            if (imageUrl) {
                imageDiv.innerHTML = `<img src="${imageUrl}" alt="${name}">`;
                bgImage.style.backgroundImage = `url('${imageUrl}')`;
                bgImage.style.backgroundSize = 'cover';
                bgImage.style.backgroundPosition = 'center';
            } else {
                imageDiv.innerHTML = '<div style="color: #999; padding: 20px;">Sem imagem</div>';
                bgImage.style.backgroundImage = 'none';
            }
            document.getElementById('cardTypeBadge').innerHTML = cardType === 'magic' ? '✨ Magia' : '🦎 Criatura';
        }
        
        function randomEffect() {
            const cardType = document.getElementById('cardType').value;
            if (cardType === 'magic') {
                const magicEffects = [
                    "[1][2] Cause 3 de dano | [3][4][5][6] Cause 7 de dano",
                    "[1][2] Cure 3 de vida | [3][4][5][6] Cure 7 de vida",
                    "[1][2] Compre 1 carta | [3][4][5][6] Compre 2 cartas",
                    "[1][2] Ganhe 1 de mana | [3][4][5][6] Ganhe 2 de mana",
                    "[1][2] Destrua uma criatura | [3][4][5][6] Destrua duas criaturas"
                ];
                document.getElementById('mainEffect').value = magicEffects[Math.floor(Math.random() * magicEffects.length)];
                document.getElementById('attackEffect').value = '';
                document.getElementById('defenseEffect').value = '';
            } else {
                const creatureEffects = [
                    { attack: "[1][2] +3 de ataque | [3][4][5][6] +7 de ataque", defense: "[1][2][3] +5 de defesa | [4][5][6] +10 de defesa", main: "[1][2] Ganhe 1 de vida | [3][4][5][6] Ganhe 2 de vida" },
                    { attack: "[1] -2 de ataque | [2][3][4][5][6] +8 de ataque", defense: "[1] -3 de defesa | [2][3][4][5][6] +12 de defesa", main: "[1] Perde 2 de vida | [2][3][4][5][6] Cura 3 de vida" },
                    { attack: "[1][2][3] +2 de ataque | [4][5][6] +6 de ataque", defense: "[1][2] +4 de defesa | [3][4][5][6] +9 de defesa", main: "[1][2][3] Invoque uma ficha | [4][5][6] Invoque uma ficha poderosa" }
                ];
                const effect = creatureEffects[Math.floor(Math.random() * creatureEffects.length)];
                document.getElementById('attackEffect').value = effect.attack;
                document.getElementById('defenseEffect').value = effect.defense;
                document.getElementById('mainEffect').value = effect.main;
            }
            const randomBtn = document.querySelector('.btn-random');
            randomBtn.classList.add('rolling');
            setTimeout(() => randomBtn.classList.remove('rolling'), 500);
            updatePreview();
            showNotification('✨ Efeito aleatório gerado!', 'success');
        }
        
        

// Modificar a função saveCard para suportar edição
async function saveCard() {
    const name = document.getElementById('cardName').value.trim();
    if (!name) { 
        showNotification('Dê um nome à carta!', 'error'); 
        return; 
    }
    
    let imageUrl = document.getElementById('imageUrl').value;
    if (imageUrl && imageUrl.startsWith('data:image') && imageUrl.length > 50000) {
        imageUrl = await compressImage(imageUrl, 150, 150, 0.5);
    }
    
    const cardData = {
        name: name,
        archetype: document.getElementById('archetype').value || '',
        type: document.getElementById('cardType').value,
        attack: parseInt(document.getElementById('baseAttack').value) || 0,
        defense: parseInt(document.getElementById('baseDefense').value) || 0,
        mana: parseInt(document.getElementById('manaCost').value) || 1,
        imageUrl: imageUrl || '',
        attackEffect: document.getElementById('attackEffect').value,
        defenseEffect: document.getElementById('defenseEffect').value,
        mainEffect: document.getElementById('mainEffect').value
    };
    
    if (editingCardId) {
        // Modo edição - sobrescrever carta existente
        const index = cards.findIndex(c => c.id === editingCardId);
        if (index !== -1) {
            cards[index] = { ...cardData, id: editingCardId };
            showNotification(`✏️ Carta "${name}" atualizada!`, 'success');
        }
        editingCardId = null;
        document.querySelector('.btn-primary').innerHTML = '💾 Salvar Carta';
    } else {
        // Modo criação - adicionar nova carta
        const newCard = { ...cardData, id: Date.now() };
        cards.unshift(newCard);
        printSelections[newCard.id] = { selected: true, quantity: 1 };
        showNotification(`🎲 Nova carta "${name}" salva!`, 'success');
    }
    
    localStorage.setItem('battleDiceCards', JSON.stringify(cards));
    updateThumbnails();
    updateArchetypeFilter();
    updatePrintList();
    updatePrintCounter();
    clearForm();
}

// Modificar a função loadCard para entrar em modo edição
function loadCard(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    // Preencher formulário com os dados da carta
    document.getElementById('cardName').value = card.name;
    document.getElementById('archetype').value = card.archetype || '';
    document.getElementById('cardType').value = card.type;
    toggleCardType();
    document.getElementById('baseAttack').value = card.attack;
    document.getElementById('baseDefense').value = card.defense;
    document.getElementById('manaCost').value = card.mana;
    document.getElementById('imageUrl').value = card.imageUrl || '';
    document.getElementById('attackEffect').value = card.attackEffect || '';
    document.getElementById('defenseEffect').value = card.defenseEffect || '';
    document.getElementById('mainEffect').value = card.mainEffect || '';
    //updateImagePosition(card.imagePosX || 50, card.imagePosY || 50);
    
    if (card.imageUrl) {
        document.getElementById('imagePreview').innerHTML = `<img src="${card.imageUrl}" style="max-width:100%; max-height:100px;">`;
    } else {
        document.getElementById('imagePreview').innerHTML = '';
    }
    
    // Ativar modo edição
    editingCardId = card.id;
    const saveButton = document.querySelector('.btn-primary');
    saveButton.innerHTML = '✏️ Atualizar Carta';
    saveButton.style.background = 'linear-gradient(135deg, #27ae60 0%, #229954 100%)';
    
    updatePreview();
    showNotification(`✏️ Editando: ${card.name}. Clique em "Atualizar Carta" para salvar as alterações.`, 'success');
}

// Modificar a função clearForm para resetar o modo edição
function clearForm() {
    document.getElementById('cardName').value = '';
    document.getElementById('archetype').value = '';
    document.getElementById('cardType').value = 'creature';
    toggleCardType();
    document.getElementById('baseAttack').value = '5';
    document.getElementById('baseDefense').value = '5';
    document.getElementById('manaCost').value = '3';
    document.getElementById('imageUrl').value = '';
    document.getElementById('attackEffect').value = '';
    document.getElementById('defenseEffect').value = '';
    document.getElementById('mainEffect').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    
    updatePreview();
    
    // Resetar modo edição
    editingCardId = null;
    const saveButton = document.querySelector('.btn-primary');
    saveButton.innerHTML = '💾 Salvar Carta';
    saveButton.style.background = '';
}

// Adicionar um botão "Nova Carta" para limpar o formulário e sair do modo edição
// HTML para este botão (adicione ao lado do botão Salvar):
// <button class="btn-info" onclick="clearForm()">➕ Nova Carta</button>

          function saveToLocalStorage() {
            localStorage.setItem('battleDiceCards', JSON.stringify(cards));
        }

        function updateArchetypeFilter() {
            const archetypes = new Set();
            cards.forEach(card => {
                if (card.archetype && card.archetype.trim() !== '') {
                    archetypes.add(card.archetype);
                }
            });
            
            const filterSelect = document.getElementById('archetypeFilter');
            const currentValue = filterSelect.value;
            
            filterSelect.innerHTML = '<option value="all">📋 Todos os Arquétipos</option>';
            if (cards.some(card => card.archetype && card.archetype.trim() !== '')) {
                filterSelect.innerHTML += '<option value="sem_arquetipo">❌ Sem Arquétipo</option>';
            }
            Array.from(archetypes).sort().forEach(arch => {
                filterSelect.innerHTML += `<option value="${escapeHtml(arch)}">🏷️ ${escapeHtml(arch)}</option>`;
            });
            
            if (currentValue && Array.from(archetypes).includes(currentValue)) {
                filterSelect.value = currentValue;
            } else if (currentValue === 'sem_arquetipo') {
                filterSelect.value = currentValue;
            } else {
                filterSelect.value = 'all';
                currentArchetypeFilter = 'all';
            }
        }

        function getFilteredCards() {
            const filter = document.getElementById('archetypeFilter').value;
            currentArchetypeFilter = filter;
            
            let filteredCards = cards;
            if (filter === 'sem_arquetipo') {
                filteredCards = cards.filter(card => !card.archetype || card.archetype.trim() === '');
                document.getElementById('filterInfo').innerHTML = `🔍 Mostrando cartas <strong>sem arquétipo</strong> (${filteredCards.length} cartas)`;
            } else if (filter !== 'all') {
                filteredCards = cards.filter(card => card.archetype === filter);
                document.getElementById('filterInfo').innerHTML = `🔍 Mostrando cartas do arquétipo <strong>${escapeHtml(filter)}</strong> (${filteredCards.length} cartas)`;
            } else {
                document.getElementById('filterInfo').innerHTML = `🔍 Mostrando <strong>todas</strong> as cartas (${cards.length} cartas)`;
            }
            
            return filteredCards;
        }

         function clearArchetypeFilter() {
            document.getElementById('archetypeFilter').value = 'all';
            getFilteredCards();
            updatePrintList();
            updatePrintCounter();
            showNotification('Filtro removido!', 'success');
        }
        
        function updateThumbnails() {
            const grid = document.getElementById('thumbnailsGrid');
            const cardCount = document.getElementById('cardCount');
            cardCount.textContent = cards.length;
            if (cards.length === 0) {
                grid.innerHTML = '<div style="text-align: center; color: #999; grid-column: 1/-1;">Nenhuma carta criada ainda</div>';
                return;
            }
            grid.innerHTML = cards.map(card => {
                const manaDisplay = card.mana <= 6 ? 
                    `<img src="${getDiceImage(card.mana)}" style="width:14px; height:14px;">` :
                    `<img src="${getDiceImage(6)}" style="width:12px; height:12px;"><img src="${getDiceImage(card.mana - 6)}" style="width:12px; height:12px;">`;
                return `
                <div class="thumbnail ${card.type === 'magic' ? 'magic-thumb' : ''}" onclick="loadCard(${card.id})">
                    <div class="delete-thumb" onclick="event.stopPropagation(); deleteCard(${card.id})">✖</div>
                    <div class="thumbnail-name" title="${escapeHtml(card.name)}">${escapeHtml(card.name.length > 20 ? card.name.substring(0, 17) + '...' : card.name)}</div>
                    ${card.archetype ? `<div class="thumbnail-archetype">🏷️ ${escapeHtml(card.archetype)}</div>` : ''}
                    <div class="thumbnail-stats">
                        ${card.type === 'creature' ? `<span style="color:#e74c3c;">⚔️${card.attack}</span><span style="color:#3498db;">🛡️${card.defense}</span>` : '<span>✨ Magia</span>'}
                        <span>${manaDisplay}</span>
                    </div>
                    <div class="thumbnail-image">
                        ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.name}" style="max-width:100%; max-height:45px;">` : '<div style="font-size: 25px;">' + (card.type === "magic" ? "✨" : "🎲") + '</div>'}
                    </div>
                    <div class="thumbnail-effects">${(card.mainEffect || '').substring(0, 25)}...</div>
                    <div class="type-badge">${card.type === 'magic' ? '✨ Magia' : '🦎 Criatura'}</div>
                </div>`;
            }).join('');
        }
        
        
        function deleteCard(id) {
            if (confirm('Excluir esta carta?')) {
                cards = cards.filter(c => c.id !== id);
                delete printSelections[id];
                saveToLocalStorage();
                updateArchetypeFilter();
                updateThumbnails();
                updatePrintList();
                updatePrintCounter();
                showNotification('🎲 Carta excluída!', 'success');
            }
        }
        
        
        function clearAllCards() {
            if (confirm('Apagar TODAS as cartas?')) {
                cards = [];
                printSelections = {};
                saveCards();
                showNotification('🎲 Todas removidas!', 'success');
            }
        }
        
        document.getElementById('imageUpload').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(event) {
                    let imageUrl = event.target.result;
                    if (imageUrl.length > 100000) {
                        showNotification('Comprimindo...', 'success');
                        imageUrl = await compressImage(imageUrl, 200, 200, 0.6);
                    }
                    document.getElementById('imageUrl').value = imageUrl;
                    document.getElementById('imagePreview').innerHTML = `<img src="${imageUrl}" style="max-width:100%; max-height:100px;">`;
                    updatePreview();
                };
                reader.readAsDataURL(file);
            }
        });

         // Função para exportar dados
        function exportData() {
            if (cards.length === 0) {
                showNotification('Não há cartas para exportar!', 'error');
                return;
            }
            
            const exportData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                cards: cards.map(card => ({
                    id: card.id,
                    name: card.name,
                    archetype: card.archetype,
                    type: card.type,
                    attack: card.attack,
                    defense: card.defense,
                    mana: card.mana,
                    imageUrl: card.imageUrl,
                    attackEffect: card.attackEffect,
                    defenseEffect: card.defenseEffect,
                    mainEffect: card.mainEffect
                }))
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `battle_dice_cards_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification(`📤 ${cards.length} cartas exportadas com sucesso!`, 'success');
        }

        // Função para importar dados
        function importData(file) {
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Verificar se o arquivo tem o formato esperado
                    let importedCards = [];
                    if (importedData.cards && Array.isArray(importedData.cards)) {
                        importedCards = importedData.cards;
                    } else if (Array.isArray(importedData)) {
                        importedCards = importedData;
                    } else {
                        throw new Error('Formato de arquivo inválido');
                    }
                    
                    // Gerar novos IDs para evitar conflitos
                    const newCards = importedCards.map(card => ({
                        ...card,
                        id: Date.now() + Math.random() * 10000 + card.id
                    }));
                    
                    // Adicionar as novas cartas às existentes
                    cards = [...newCards, ...cards];
                    
                    // Atualizar seleções de impressão
                    newCards.forEach(card => {
                        printSelections[card.id] = { selected: true, quantity: 1 };
                    });
                    
                    // Salvar no localStorage
                    saveToLocalStorage();
                    
                    // Atualizar interface
                    updateThumbnails();
                    updatePrintList();
                    updatePrintCounter();
                    updateArchetypeFilter();
                    
                    showNotification(`📥 ${newCards.length} cartas importadas com sucesso! Total: ${cards.length} cartas`, 'success');
                } catch (error) {
                    showNotification('Erro ao importar arquivo. Verifique o formato do arquivo.', 'error');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
            document.getElementById('importFile').value = '';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#27ae60'};
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }

        function clearAllCards() {
    if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODAS as cartas permanentemente!\n\nDeseja realmente continuar?')) {
        // Limpar o array de cartas
        cards = [];
        
        // Limpar as seleções de impressão
        printSelections = {};
        
        // Remover do localStorage
        localStorage.removeItem('battleDiceCards');
        
        // Limpar o formulário
        clearForm();
        
        // Atualizar todas as interfaces
        updateThumbnails();
        updateArchetypeFilter();
        updatePrintList();
        updatePrintCounter();
        
        // Mostrar mensagem de confirmação
        showNotification('🗑️ Todas as cartas foram apagadas com sucesso!', 'success');
        
        // Opcional: limpar também a pré-visualização
        document.getElementById('previewImage').innerHTML = '<div style="color: #999; padding: 20px;">Sem imagem</div>';
        document.getElementById('cardBgImage').style.backgroundImage = 'none';

        location.reload();
    }
}
        
        // Event listeners
        document.getElementById('cardName').addEventListener('input', updatePreview);
        document.getElementById('archetype').addEventListener('input', updatePreview);
        document.getElementById('baseAttack').addEventListener('input', updatePreview);
        document.getElementById('baseDefense').addEventListener('input', updatePreview);
        document.getElementById('manaCost').addEventListener('input', updatePreview);
        document.getElementById('attackEffect').addEventListener('input', updatePreview);
        document.getElementById('defenseEffect').addEventListener('input', updatePreview);
        document.getElementById('mainEffect').addEventListener('input', updatePreview);
        document.getElementById('imageUrl').addEventListener('input', updatePreview);
        document.getElementById('cardType').addEventListener('change', toggleCardType);

        document.getElementById('archetypeFilter').addEventListener('change', function() {
            updatePrintList();
            updatePrintCounter();
        });
        
        loadCards();
        updatePreview();
        toggleCardType();
        
        const style = document.createElement('style');
        style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
