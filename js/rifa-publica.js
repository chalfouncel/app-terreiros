/**
 * rifa-publica.js
 * Gerenciamento da cartela unificada e checkout da Rifa com Asaas
 */

// 1. Configuração do Supabase (reutilizando chaves do ambiente local ou do window)
const SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('supabase_url') || 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || 'SUA_SUPABASE_ANON_KEY_AQUI';

let supabaseClient = null;
if (window.supabase) {
    // Se o cliente já estiver instanciado globalmente
    if (window.supabaseClient) {
        supabaseClient = window.supabaseClient;
    } else if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('SUA_SUPABASE_URL')) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

// 2. Parâmetros e Estado da Aplicação
const urlParams = new URLSearchParams(window.location.search);
const rifaId = urlParams.get('r') || urlParams.get('id');

let rifaAtual = null;
let terreiroAtual = null;
let numerosOcupados = new Map(); // numero -> { status, nome }
let numerosSelecionados = new Set(); // Set de números escolhidos pelo usuário

// Regra da Maior Taxa Asaas (Cartão de Crédito à vista Asaas)
const TAXA_PERCENTUAL_ASAAS = 0.0399; // 3.99%
const TAXA_FIXA_ASAAS = 0.49;         // R$ 0,49

// 3. Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // Fallback: se não tiver o client configurado, busca do supabaseClient se já existir no window
    if (!supabaseClient && window.supabaseClient) {
        supabaseClient = window.supabaseClient;
    }

    if (!rifaId) {
        renderizarErro('Rifa não encontrada', 'O link informado não contém o identificador da rifa.');
        return;
    }

    await carregarDadosRifa();
    configurarRealtime();
});

// 4. Buscar dados da Rifa e do Terreiro
async function carregarDadosRifa() {
    try {
        if (!supabaseClient) {
            console.error('Supabase client não inicializado.');
            renderizarErro('Erro de Conexão', 'Não foi possível conectar ao banco de dados.');
            return;
        }

        // Buscar dados da rifa
        const { data: rifa, error: errRifa } = await supabaseClient
            .from('rifas')
            .select('*')
            .eq('id', rifaId)
            .single();

        if (errRifa || !rifa) {
            throw new Error('Rifa não localizada ou já encerrada.');
        }

        rifaAtual = rifa;

        // Buscar dados do terreiro correspondente
        if (rifa.terreiro_id) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('*')
                .eq('id', rifa.terreiro_id)
                .single();
            terreiroAtual = terreiro;
        }

        preencherDadosCabecalho();
        await carregarNumerosCartela();

    } catch (err) {
        console.error('Erro ao carregar rifa:', err);
        renderizarErro('Ops!', err.message || 'Erro ao carregar dados da rifa.');
    }
}

// 5. Preencher dados visuais no HTML
function preencherDadosCabecalho() {
    if (terreiroAtual) {
        document.getElementById('terreiroNome').textContent = terreiroAtual.nome || 'Terreiro Solidário';
        if (terreiroAtual.logo_url) {
            document.getElementById('terreiroLogo').innerHTML = `<img src="${terreiroAtual.logo_url}" class="w-full h-full object-cover rounded-full" alt="Logo">`;
        }
    }

    if (rifaAtual) {
        document.getElementById('rifaTitulo').textContent = rifaAtual.titulo;
        document.getElementById('rifaDescricao').textContent = rifaAtual.descricao || 'Participe da nossa campanha solidária.';
        if (rifaAtual.imagem_url) {
            document.getElementById('rifaImagem').src = rifaAtual.imagem_url;
        }
        document.getElementById('rifaValorUnitario').textContent = formatarMoeda(rifaAtual.valor_numero);
    }
}

