// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc,
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    getDocs,
    Timestamp,
    enableIndexedDbPersistence,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ************************************************************************************
// ** IMPORTANTE: SUBSTITUA ESTA CONFIGURAÇÃO PELAS CREDENCIAIS DO SEU PROJETO FIREBASE **
// ************************************************************************************
const firebaseConfig = {
    apiKey: "COLOQUE_SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
    // measurementId: "SEU_MEASUREMENT_ID" // Opcional
};

const appId = 'precyz-app';

// Verifica se a configuração de placeholder ainda está presente
if (firebaseConfig.apiKey === "COLOQUE_SUA_API_KEY_AQUI") {
    console.warn("ATENÇÃO: A configuração do Firebase precisa ser preenchida com as suas credenciais reais para funcionar em produção!");
    // Opcional: Mostrar um alerta visual para o usuário final em produção,
    // mas é mais um aviso para o desenvolvedor durante o desenvolvimento.
    // showCustomAlert("Configuração do Firebase pendente. A aplicação pode não funcionar corretamente.", "error", 10000);
}

setLogLevel('debug'); // Para logs detalhados do Firestore no console

// Inicialização do Firebase
let app;
let db;
let authInstance;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    authInstance = getAuth(app);
} catch (error) {
    console.error("Erro ao inicializar o Firebase:", error);
    // Tenta mostrar o alerta, mas pode falhar se a UI ainda não estiver pronta.
    const caContainer = document.getElementById('custom-alert-container');
    if (caContainer) {
       showCustomAlert(`Erro crítico ao inicializar o Firebase: ${error.message}. Verifique a configuração.`, 'error', 20000);
    } else {
        alert(`Erro crítico ao inicializar o Firebase: ${error.message}. Verifique a configuração e o console.`);
    }
    throw error; 
}

let userId = null;
let isAuthReady = false;

// Elementos da UI
const menuContainer = document.getElementById('menu-container');
const contentArea = document.getElementById('content-area');
const userIdDisplay = document.getElementById('user-id-display');
const authStatusDisplay = document.getElementById('auth-status');
const customAlertContainer = document.getElementById('custom-alert-container'); // Já definido acima
const currentYearSpan = document.getElementById('current-year');
if(currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

// --- Autenticação ---
onAuthStateChanged(authInstance, async (user) => {
    if (user) {
        userId = user.uid;
        if(userIdDisplay) userIdDisplay.textContent = `ID Usuária: ${userId.substring(0,8)}...`;
        if(authStatusDisplay) authStatusDisplay.textContent = "Status: Autenticada.";
        console.log("Usuário autenticado:", userId);
        isAuthReady = true;
        loadInitialData(); 
    } else {
        if(authStatusDisplay) authStatusDisplay.textContent = "Status: Autenticando...";
        console.log("Nenhum usuário autenticado, tentando login anônimo.");
        try {
            await signInAnonymously(authInstance);
            console.log("Login anônimo solicitado.");
        } catch (error) {
            console.error("Erro no login anônimo:", error);
            if(userIdDisplay) userIdDisplay.textContent = "Erro de autenticação.";
            if(authStatusDisplay) authStatusDisplay.textContent = "Status: Falha na autenticação.";
            isAuthReady = false; 
            showCustomAlert(`Falha na autenticação: ${error.message}. Verifique a configuração do Firebase e se o login anônimo está ativado.`, 'error', 10000);
        }
    }
    renderMenu(); 
});

if (db) {
    enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Persistência do Firestore: Múltiplas abas abertas, persistência pode não estar habilitada.");
        } else if (err.code == 'unimplemented') {
            console.warn("Persistência do Firestore: Navegador não suporta persistência offline.");
        }
    });
}

// --- Funções Auxiliares ---
function showCustomAlert(message, type = 'info', duration = 3000) {
    if (!customAlertContainer) { // Verifica se o container existe
        console.warn("Container de alerta não encontrado. Alerta no console:", message);
        return;
    }
    const alertId = `alert-${Date.now()}`;
    const alertDiv = document.createElement('div');
    alertDiv.id = alertId;
    alertDiv.className = `custom-alert alert-${type}`;
    alertDiv.textContent = message;
    customAlertContainer.appendChild(alertDiv);

    setTimeout(() => {
        const activeAlert = document.getElementById(alertId);
        if (activeAlert) {
            activeAlert.remove();
        }
    }, duration);
}

