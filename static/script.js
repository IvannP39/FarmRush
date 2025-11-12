const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Taille d'une tuile
const TILE_SIZE = 60;

// État du jeu
const gameState = {
    money: 50,
    xp: 0,
    resources: {
        wheat: 0,
        flour: 0,
        eggs: 0,
        fruits: 0
    },
    player: {
        x: 300,
        y: 300,
        targetX: 300,
        targetY: 300,
        speed: 3,
        size: 30
    },
    camera: {
        x: 0,
        y: 0
    },
    field: {
        gridWidth: 4,
        gridHeight: 4,
        startX: 100,
        startY: 150,
        plots: []
    },
    buildings: {
        mill: { owned: false, x: 800, y: 300, width: 100, height: 100 },
        chickenCoop: { owned: false, x: 1000, y: 300, width: 100, height: 100 },
        orchard: { owned: false, x: 1200, y: 300, width: 100, height: 100 },
        market: { owned: true, x: 800, y: 150, width: 100, height: 100 }
    },
    upgrades: {
        fieldSize: 1,
        growthSpeed: 1
    }
};

// Prix de vente
const SELL_PRICES = {
    wheat: 5,
    flour: 12,
    eggs: 15,
    fruits: 20
};

// Quantités à vendre
const sellQuantities = {
    wheat: 0,
    flour: 0,
    eggs: 0,
    fruits: 0
};

// Configuration des parcelles
const PLOT_STATES = {
    EMPTY: 0,
    GROWING_1: 1,
    GROWING_2: 2,
    GROWING_3: 3,
    READY: 4
};

const GROWTH_TIME = 5000; // 5 secondes pour pousser complètement

// Shop data
const shopData = {
    upgrades: {
        fieldExpand: {
            name: '📐 Agrandir Champ',
            cost: 100,
            desc: 'Ajoute une rangée au champ',
            maxLevel: 5,
            currentLevel: 0
        },
        fastGrowth: {
            name: '⚡ Croissance Rapide',
            cost: 200,
            desc: 'Blé pousse 20% plus vite',
            maxLevel: 5,
            currentLevel: 0
        }
    },
    buildings: {
        mill: { name: '⚙️ Moulin', cost: 150, desc: 'Transforme blé en farine' },
        chickenCoop: { name: '🐔 Poulailler', cost: 300, desc: 'Produit des œufs' },
        orchard: { name: '🍎 Verger', cost: 500, desc: 'Produit des fruits' }
    }
};

// Initialiser le champ
function initField() {
    gameState.field.plots = [];
    for (let y = 0; y < gameState.field.gridHeight; y++) {
        for (let x = 0; x < gameState.field.gridWidth; x++) {
            gameState.field.plots.push({
                x: x,
                y: y,
                state: PLOT_STATES.EMPTY,
                growthStartTime: Date.now(),
                worldX: gameState.field.startX + x * TILE_SIZE,
                worldY: gameState.field.startY + y * TILE_SIZE
            });
        }
    }
}

// Mettre à jour la croissance
function updateGrowth() {
    const now = Date.now();
    const growthTime = GROWTH_TIME / gameState.upgrades.growthSpeed;

    gameState.field.plots.forEach(plot => {
        if (plot.state === PLOT_STATES.READY) return;

        const elapsed = now - plot.growthStartTime;
        const progress = elapsed / growthTime;

        if (progress >= 1) {
            plot.state = PLOT_STATES.READY;
        } else if (progress >= 0.75) {
            plot.state = PLOT_STATES.GROWING_3;
        } else if (progress >= 0.5) {
            plot.state = PLOT_STATES.GROWING_2;
        } else if (progress >= 0.25) {
            plot.state = PLOT_STATES.GROWING_1;
        }
    });
}