// 6. Carregar números já vendidos ou reservados
async function carregarNumerosCartela() {
    try {
        const { data: registros, error } = await supabaseClient
            .from('rifa_numeros')
            .select('numero, status_pagamento, nome_comprador')
            .eq('rifa_id', rifaId);

        if (error) throw error;

        numerosOcupados.clear();
        (registros || []).forEach(reg => {
            numerosOcupados.set(reg.numero, {
                status: reg.status_pagamento || 'reservado',
                nome: reg.nome_comprador || 'Comprador'
            });
        });

        renderizarGradeNumeros();
        atualizarContadores();

    } catch (err) {
        console.error('Erro ao carregar números:', err);
    }
}

// 7. Renderizar a grade de números na tela
function renderizarGradeNumeros() {
    const grid = document.getElementById('gridNumerosRifa');
    if (!grid || !rifaAtual) return;

    const total = rifaAtual.quantidade_numeros || 100;
    let html = '';

    for (let i = 1; i <= total; i++) {
        const ocupado = numerosOcupados.get(i);
        const isSelecionado = numerosSelecionados.has(i);

        let classes = 'h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all duration-200 select-none ';
        let disabledAttr = '';
        let badgeContent = i < 10 ? `0${i}` : `${i}`;

        if (ocupado) {
            // Número ocupado
            disabledAttr = 'disabled';
            if (ocupado.status === 'pago') {
                classes += 'bg-emerald-500 text-white cursor-not-allowed shadow-inner';
            } else {
                // Reservado / Aguardando pagamento
                classes += 'bg-amber-400 text-amber-950 cursor-not-allowed shadow-inner';
            }
        } else if (isSelecionado) {
            // Selecionado pelo usuário agora
            classes += 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400 scale-95';
        } else {
            // Livre para compra
            classes += 'bg-white hover:bg-indigo-50 border border-gray-200 text-gray-800 hover:border-indigo-300 cursor-pointer active:scale-95 shadow-sm';
        }

        html += `
            <button type="button" 
                    ${disabledAttr} 
                    onclick="alternarSelecaoNumero(${i})" 
                    class="${classes}">
                ${badgeContent}
            </button>
        `;
    }

    grid.innerHTML = html;
}

// 8. Seleção / Deseleção de Números
function alternarSelecaoNumero(numero) {
    if (numerosOcupados.has(numero)) return;

    if (numerosSelecionados.has(numero)) {
        numerosSelecionados.delete(numero);
    } else {
        numerosSelecionados.add(numero);
    }

    renderizarGradeNumeros();
    atualizarBarraFlutuante();
}

// 9. Atualizar contadores de disponíveis
function atualizarContadores() {
    const total = rifaAtual?.quantidade_numeros || 100;
    const ocupadosCount = numerosOcupados.size;
    const livresCount = Math.max(0, total - ocupadosCount);

    const el = document.getElementById('rifaContadorDisponiveis');
    if (el) el.textContent = `${livresCount} de ${total} livres`;
}

// 10. Atualizar a Barra Inferior Flutuante
function atualizarBarraFlutuante() {
    const barra = document.getElementById('barraResumoFlutuante');
    const txtQtd = document.getElementById('txtQtdSelecionados');
    const txtTotal = document.getElementById('txtTotalCompra');

    const qtd = numerosSelecionados.size;

    if (qtd === 0) {
        barra.classList.add('translate-y-full');
        setTimeout(() => barra.classList.add('hidden'), 300);
        return;
    }

    barra.classList.remove('hidden');
    setTimeout(() => barra.classList.remove('translate-y-full'), 10);

    const valorUnitario = Number(rifaAtual?.valor_numero || 0);
    const subtotal = qtd * valorUnitario;

    // Cálculo da maior taxa (cartão Asaas)
    const taxa = calcularTaxaAsaas(subtotal);
    const totalComTaxa = subtotal + taxa;

    txtQtd.textContent = `${qtd} número${qtd > 1 ? 's' : ''} escolhido${qtd > 1 ? 's' : ''}`;
    txtTotal.textContent = formatarMoeda(totalComTaxa);
}

// 11. Função de Cálculo da Taxa do Asaas
function calcularTaxaAsaas(subtotal) {
    if (subtotal <= 0) return 0;
    // Fórmula: (Subtotal * % Cartão) + Taxa Fixa
    return (subtotal * TAXA_PERCENTUAL_ASAAS) + TAXA_FIXA_ASAAS;
}