function showModal(title, message, onConfirm, onCancel) {
    const modal = document.getElementById('modal-template');
    if (!modal) return;
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if(modalTitle) modalTitle.textContent = title;
    if(modalMessage) modalMessage.innerHTML = message; 
    
    if (!confirmBtn || !cancelBtn) return;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    if (onConfirm) {
        newConfirmBtn.style.display = 'inline-block';
        newConfirmBtn.onclick = () => {
            onConfirm();
            modal.classList.add('hidden');
        };
    } else {
         newConfirmBtn.style.display = 'none';
    }

    if (onCancel) {
        newCancelBtn.textContent = "Cancelar";
        newCancelBtn.style.display = 'inline-block';
        newCancelBtn.onclick = () => {
            onCancel();
            modal.classList.add('hidden');
        };
    } else {
         newCancelBtn.textContent = "Fechar";
         newCancelBtn.onclick = () => modal.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
}

function formatCurrency(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(value) {
    if (typeof value !== 'string') return value;
    const cleanedValue = value.replace(/\R\$\s?/, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanedValue) || 0;
}

// --- Estrutura do Menu ---
const menuItems = [
    { id: 'priceProduct', title: 'Precificar Produto', icon: '🏷️', action: renderProductPricerSection },
    { id: 'fixedCosts', title: 'Custos Fixos', icon: '🏠', action: renderFixedCostsSection },
    { id: 'variableCosts', title: 'Custos Variáveis', icon: '🛍️', action: renderVariableCostsSection },
    { id: 'freightSimulator', title: 'Simular Frete', icon: '🚚', action: renderFreightSimulatorSection },
    { id: 'transactions', title: 'Entradas e Saídas', icon: '📊', action: renderTransactionsSection },
    { id: 'dashboard', title: 'Dashboard Resumo', icon: '📈', action: renderDashboardSection },
];

function renderMenu() {
    if (!menuContainer || !contentArea) return;
    menuContainer.innerHTML = ''; 
    if (!isAuthReady) { 
        contentArea.innerHTML = `<p class="text-center text-gray-500">Aguardando autenticação para carregar as funcionalidades...</p>`;
        return;
    }

    menuItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#f7e7df]';
        card.innerHTML = `
            <span class="text-3xl mb-2">${item.icon}</span>
            <h3 class="font-semibold text-lg text-[#d295bf]">${item.title}</h3>
        `;
        card.onclick = () => {
            if (!isAuthReady) {
                showCustomAlert("Aguarde a autenticação ser concluída.", "info");
                return;
            }
            setActiveCard(card);
            item.action();
        };
        menuContainer.appendChild(card);
    });
}

function setActiveCard(selectedCard) {
    if (!menuContainer) return;
    const allCards = menuContainer.querySelectorAll('.card');
    allCards.forEach(card => card.classList.remove('ring-2', 'ring-[#d295bf]'));
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-[#d295bf]');
    }
}

// --- Funções de Seção ---
const getUserDataPath = (collectionName) => `artifacts/${appId}/users/${userId}/${collectionName}`;
const getAppSettingsPath = () => `artifacts/${appId}/users/${userId}/settings/appSettings`;

let fixedCostsCache = [];
let variableCostsCache = [];
let transactionsCache = [];
let appSettingsCache = { averageMonthlyPairsSold: 0 };

async function loadInitialData() {
    if (!isAuthReady || !userId || !db) {
        console.log("Não é possível carregar dados: Autenticação não pronta, ID do utilizador ou DB não disponível.");
        return;
    }

    const appSettingsRef = doc(db, getAppSettingsPath());
    onSnapshot(appSettingsRef, (docSnap) => {
        if (docSnap.exists()) {
            appSettingsCache = docSnap.data();
        } else {
            appSettingsCache = { averageMonthlyPairsSold: 0 }; 
            setDoc(appSettingsRef, appSettingsCache).catch(e => console.error("Erro ao criar configurações:", e));
        }
        const activePricer = document.getElementById('product-pricer-form');
        if (activePricer) renderProductPricerSection(); 
    }, error => console.error("Erro ao carregar configurações:", error));

    const fixedCostsQuery = query(collection(db, getUserDataPath('fixedCosts')));
    onSnapshot(fixedCostsQuery, (snapshot) => {
        fixedCostsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('fixed-costs-list')) renderFixedCostsSection();
        if (document.getElementById('product-pricer-form')) renderProductPricerSection();
        if (document.getElementById('dashboard-content')) updateDashboardData();
    }, error => console.error("Erro ao carregar custos fixos:", error));

    const variableCostsQuery = query(collection(db, getUserDataPath('variableCosts')));
    onSnapshot(variableCostsQuery, (snapshot) => {
        variableCostsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('variable-costs-list')) renderVariableCostsSection();
        if (document.getElementById('product-pricer-form')) renderProductPricerSection();
    }, error => console.error("Erro ao carregar custos variáveis:", error));
    
    const transactionsQuery = query(collection(db, getUserDataPath('transactions')));
    onSnapshot(transactionsQuery, (snapshot) => {
        transactionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        transactionsCache.sort((a, b) => {
            const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
            const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
            return dateB - dateA;
        });
        if (document.getElementById('transactions-list')) renderTransactionsSection();
        if (document.getElementById('dashboard-content')) renderDashboardSection();
    }, error => console.error("Erro ao carregar transações:", error));
}