// Dessiner une parcelle
function drawPlot(plot) {
    const screenX = plot.worldX - gameState.camera.x;
    const screenY = plot.worldY - gameState.camera.y;

    // Sol
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX, screenY, TILE_SIZE - 2, TILE_SIZE - 2);

    // Terre labourée
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(screenX + 5, screenY + 10 + i * 15);
        ctx.lineTo(screenX + TILE_SIZE - 7, screenY + 10 + i * 15);
        ctx.stroke();
    }

    // Blé selon le stade
    if (plot.state === PLOT_STATES.GROWING_1) {
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(screenX + 20, screenY + 40, 5, 10);
        ctx.fillRect(screenX + 30, screenY + 42, 5, 8);
    } else if (plot.state === PLOT_STATES.GROWING_2) {
        ctx.fillStyle = '#7CFC00';
        ctx.fillRect(screenX + 15, screenY + 30, 8, 20);
        ctx.fillRect(screenX + 28, screenY + 32, 8, 18);
        ctx.fillRect(screenX + 40, screenY + 35, 7, 15);
    } else if (plot.state === PLOT_STATES.GROWING_3) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(screenX + 12, screenY + 25, 10, 25);
        ctx.fillRect(screenX + 25, screenY + 20, 10, 30);
        ctx.fillRect(screenX + 38, screenY + 27, 9, 23);
    } else if (plot.state === PLOT_STATES.READY) {
        // Blé mûr doré
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 5; i++) {
            const offsetX = 8 + i * 10;
            ctx.fillRect(screenX + offsetX, screenY + 15, 8, 35);
            // Épis
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(screenX + offsetX, screenY + 15, 8, 10);
            ctx.fillStyle = '#FFD700';
        }

        // Effet brillant
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(screenX + 10, screenY + 20, 40, 3);
    }
}

// Dessiner le personnage
function drawPlayer() {
    const screenX = gameState.player.x - gameState.camera.x;
    const screenY = gameState.player.y - gameState.camera.y;

    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + gameState.player.size / 2, gameState.player.size / 2, gameState.player.size / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corps
    ctx.fillStyle = '#4A69BD';
    ctx.fillRect(screenX - 12, screenY - 10, 24, 20);

    // Tête
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 20, 12, 0, Math.PI * 2);
    ctx.fill();

    // Chapeau
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX - 14, screenY - 25, 28, 5);
    ctx.fillRect(screenX - 10, screenY - 32, 20, 7);

    // Jambes
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(screenX - 10, screenY + 10, 7, 12);
    ctx.fillRect(screenX + 3, screenY + 10, 7, 12);
}

// Dessiner un bâtiment
function drawBuilding(building, emoji, name) {
    const screenX = building.x - gameState.camera.x;
    const screenY = building.y - gameState.camera.y;

    // Bâtiment
    ctx.fillStyle = building.owned ? '#CD853F' : '#999';
    ctx.fillRect(screenX, screenY, building.width, building.height);

    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 4;
    ctx.strokeRect(screenX, screenY, building.width, building.height);

    // Toit
    ctx.fillStyle = building.owned ? '#8B0000' : '#666';
    ctx.beginPath();
    ctx.moveTo(screenX - 10, screenY);
    ctx.lineTo(screenX + building.width / 2, screenY - 30);
    ctx.lineTo(screenX + building.width + 10, screenY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Emoji
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, screenX + building.width / 2, screenY + building.height / 2 + 15);

    // Lock
    if (!building.owned) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(screenX, screenY, building.width, building.height);
        ctx.fillText('🔒', screenX + building.width / 2, screenY + building.height / 2 + 15);
    }

    // Nom
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(name, screenX + building.width / 2, screenY + building.height + 20);
    ctx.textAlign = 'left';
}

// Dessiner la scène
function drawScene() {
    // Ciel
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sol (herbe)
    ctx.fillStyle = '#7CB342';
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height);

    // Parcelles
    gameState.field.plots.forEach(plot => drawPlot(plot));

    // Bâtiments
    drawBuilding(gameState.buildings.market, '💰', 'Marché');
    drawBuilding(gameState.buildings.mill, '⚙️', 'Moulin');
    drawBuilding(gameState.buildings.chickenCoop, '🐔', 'Poulailler');
    drawBuilding(gameState.buildings.orchard, '🍎', 'Verger');

    // Joueur
    drawPlayer();

    // Indicateur de scroll
    if (gameState.camera.x < 200) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('➡️ Explorez à droite', canvas.width - 250, 100);
    }
}

// Déplacer le joueur et récolter au passage
function movePlayer() {
    const dx = gameState.player.targetX - gameState.player.x;
    const dy = gameState.player.targetY - gameState.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > gameState.player.speed) {
        gameState.player.x += (dx / distance) * gameState.player.speed;
        gameState.player.y += (dy / distance) * gameState.player.speed;

        // Vérifier collision avec parcelles pendant le déplacement
        checkPlotCollision();
    } else {
        gameState.player.x = gameState.player.targetX;
        gameState.player.y = gameState.player.targetY;
    }
}