// 12. Modal de Checkout
function abrirModalCheckout() {
    if (numerosSelecionados.size === 0) return;

    const modal = document.getElementById('modalCheckout');
    const subtotal = numerosSelecionados.size * Number(rifaAtual.valor_numero);
    const taxa = calcularTaxaAsaas(subtotal);
    const totalFinal = subtotal + taxa;

    const listaNums = Array.from(numerosSelecionados).sort((a, b) => a - b).join(', ');
    document.getElementById('resumoNumerosEscolhidos').textContent = listaNums;
    document.getElementById('resumoSubtotal').textContent = formatarMoeda(subtotal);
    document.getElementById('resumoTaxa').textContent = `+ ${formatarMoeda(taxa)}`;
    document.getElementById('resumoTotalFinal').textContent = formatarMoeda(totalFinal);

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('translate-y-full');
    }, 10);
}

function fecharModalCheckout() {
    const modal = document.getElementById('modalCheckout');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// 13. Submissão do Formulário de Checkout
async function processarPagamentoAsaas(event) {
    event.preventDefault();

    const nome = document.getElementById('chkNome').value.trim();
    const telefone = document.getElementById('chkTelefone').value.trim();
    const cpf = document.getElementById('chkCPF').value.trim();

    if (!nome || !telefone || !cpf) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const btn = document.getElementById('btnConfirmarPagamento');
    const btnOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Gerando cobrança segura Asaas...';

    const subtotal = numerosSelecionados.size * Number(rifaAtual.valor_numero);
    const taxa = calcularTaxaAsaas(subtotal);
    const valorCobrado = Number((subtotal + taxa).toFixed(2));
    const arrayNumeros = Array.from(numerosSelecionados);

    try {
        // Disparo para o endpoint/edge function Asaas (implementada no Passo 4)
        if (typeof window.criarCobrancaAsaas === 'function') {
            await window.criarCobrancaAsaas({
                rifaId: rifaAtual.id,
                terreiroId: rifaAtual.terreiro_id,
                numeros: arrayNumeros,
                nome,
                telefone,
                cpf,
                valorTotal: valorCobrado
            });
        } else {
            console.log('Dados do Checkout prontos:', {
                rifa: rifaAtual.titulo,
                numeros: arrayNumeros,
                nome,
                telefone,
                cpf,
                valorTotal: valorCobrado
            });
            alert(`Reserva simulada com sucesso!\n${arrayNumeros.length} números reservados para ${nome}.\nValor final com taxa Asaas: ${formatarMoeda(valorCobrado)}`);
        }

    } catch (err) {
        console.error('Erro no checkout:', err);
        alert('Não foi possível gerar a cobrança: ' + (err.message || 'Tente novamente.'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = btnOriginal;
    }
}

// 14. Realtime do Supabase: Atualizar cartela se outra pessoa comprar
function configurarRealtime() {
    if (!supabaseClient || !rifaId) return;

    supabaseClient
        .channel(`rifa_realtime_${rifaId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rifa_numeros', filter: `rifa_id=eq.${rifaId}` },
            (payload) => {
                // Se algum número selecionado pelo usuário foi comprado por outra pessoa, desmarca
                if (payload.new && numerosSelecionados.has(payload.new.numero)) {
                    numerosSelecionados.delete(payload.new.numero);
                    atualizarBarraFlutuante();
                }
                carregarNumerosCartela();
            }
        )
        .subscribe();
}

// 15. Utilitários
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarErro(titulo, msg) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="bg-white rounded-2xl p-8 border border-red-100 shadow-sm text-center my-8">
                <i class="fas fa-exclamation-triangle text-3xl text-amber-500 mb-3"></i>
                <h3 class="font-bold text-gray-800 text-lg mb-1">${titulo}</h3>
                <p class="text-xs text-gray-500">${msg}</p>
            </div>
        `;
    }
}