function applyCurrencyMask(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value) {
        // Converte para número, divide por 100 e formata para duas casas decimais
        let numValue = parseInt(value) / 100;
        // Formata para o padrão brasileiro (vírgula como decimal, ponto como milhar)
        event.target.value = numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim();
    } else {
        event.target.value = '';
    }
}


// 1. Custos Fixos
async function renderFixedCostsSection() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Custos Fixos Mensais</h2>
        <form id="fixed-cost-form" class="mb-6 space-y-4">
            <div>
                <label for="costName" class="block text-sm font-medium mb-1">Nome do Custo:</label>
                <input type="text" id="costName" class="input-field" placeholder="Ex: Aluguel, Internet" required>
            </div>
            <div>
                <label for="costValue" class="block text-sm font-medium mb-1">Valor (R$):</label>
                <input type="text" id="costValue" inputmode="text" class="input-field" placeholder="Ex: 500,00" required>
            </div>
            <button type="submit" class="btn-primary w-full sm:w-auto">Adicionar Custo Fixo</button>
        </form>
        <div class="mb-6">
            <label for="avgPairsSold" class="block text-sm font-medium mb-1">Média de Pares Vendidos por Mês:</label>
            <input type="number" id="avgPairsSold" class="input-field" value="${appSettingsCache.averageMonthlyPairsSold || 0}" placeholder="Ex: 50">
        </div>
        <h3 class="text-xl font-medium mb-3">Lista de Custos Fixos</h3>
        <div id="fixed-costs-list" class="space-y-2"></div>
        <div class="mt-6 p-4 bg-[#e8e2f0] rounded-lg">
            <p class="text-lg font-semibold">Custo Fixo Total Mensal: <span id="total-fixed-cost" class="text-[#d295bf]">R$ 0,00</span></p>
            <p class="text-lg font-semibold">Custo Fixo por Par: <span id="fixed-cost-per-pair" class="text-[#d295bf]">R$ 0,00</span></p>
        </div>
    `;

    const form = document.getElementById('fixed-cost-form');
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('costName');
        const valueInput = document.getElementById('costValue');
        if (!nameInput || !valueInput) return;

        const name = nameInput.value.trim();
        const value = parseCurrency(valueInput.value);
        if (name && value > 0) {
            try {
                await addDoc(collection(db, getUserDataPath('fixedCosts')), { costName: name, costValue: value });
                showCustomAlert('Custo fixo adicionado!', 'success');
                form.reset();
            } catch (error) {
                console.error("Erro ao adicionar custo fixo:", error);
                showCustomAlert('Erro ao adicionar custo. Tente novamente.', 'error');
            }
        } else {
            showCustomAlert('Por favor, preencha nome e valor válidos.', 'error');
        }
    };

    const avgPairsInput = document.getElementById('avgPairsSold');
    if(avgPairsInput) avgPairsInput.onchange = async (e) => {
        const newAvg = parseInt(e.target.value) || 0;
        appSettingsCache.averageMonthlyPairsSold = newAvg;
        try {
            await setDoc(doc(db, getAppSettingsPath()), { averageMonthlyPairsSold: newAvg }, { merge: true });
            showCustomAlert('Média de pares atualizada!', 'success');
            updateFixedCostSummary();
        } catch (error) {
            console.error("Erro ao atualizar média de pares:", error);
            showCustomAlert('Erro ao atualizar média. Tente novamente.', 'error');
        }
    };
    
    const costValueInput = document.getElementById('costValue');
    if(costValueInput) costValueInput.addEventListener('input', applyCurrencyMask);

    updateFixedCostList();
    updateFixedCostSummary();
}

function updateFixedCostList() {
    const listDiv = document.getElementById('fixed-costs-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    if (fixedCostsCache.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500">Nenhum custo fixo cadastrado.</p>';
        updateFixedCostSummary(); 
        return;
    }
    fixedCostsCache.forEach(cost => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center p-3 bg-white rounded-md shadow-sm';
        itemDiv.innerHTML = `
            <span>${cost.costName}: ${formatCurrency(cost.costValue)}</span>
            <button class="text-red-500 hover:text-red-700 text-sm font-medium" data-id="${cost.id}">Excluir</button>
        `;
        const deleteButton = itemDiv.querySelector('button');
        if(deleteButton) deleteButton.onclick = async () => {
             showModal(
                'Confirmar Exclusão',
                `Tem certeza que deseja excluir o custo "${cost.costName}"?`,
                async () => {
                    try {
                        await deleteDoc(doc(db, getUserDataPath('fixedCosts'), cost.id));
                        showCustomAlert('Custo fixo excluído!', 'success');
                    } catch (error) {
                        console.error("Erro ao excluir custo fixo:", error);
                        showCustomAlert('Erro ao excluir. Tente novamente.', 'error');
                    }
                },
                () => {} 
            );
        };
        listDiv.appendChild(itemDiv);
    });
    updateFixedCostSummary();
}

function updateFixedCostSummary() {
    const totalCost = fixedCostsCache.reduce((sum, cost) => sum + (cost.costValue || 0), 0);
    const avgPairs = appSettingsCache.averageMonthlyPairsSold || 0;
    const costPerPair = avgPairs > 0 ? totalCost / avgPairs : 0;

    const totalCostEl = document.getElementById('total-fixed-cost');
    const costPerPairEl = document.getElementById('fixed-cost-per-pair');
    if (totalCostEl) totalCostEl.textContent = formatCurrency(totalCost);
    if (costPerPairEl) costPerPairEl.textContent = formatCurrency(costPerPair);
}

// 2. Custos Variáveis
async function renderVariableCostsSection() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Custos Variáveis por Produto</h2>
        <form id="variable-cost-form" class="mb-6 space-y-4">
            <div>
                <label for="itemName" class="block text-sm font-medium mb-1">Nome do Item:</label>
                <input type="text" id="itemName" class="input-field" placeholder="Ex: Caixa, Sacola, Mimo" required>
            </div>
            <div>
                <label for="itemValue" class="block text-sm font-medium mb-1">Custo Unitário (R$):</label>
                <input type="text" id="itemValue" inputmode="text" class="input-field" placeholder="Ex: 1,50" required>
            </div>
            <button type="submit" class="btn-primary w-full sm:w-auto">Adicionar Custo Variável</button>
        </form>
        <h3 class="text-xl font-medium mb-3">Lista de Custos Variáveis</h3>
        <div id="variable-costs-list" class="space-y-2"></div>
    `;

    const form = document.getElementById('variable-cost-form');
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('itemName');
        const valueInput = document.getElementById('itemValue');
        if (!nameInput || !valueInput) return;

        const name = nameInput.value.trim();
        const value = parseCurrency(valueInput.value);
        if (name && value > 0) {
             try {
                await addDoc(collection(db, getUserDataPath('variableCosts')), { itemName: name, itemValue: value });
                showCustomAlert('Custo variável adicionado!', 'success');
                form.reset();
            } catch (error) {
                console.error("Erro ao adicionar custo variável:", error);
                showCustomAlert('Erro ao adicionar. Tente novamente.', 'error');
            }
        } else {
            showCustomAlert('Por favor, preencha nome e valor válidos.', 'error');
        }
    };
    
    const itemValueInput = document.getElementById('itemValue');
    if(itemValueInput) itemValueInput.addEventListener('input', applyCurrencyMask);

    updateVariableCostList();
}