// Vérifier collision avec les parcelles
function checkPlotCollision() {
    gameState.field.plots.forEach(plot => {
        if (plot.state === PLOT_STATES.READY) {
            const plotCenterX = plot.worldX + TILE_SIZE / 2;
            const plotCenterY = plot.worldY + TILE_SIZE / 2;

            const dx = gameState.player.x - plotCenterX;
            const dy = gameState.player.y - plotCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Si le joueur est sur la parcelle (rayon de détection)
            if (distance < TILE_SIZE / 2 + 10) {
                harvestPlot(plot);
            }
        }
    });
}

// Mettre à jour la caméra
function updateCamera() {
    const centerX = canvas.width / 2;

    // La caméra suit le joueur horizontalement
    if (gameState.player.x > centerX) {
        gameState.camera.x = gameState.player.x - centerX;
    } else {
        gameState.camera.x = 0;
    }

    // Limites
    gameState.camera.x = Math.max(0, gameState.camera.x);
    gameState.camera.x = Math.min(800, gameState.camera.x); // Max scroll
}

// Boucle de jeu
function gameLoop() {
    updateGrowth();
    movePlayer();
    updateCamera();
    drawScene();
    requestAnimationFrame(gameLoop);
}

// Clic sur le canvas
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + gameState.camera.x;
    const clickY = e.clientY - rect.top + gameState.camera.y;

    // Vérifier clic sur bâtiment
    for (let key in gameState.buildings) {
        const building = gameState.buildings[key];
        if (clickX >= building.x && clickX <= building.x + building.width &&
            clickY >= building.y && clickY <= building.y + building.height) {

            if (building.owned) {
                // Déplacer vers le bâtiment
                gameState.player.targetX = building.x + building.width / 2;
                gameState.player.targetY = building.y + building.height + 30;

                // Interagir quand on arrive
                setTimeout(() => {
                    const dx = gameState.player.targetX - gameState.player.x;
                    const dy = gameState.player.targetY - gameState.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 10) {
                        interactBuilding(key);
                    }
                }, 500);
            } else {
                showNotification('🔒 Bâtiment non débloqué !');
            }
            return;
        }
    }

    // Déplacement normal (le joueur récolte automatiquement en marchant)
    gameState.player.targetX = clickX;
    gameState.player.targetY = clickY;
});

// Récolter une parcelle
function harvestPlot(plot) {
    plot.state = PLOT_STATES.EMPTY;
    plot.growthStartTime = Date.now();
    gameState.resources.wheat += 1;
    gameState.xp += 2;
    updateUI();
    saveGame();
    showNotification('🌾 +1 Blé récolté !');
}

// Interagir avec bâtiment
function interactBuilding(buildingKey) {
    if (buildingKey === 'mill') {
        if (gameState.resources.wheat >= 1) {
            gameState.resources.wheat -= 1;
            gameState.resources.flour += 1;
            gameState.xp += 3;
            updateUI();
            saveGame();
            showNotification('⚙️ +1 Farine produite !');
        } else {
            showNotification('Pas assez de blé !');
        }
    } else if (buildingKey === 'chickenCoop') {
        gameState.resources.eggs += 1;
        gameState.xp += 5;
        updateUI();
        saveGame();
        showNotification('🥚 +1 Œuf récolté !');
    } else if (buildingKey === 'orchard') {
        gameState.resources.fruits += 1;
        gameState.xp += 5;
        updateUI();
        saveGame();
        showNotification('🍎 +1 Fruit cueilli !');
    } else if (buildingKey === 'market') {
        sellAllResources();
    }
}

// Vendre ressources - ouvrir modal
function openSellModal() {
    // Réinitialiser les quantités
    sellQuantities.wheat = 0;
    sellQuantities.flour = 0;
    sellQuantities.eggs = 0;
    sellQuantities.fruits = 0;

    renderSellModal();
    document.getElementById('sellModal').classList.add('visible');
}

function closeSellModal() {
    document.getElementById('sellModal').classList.remove('visible');
}

function renderSellModal() {
    const container = document.getElementById('sellItems');
    container.innerHTML = '';

    const resources = [
        { id: 'wheat', name: '🌾 Blé', price: SELL_PRICES.wheat },
        { id: 'flour', name: '⚙️ Farine', price: SELL_PRICES.flour },
        { id: 'eggs', name: '🥚 Œufs', price: SELL_PRICES.eggs },
        { id: 'fruits', name: '🍎 Fruits', price: SELL_PRICES.fruits }
    ];

    resources.forEach(resource => {
        const stock = gameState.resources[resource.id];
        if (stock === 0) return; // Ne pas afficher si stock vide

        const div = document.createElement('div');
        div.className = 'sell-item';
        div.innerHTML = `
                    <div class="sell-item-header">
                        <span class="sell-item-name">${resource.name}</span>
                        <span class="sell-item-stock">Stock: ${stock}</span>
                    </div>
                    <div style="color: #718096; font-size: 14px; margin-bottom: 5px;">
                        Prix unitaire: ${resource.price}€
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="changeSellQuantity('${resource.id}', -10)">-10</button>
                        <button class="quantity-btn" onclick="changeSellQuantity('${resource.id}', -1)">-</button>
                        <input type="number" class="quantity-input" id="sell-${resource.id}" 
                               value="0" min="0" max="${stock}" 
                               onchange="updateSellQuantity('${resource.id}', this.value)">
                        <button class="quantity-btn" onclick="changeSellQuantity('${resource.id}', 1)">+</button>
                        <button class="quantity-btn" onclick="changeSellQuantity('${resource.id}', 10)">+10</button>
                        <button class="quantity-btn" onclick="setSellMax('${resource.id}')">MAX</button>
                    </div>
                    <div class="sell-result" id="result-${resource.id}">= 0€</div>
                `;
        container.appendChild(div);
    });

    if (container.innerHTML === '') {
        container.innerHTML = '<p style="text-align: center; color: #718096;">Aucune ressource à vendre !</p>';
    }
}

function changeSellQuantity(resourceId, delta) {
    const stock = gameState.resources[resourceId];
    const input = document.getElementById(`sell-${resourceId}`);
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(0, Math.min(stock, newValue));

    input.value = newValue;
    sellQuantities[resourceId] = newValue;

    // Mettre à jour le résultat
    const result = document.getElementById(`result-${resourceId}`);
    result.textContent = `= ${newValue * SELL_PRICES[resourceId]}€`;
}

function updateSellQuantity(resourceId, value) {
    const stock = gameState.resources[resourceId];
    let newValue = parseInt(value) || 0;
    newValue = Math.max(0, Math.min(stock, newValue));

    const input = document.getElementById(`sell-${resourceId}`);
    input.value = newValue;
    sellQuantities[resourceId] = newValue;

    const result = document.getElementById(`result-${resourceId}`);
    result.textContent = `= ${newValue * SELL_PRICES[resourceId]}€`;
}

function setSellMax(resourceId) {
    const stock = gameState.resources[resourceId];
    const input = document.getElementById(`sell-${resourceId}`);
    input.value = stock;
    sellQuantities[resourceId] = stock;

    const result = document.getElementById(`result-${resourceId}`);
    result.textContent = `= ${stock * SELL_PRICES[resourceId]}€`;
}

function confirmSell() {
    let totalEarnings = 0;
    let itemsSold = false;

    for (let resourceId in sellQuantities) {
        const quantity = sellQuantities[resourceId];
        if (quantity > 0) {
            const earnings = quantity * SELL_PRICES[resourceId];
            totalEarnings += earnings;
            gameState.resources[resourceId] -= quantity;
            itemsSold = true;
        }
    }

    if (itemsSold) {
        gameState.money += totalEarnings;
        gameState.xp += Math.floor(totalEarnings / 5);
        updateUI();
        saveGame();
        closeSellModal();
        showNotification(`💰 +${totalEarnings}€ gagnés !`);
    } else {
        showNotification('Sélectionnez des ressources à vendre !');
    }
}

function sellAllResources() {
    openSellModal();
}

// Acheter amélioration
function buyUpgrade(upgradeKey) {
    const upgrade = shopData.upgrades[upgradeKey];
    const cost = upgrade.cost * (upgrade.currentLevel + 1);

    if (upgrade.currentLevel >= upgrade.maxLevel) {
        showNotification('Niveau maximum atteint !');
        return;
    }

    if (gameState.money >= cost) {
        gameState.money -= cost;
        upgrade.currentLevel += 1;

        if (upgradeKey === 'fieldExpand') {
            gameState.field.gridWidth += 1;
            gameState.field.gridHeight += 1;
            initField();
        } else if (upgradeKey === 'fastGrowth') {
            gameState.upgrades.growthSpeed += 0.2;
        }

        updateUI();
        renderShop();
        saveGame();
        showNotification(`${upgrade.name} amélioré !`);
    } else {
        showNotification('Pas assez d\'argent !');
    }
}

// Acheter bâtiment
function buyBuilding(buildingKey) {
    const building = shopData.buildings[buildingKey];

    if (gameState.buildings[buildingKey].owned) {
        showNotification('Déjà possédé !');
        return;
    }

    if (gameState.money >= building.cost) {
        gameState.money -= building.cost;
        gameState.buildings[buildingKey].owned = true;
        updateUI();
        renderShop();
        saveGame();
        showNotification(`${building.name} acheté !`);
    } else {
        showNotification('Pas assez d\'argent !');
    }
}