function updateVariableCostList() {
    const listDiv = document.getElementById('variable-costs-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    if (variableCostsCache.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500">Nenhum custo variável cadastrado.</p>';
        return;
    }
    variableCostsCache.forEach(cost => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center p-3 bg-white rounded-md shadow-sm';
        itemDiv.innerHTML = `
            <span>${cost.itemName}: ${formatCurrency(cost.itemValue)}</span>
            <button class="text-red-500 hover:text-red-700 text-sm font-medium" data-id="${cost.id}">Excluir</button>
        `;
        const deleteButton = itemDiv.querySelector('button');
        if(deleteButton) deleteButton.onclick = async () => {
            showModal(
                'Confirmar Exclusão',
                `Tem certeza que deseja excluir o custo "${cost.itemName}"?`,
                async () => {
                    try {
                        await deleteDoc(doc(db, getUserDataPath('variableCosts'), cost.id));
                        showCustomAlert('Custo variável excluído!', 'success');
                    } catch (error) {
                        console.error("Erro ao excluir custo variável:", error);
                        showCustomAlert('Erro ao excluir. Tente novamente.', 'error');
                    }
                },
                () => {}
            );
        };
        listDiv.appendChild(itemDiv);
    });
}

// 3. Simulador de Frete
function renderFreightSimulatorSection() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Simulador de Frete</h2>
        <form id="freight-form" class="space-y-4">
            <div>
                <label for="totalFreightCost" class="block text-sm font-medium mb-1">Valor Total do Frete (R$):</label>
                <input type="text" id="totalFreightCost" inputmode="text" class="input-field" placeholder="Ex: 150,00" required>
            </div>
            <div>
                <label for="pairQuantity" class="block text-sm font-medium mb-1">Quantidade de Pares Comprados:</label>
                <input type="number" id="pairQuantity" class="input-field" placeholder="Ex: 30" required>
            </div>
            <button type="submit" class="btn-primary w-full sm:w-auto">Calcular Frete Unitário</button>
        </form>
        <div id="freight-result" class="mt-6 p-4 bg-[#e8e2f0] rounded-lg hidden">
            <p class="text-lg font-semibold">Custo Unitário do Frete por Par: <span id="unit-freight-cost" class="text-[#d295bf]"></span></p>
        </div>
    `;

    const form = document.getElementById('freight-form');
    if(form) form.onsubmit = (e) => {
        e.preventDefault();
        const totalFreightInput = document.getElementById('totalFreightCost');
        const quantityInput = document.getElementById('pairQuantity');
        const unitFreightCostEl = document.getElementById('unit-freight-cost');
        const freightResultEl = document.getElementById('freight-result');

        if (!totalFreightInput || !quantityInput || !unitFreightCostEl || !freightResultEl) return;

        const totalFreight = parseCurrency(totalFreightInput.value);
        const quantity = parseInt(quantityInput.value);

        if (totalFreight > 0 && quantity > 0) {
            const unitCost = totalFreight / quantity;
            unitFreightCostEl.textContent = formatCurrency(unitCost);
            freightResultEl.classList.remove('hidden');
        } else {
            showCustomAlert('Por favor, insira valores válidos para frete e quantidade.', 'error');
            freightResultEl.classList.add('hidden');
        }
    };
    
    const totalFreightCostInput = document.getElementById('totalFreightCost');
    if(totalFreightCostInput) totalFreightCostInput.addEventListener('input', applyCurrencyMask);
}

// 4. Precificar Produto
function renderProductPricerSection() {
    if (!contentArea) return;
    const totalFixed = fixedCostsCache.reduce((sum, cost) => sum + (cost.costValue || 0), 0);
    const avgPairs = appSettingsCache.averageMonthlyPairsSold || 0;
    const fixedCostPerPair = avgPairs > 0 ? totalFixed / avgPairs : 0;

    let variableCostsOptionsHtml = '';
    if (variableCostsCache.length > 0) {
        variableCostsCache.forEach(vc => {
            variableCostsOptionsHtml += `
                <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" name="variable_cost" value="${vc.itemValue}" data-name="${vc.itemName}" class="form-checkbox h-5 w-5 text-[#d295bf] rounded border-gray-300 focus:ring-[#d295bf]">
                    <span>${vc.itemName} (${formatCurrency(vc.itemValue)})</span>
                </label>
            `;
        });
    } else {
        variableCostsOptionsHtml = '<p class="text-sm text-gray-500">Nenhum custo variável cadastrado. Adicione na seção "Custos Variáveis".</p>';
    }

    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Precificador de Produto</h2>
        <form id="product-pricer-form" class="space-y-4">
            <div>
                <label for="purchasePrice" class="block text-sm font-medium mb-1">Valor Pago na Mercadoria (R$):</label>
                <input type="text" id="purchasePrice" inputmode="text" class="input-field" required>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="profitMarginType" class="block text-sm font-medium mb-1">Tipo de Margem de Lucro:</label>
                    <select id="profitMarginType" class="input-field">
                        <option value="percentage">Percentual (%)</option>
                        <option value="fixed_value">Valor Fixo (R$)</option>
                    </select>
                </div>
                <div>
                    <label for="profitMarginValue" class="block text-sm font-medium mb-1">Margem de Lucro Desejada:</label>
                    <input type="text" id="profitMarginValue" inputmode="text" class="input-field" required>
                </div>
            </div>
             <div>
                <label class="block text-sm font-medium mb-1">Custos Variáveis (selecione):</label>
                <div class="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 bg-white">
                    ${variableCostsOptionsHtml}
                </div>
            </div>
            <div>
                <label for="unitFreightPricer" class="block text-sm font-medium mb-1">Custo de Frete Unitário (R$):</label>
                <input type="text" id="unitFreightPricer" inputmode="text" class="input-field" placeholder="Calcule em 'Simular Frete' ou insira">
            </div>
            <div class="p-3 bg-[#f7e7df] rounded-md text-sm">
                Custo Fixo por Par (calculado): ${formatCurrency(fixedCostPerPair)}
                <input type="hidden" id="fixedCostPerPairPricer" value="${fixedCostPerPair.toFixed(2)}">
                ${avgPairs === 0 ? '<p class="text-red-500 text-xs mt-1">Defina a "Média de Pares Vendidos" em Custos Fixos para um cálculo preciso.</p>' : ''}
            </div>
            <button type="submit" class="btn-primary w-full">Calcular Preço de Venda</button>
        </form>
        <div id="pricing-result" class="mt-6 p-4 bg-[#e8e2f0] rounded-lg hidden">
            <h3 class="text-xl font-semibold mb-3 text-[#4b4b4b]">Resultado da Precificação:</h3>
            <p>Preço de Venda Sugerido: <strong id="sellingPrice" class="text-[#d295bf] text-lg"></strong></p>
            <p>Lucro Estimado por Par: <strong id="profitPerPair" class="text-green-600"></strong></p>
            <p>Percentual de Lucro sobre a Venda: <strong id="profitPercentage" class="text-green-600"></strong></p>
            <div id="profit-alert" class="mt-2 text-sm"></div>
        </div>
    `;
    
    const purchasePriceInput = document.getElementById('purchasePrice');
    const profitMarginValueInput = document.getElementById('profitMarginValue');
    const unitFreightPricerInput = document.getElementById('unitFreightPricer');
    const profitMarginTypeSelect = document.getElementById('profitMarginType');

    if(purchasePriceInput) purchasePriceInput.addEventListener('input', applyCurrencyMask);
    if(unitFreightPricerInput) unitFreightPricerInput.addEventListener('input', applyCurrencyMask);

    if(profitMarginValueInput && profitMarginTypeSelect) {
        profitMarginValueInput.addEventListener('input', (e) => {
            if (profitMarginTypeSelect.value === 'percentage') {
                // Para percentual, permite números, vírgula e ponto.
                // Remove caracteres não numéricos, exceto vírgula e ponto.
                e.target.value = e.target.value.replace(/[^\d,.]/g, ''); 
            } else {
                applyCurrencyMask(e);
            }
        });
        profitMarginTypeSelect.addEventListener('change', () => {
            profitMarginValueInput.value = '';
            // Dispara um evento de input para que a máscara (ou a falta dela) seja reavaliada
            profitMarginValueInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
         // Inicializa a máscara correta ao carregar
        profitMarginValueInput.dispatchEvent(new Event('input', { bubbles: true }));
    }


    const form = document.getElementById('product-pricer-form');
    if(form) form.onsubmit = (e) => {
        e.preventDefault();
        const purchasePrice = parseCurrency(document.getElementById('purchasePrice').value);
        const marginType = document.getElementById('profitMarginType').value;
        
        let marginValueStr = document.getElementById('profitMarginValue').value;
        let marginValue;

        if (marginType === 'percentage') {
            // Para percentual, substitui vírgula por ponto para parseFloat
            marginValue = parseFloat(marginValueStr.replace(',', '.')) || 0;
        } else {
            marginValue = parseCurrency(marginValueStr);
        }

        const selectedVariableCosts = Array.from(document.querySelectorAll('input[name="variable_cost"]:checked'))
                                         .reduce((sum, checkbox) => sum + parseFloat(checkbox.value), 0);
        const unitFreight = parseCurrency(document.getElementById('unitFreightPricer').value) || 0;
        const calculatedFixedCostPerPair = parseFloat(document.getElementById('fixedCostPerPairPricer').value) || 0;

        if (purchasePrice <= 0 || marginValue <= 0) {
            showCustomAlert('Preencha o valor da mercadoria e a margem de lucro corretamente.', 'error');
            return;
        }

        const totalCostsBeforeMargin = purchasePrice + selectedVariableCosts + unitFreight + calculatedFixedCostPerPair;
        let sellingPrice = 0;

        if (marginType === 'percentage') {
            if (marginValue >= 100) {
                showCustomAlert('A margem de lucro percentual não pode ser 100% ou mais neste cálculo.', 'error');
                return;
            }
            sellingPrice = totalCostsBeforeMargin / (1 - (marginValue / 100));
        } else { 
            sellingPrice = totalCostsBeforeMargin + marginValue;
        }

        const profitPerPair = sellingPrice - totalCostsBeforeMargin;
        const profitPercentage = (sellingPrice > 0 && sellingPrice !== Infinity) ? (profitPerPair / sellingPrice) * 100 : 0;

        const sellingPriceEl = document.getElementById('sellingPrice');
        const profitPerPairEl = document.getElementById('profitPerPair');
        const profitPercentageEl = document.getElementById('profitPercentage');
        const profitAlertEl = document.getElementById('profit-alert');
        const pricingResultEl = document.getElementById('pricing-result');

        if(sellingPriceEl) sellingPriceEl.textContent = formatCurrency(sellingPrice);
        if(profitPerPairEl) profitPerPairEl.textContent = formatCurrency(profitPerPair);
        if(profitPercentageEl) profitPercentageEl.textContent = profitPercentage.toFixed(2) + '%';
        
        if(profitAlertEl){
            if (profitPerPair <= 0 || sellingPrice === Infinity) {
                profitAlertEl.innerHTML = '<span class="text-red-600 font-semibold">Atenção: Este preço resulta em prejuízo ou lucro zero!</span>';
            } else if (profitPercentage < 15) { 
                profitAlertEl.innerHTML = '<span class="text-orange-500 font-semibold">Alerta: Lucro baixo. Considere revisar seus custos ou margem.</span>';
            } else {
                 profitAlertEl.innerHTML = '<span class="text-green-600">Lucro adequado.</span>';
            }
        }
        if(pricingResultEl) pricingResultEl.classList.remove('hidden');
    };
}

// 5. Entradas e Saídas (Transações)
async function renderTransactionsSection() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Entradas e Saídas</h2>
        <form id="transaction-form" class="mb-8 p-6 bg-white rounded-lg shadow space-y-4">
            <div>
                <label for="transactionType" class="block text-sm font-medium mb-1">Tipo:</label>
                <select id="transactionType" class="input-field">
                    <option value="entrada">Entrada (Venda)</option>
                    <option value="saida">Saída (Gasto)</option>
                </select>
            </div>
            <div>
                <label for="transactionDate" class="block text-sm font-medium mb-1">Data:</label>
                <input type="date" id="transactionDate" class="input-field" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div>
                <label for="transactionAmount" class="block text-sm font-medium mb-1">Valor (R$):</label>
                <input type="text" id="transactionAmount" inputmode="text" class="input-field" required>
            </div>
            <div>
                <label for="transactionDescription" class="block text-sm font-medium mb-1">Descrição:</label>
                <input type="text" id="transactionDescription" class="input-field" placeholder="Ex: Venda Sandália X, Compra de embalagens" required>
            </div>
            <button type="submit" class="btn-primary w-full sm:w-auto">Adicionar Transação</button>
        </form>
        <h3 class="text-xl font-medium mb-3">Histórico de Transações</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-lg shadow table-zebra">
                <thead class="bg-[#e8e2f0]">
                    <tr>
                        <th class="p-3 text-left text-sm font-semibold text-gray-700">Data</th>
                        <th class="p-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                        <th class="p-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
                        <th class="p-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                        <th class="p-3 text-center text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody id="transactions-list"></tbody>
            </table>
        </div>
         <div id="transactions-summary" class="mt-6 p-4 bg-[#e8e2f0] rounded-lg">
            <p class="text-lg font-semibold">Saldo do Período (listado): <span id="period-balance" class="text-[#d295bf]">R$ 0,00</span></p>
        </div>
    `;

    const form = document.getElementById('transaction-form');
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const typeEl = document.getElementById('transactionType');
        const dateEl = document.getElementById('transactionDate');
        const amountEl = document.getElementById('transactionAmount');
        const descriptionEl = document.getElementById('transactionDescription');

        if(!typeEl || !dateEl || !amountEl || !descriptionEl) return;

        const type = typeEl.value;
        const dateStr = dateEl.value;
        const amount = parseCurrency(amountEl.value);
        const description = descriptionEl.value.trim();

        if (!dateStr || amount <= 0 || !description) {
            showCustomAlert('Preencha todos os campos da transação corretamente.', 'error');
            return;
        }
        const dateParts = dateStr.split('-');
        const date = Timestamp.fromDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));

        try {
            await addDoc(collection(db, getUserDataPath('transactions')), {
                type, date, amount, description, createdAt: Timestamp.now()
            });
            showCustomAlert('Transação adicionada!', 'success');
            form.reset();
            dateEl.value = new Date().toISOString().split('T')[0]; 
        } catch (error) {
            console.error("Erro ao adicionar transação:", error);
            showCustomAlert('Erro ao adicionar transação. Tente novamente.', 'error');
        }
    };
    
    const transactionAmountInput = document.getElementById('transactionAmount');
    if(transactionAmountInput) transactionAmountInput.addEventListener('input', applyCurrencyMask);

    updateTransactionsList();
}

function updateTransactionsList() {
    const listBody = document.getElementById('transactions-list');
    const balanceEl = document.getElementById('period-balance');
    if (!listBody) return;

    listBody.innerHTML = '';
    let currentBalance = 0;

    if (transactionsCache.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhuma transação registrada.</td></tr>';
        if(balanceEl) balanceEl.textContent = formatCurrency(0);
        return;
    }

    transactionsCache.forEach(tx => {
        const tr = document.createElement('tr');
        const txDateSource = tx.date instanceof Timestamp ? tx.date.toDate() : (tx.date && tx.date.seconds ? new Date(tx.date.seconds * 1000) : new Date(tx.date));
        const formattedDate = txDateSource.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        
        const amountDisplay = tx.type === 'entrada' ? formatCurrency(tx.amount) : `-${formatCurrency(tx.amount)}`;
        const amountColor = tx.type === 'entrada' ? 'text-green-600' : 'text-red-600';

        if (tx.type === 'entrada') {
            currentBalance += tx.amount;
        } else {
            currentBalance -= tx.amount;
        }

        tr.innerHTML = `
            <td class="p-3 text-sm">${formattedDate}</td>
            <td class="p-3 text-sm capitalize">${tx.type}</td>
            <td class="p-3 text-sm">${tx.description}</td>
            <td class="p-3 text-sm text-right ${amountColor} font-medium">${amountDisplay}</td>
            <td class="p-3 text-center">
                <button class="text-red-500 hover:text-red-700 text-xs font-medium" data-id="${tx.id}">Excluir</button>
            </td>
        `;
        const deleteButton = tr.querySelector('button');
        if(deleteButton) deleteButton.onclick = async () => {
             showModal(
                'Confirmar Exclusão',
                `Tem certeza que deseja excluir a transação "${tx.description}"?`,
                async () => {
                    try {
                        await deleteDoc(doc(db, getUserDataPath('transactions'), tx.id));
                        showCustomAlert('Transação excluída!', 'success');
                    } catch (error) {
                        console.error("Erro ao excluir transação:", error);
                        showCustomAlert('Erro ao excluir. Tente novamente.', 'error');
                    }
                },
                () => {}
            );
        };
        listBody.appendChild(tr);
    });
    if(balanceEl) balanceEl.textContent = formatCurrency(currentBalance);
}

// 6. Dashboard Resumo
async function renderDashboardSection() {
    if (!contentArea) return;
    contentArea.innerHTML = `
        <h2 class="text-2xl font-semibold mb-6 text-[#d295bf]">Dashboard Resumo Mensal</h2>
        <div id="dashboard-content" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card p-5 bg-[#f7e7df]">
                <h3 class="font-semibold text-lg mb-2 text-[#d295bf]">Lucro Líquido do Mês</h3>
                <p id="monthly-net-profit" class="text-3xl font-bold text-green-600">R$ 0,00</p>
            </div>
            <div class="card p-5">
                <h3 class="font-semibold text-lg mb-1">Total Vendido no Mês</h3>
                <p id="monthly-total-sales" class="text-2xl font-bold">R$ 0,00</p>
            </div>
            <div class="card p-5">
                <h3 class="font-semibold text-lg mb-1">Total de Custos/Saídas no Mês</h3>
                <p id="monthly-total-expenses" class="text-2xl font-bold">R$ 0,00</p>
            </div>
            <div class="card p-5">
                <h3 class="font-semibold text-lg mb-1">Total de Pares Vendidos (Estimado)</h3>
                <p id="monthly-pairs-sold" class="text-2xl font-bold">0</p>
                <small class="text-xs text-gray-500">Baseado em transações de entrada.</small>
            </div>
             <div class="card p-5 md:col-span-2">
                <h3 class="font-semibold text-lg mb-1">Valor Médio por Venda</h3>
                <p id="monthly-avg-sale-value" class="text-2xl font-bold">R$ 0,00</p>
            </div>
        </div>
        <p class="mt-6 text-sm text-gray-500 text-center">Dados referentes ao mês atual.</p>
    `;
    updateDashboardData();
}

function updateDashboardData() {
    const dashboardEl = document.getElementById('dashboard-content');
    if (!dashboardEl) return; 

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactionsCache.filter(tx => {
        const txDateSource = tx.date instanceof Timestamp ? tx.date.toDate() : (tx.date && tx.date.seconds ? new Date(tx.date.seconds * 1000) : new Date(tx.date));
        return txDateSource.getMonth() === currentMonth && txDateSource.getFullYear() === currentYear;
    });

    let totalSales = 0;
    let totalExpenses = 0;
    let salesCount = 0;

    monthlyTransactions.forEach(tx => {
        if (tx.type === 'entrada') {
            totalSales += tx.amount;
            salesCount++;
        } else {
            totalExpenses += tx.amount;
        }
    });

    const netProfit = totalSales - totalExpenses;
    const avgSaleValue = salesCount > 0 ? totalSales / salesCount : 0;
    const pairsSoldCount = salesCount; 

    const netProfitEl = document.getElementById('monthly-net-profit');
    const totalSalesEl = document.getElementById('monthly-total-sales');
    const totalExpensesEl = document.getElementById('monthly-total-expenses');
    const pairsSoldEl = document.getElementById('monthly-pairs-sold');
    const avgSaleValueEl = document.getElementById('monthly-avg-sale-value');

    if(netProfitEl) netProfitEl.textContent = formatCurrency(netProfit);
    if(totalSalesEl) totalSalesEl.textContent = formatCurrency(totalSales);
    if(totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
    if(pairsSoldEl) pairsSoldEl.textContent = pairsSoldCount;
    if(avgSaleValueEl) avgSaleValueEl.textContent = formatCurrency(avgSaleValue);
}

// --- Inicialização ---
// Adiciona um listener para garantir que o DOM está carregado antes de tentar manipular elementos
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Aguardando Firebase Auth...");
    // A lógica de autenticação e renderização inicial do menu é disparada por onAuthStateChanged.
    // Se o Firebase não inicializar, os alertas e logs no console indicarão o problema.
});