// Interface
function updateUI() {
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('xp').textContent = gameState.xp;
    document.getElementById('wheat').textContent = gameState.resources.wheat;
    document.getElementById('flour').textContent = gameState.resources.flour;
    document.getElementById('eggs').textContent = gameState.resources.eggs;
    document.getElementById('fruits').textContent = gameState.resources.fruits;
}

function renderShop() {
    // Upgrades
    const upgradesList = document.getElementById('upgradesList');
    upgradesList.innerHTML = '';

    for (let key in shopData.upgrades) {
        const upgrade = shopData.upgrades[key];
        const cost = upgrade.cost * (upgrade.currentLevel + 1);
        const maxed = upgrade.currentLevel >= upgrade.maxLevel;

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
                    <div class="shop-header">
                        <span class="shop-name">${upgrade.name}</span>
                        <span>${maxed ? 'MAX' : cost + '€'}</span>
                    </div>
                    <div class="shop-desc">${upgrade.desc} (Niv. ${upgrade.currentLevel}/${upgrade.maxLevel})</div>
                    ${!maxed ? `<button class="btn" onclick="buyUpgrade('${key}')">Améliorer</button>` : ''}
                `;
        upgradesList.appendChild(div);
    }

    // Buildings
    const buildingsList = document.getElementById('buildingsList');
    buildingsList.innerHTML = '';

    for (let key in shopData.buildings) {
        const building = shopData.buildings[key];
        const owned = gameState.buildings[key].owned;

        const div = document.createElement('div');
        div.className = `shop-item ${owned ? 'owned' : ''}`;
        div.innerHTML = `
                    <div class="shop-header">
                        <span class="shop-name">${building.name}</span>
                        <span>${owned ? '✅' : building.cost + '€'}</span>
                    </div>
                    <div class="shop-desc">${building.desc}</div>
                    ${!owned ? `<button class="btn" onclick="buyBuilding('${key}')">Acheter</button>` : ''}
                `;
        buildingsList.appendChild(div);
    }
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// Sauvegarde
function saveGame() {
    const saveData = {
        money: gameState.money,
        xp: gameState.xp,
        resources: gameState.resources,
        buildings: {
            mill: { owned: gameState.buildings.mill.owned },
            chickenCoop: { owned: gameState.buildings.chickenCoop.owned },
            orchard: { owned: gameState.buildings.orchard.owned },
            market: { owned: gameState.buildings.market.owned }
        },
        upgrades: gameState.upgrades,
        field: {
            gridWidth: gameState.field.gridWidth,
            gridHeight: gameState.field.gridHeight
        },
        shopLevels: {
            fieldExpand: shopData.upgrades.fieldExpand.currentLevel,
            fastGrowth: shopData.upgrades.fastGrowth.currentLevel
        }
    };
    localStorage.setItem('farmGame2D', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('farmGame2D');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.money = data.money || 50;
            gameState.xp = data.xp || 0;
            gameState.resources = data.resources || { wheat: 0, flour: 0, eggs: 0, fruits: 0 };

            if (data.buildings) {
                if (data.buildings.mill) gameState.buildings.mill.owned = data.buildings.mill.owned || false;
                if (data.buildings.chickenCoop) gameState.buildings.chickenCoop.owned = data.buildings.chickenCoop.owned || false;
                if (data.buildings.orchard) gameState.buildings.orchard.owned = data.buildings.orchard.owned || false;
                if (data.buildings.market) gameState.buildings.market.owned = data.buildings.market.owned !== false;
            }

            if (data.upgrades) {
                gameState.upgrades.growthSpeed = data.upgrades.growthSpeed || 1;
            }

            if (data.field) {
                gameState.field.gridWidth = data.field.gridWidth || 4;
                gameState.field.gridHeight = data.field.gridHeight || 4;
            }

            if (data.shopLevels) {
                shopData.upgrades.fieldExpand.currentLevel = data.shopLevels.fieldExpand || 0;
                shopData.upgrades.fastGrowth.currentLevel = data.shopLevels.fastGrowth || 0;
            }
        } catch (e) {
            console.error('Erreur de chargement:', e);
            localStorage.removeItem('farmGame2D');
        }
    }
}

// Initialisation
function init() {
    loadGame();
    initField();
    updateUI();
    renderShop();
    gameLoop();
}

init();