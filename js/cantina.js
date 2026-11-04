// =========================================================================
// MÓDULO CANTINA: PADRÃO ADMIN + PERMISSÃO DO QUADRO DE MÉDIUNS (perm_cantina)
// =========================================================================
const dbCantina = typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient;

let usuarioLogadoAuthId = null;
let mediumLogado = null;
let idTerreiroGlobal = null;
let infoTerreiro = null;

let ehAdmin = false;
let ehGestorCantina = false;
let ehValidadorCantina = false;

let transacoesCache = [];
let filtroAbaAtual = 'todos';

function comprimirImagemCantina(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.match(/image.*/)) return resolve(file);
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width;
                let height = image.height;
                if (width > height) {
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    const ext = file.name.split('.').pop() || 'jpg';
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), {
                        type: file.type.includes('png') ? 'image/png' : 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, file.type.includes('png') ? 'image/png' : 'image/jpeg', quality);
            };
            image.onerror = () => resolve(file);
            image.src = readerEvent.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const elDataHoje = document.getElementById('dataHoje');
    if (elDataHoje) elDataHoje.textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    const { data: { session } } = await dbCantina.auth.getSession();
    if (!session) return window.location.replace('index.html');

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            btnSair.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saindo...';
            await dbCantina.auth.signOut();
            localStorage.clear();
            window.location.replace('index.html');
        });
    }

    usuarioLogadoAuthId = session.user.id;

    const { data: perfil, error: errPerfil } = await dbCantina
        .from('mediuns')
        .select('*')
        .eq('auth_id', usuarioLogadoAuthId)
        .single();

    if (errPerfil || !perfil) {
        alert("Usuário não encontrado.");
        return window.location.replace('index.html');
    }

    mediumLogado = perfil;
    idTerreiroGlobal = perfil.terreiro_id;
    ehAdmin = (perfil.is_admin === true || perfil.is_master === true);

    if (perfil.is_master && localStorage.getItem('terreiroAtivoSaaS')) {
        idTerreiroGlobal = localStorage.getItem('terreiroAtivoSaaS');
    }

    // TRAVA EXCLUSIVA PELO QUADRO OFICIAL DE MÉDIUNS (perm_cantina ou Admin Geral/Master)
    const temPermissaoCantinaQuadro = (perfil.perm_cantina === true || ehAdmin);
    if (!temPermissaoCantinaQuadro) {
        alert("Acesso negado! O acesso ao Painel Financeiro e Auditoria da Cantina deve ser liberado nas Permissões de Acesso do Quadro Oficial de Médiuns.");
        return window.location.replace('presenca.html');
    }

    const primeiroNome = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Médium';
    const elNomeAdmin = document.getElementById('nomeAdmin');
    if (elNomeAdmin) elNomeAdmin.textContent = 'Olá, ' + primeiroNome;

    const { data: terreiro } = await dbCantina
        .from('terreiros')
        .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, cantina_gestor_id, cantina_validador_id, status_bloqueado')
        .eq('id', idTerreiroGlobal)
        .single();

    if (terreiro) {
        if (terreiro.status_bloqueado === true && !perfil.is_master) {
            alert('Acesso Suspenso.');
            await dbCantina.auth.signOut();
            localStorage.clear();
            return window.location.replace('index.html');
        }

        infoTerreiro = terreiro;
        const elSide = document.getElementById('nomeTerreiroSidebar');
        if (elSide) elSide.textContent = terreiro.nome;

        const root = document.documentElement;
        if (terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
        if (terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
        if (terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
        if (terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

        if (terreiro.logo_url) {
            const img = document.getElementById('logoSidebar');
            if (img) {
                img.src = terreiro.logo_url;
                img.classList.remove('hidden');
            }
        }

        ehGestorCantina = String(perfil.id) === String(terreiro.cantina_gestor_id);
        ehValidadorCantina = String(perfil.id) === String(terreiro.cantina_validador_id);
    }

    const badgePapel = document.getElementById('badgePapelUsuario');
    if (badgePapel) {
        const papeis = [];
        if (ehGestorCantina) papeis.push('Gestor(a)');
        if (ehValidadorCantina) papeis.push('Validador(a)');
        if (papeis.length === 0) papeis.push(ehAdmin ? 'Admin' : 'Autorizado');
        badgePapel.textContent = papeis.join(' / ');
    }

    configurarZoomPinchCantina();
    await carregarExtratoCantina();
});

async function carregarExtratoCantina() {
    const container = document.getElementById('listaExtratoCantina');
    if (!container) return;

    const [
        { data: transacoes, error },
        { data: mediunsCasa }
    ] = await Promise.all([
        dbCantina.from('caixa_cantina').select('*').eq('terreiro_id', idTerreiroGlobal).order('created_at', { ascending: false }),
        dbCantina.from('mediuns').select('id, auth_id, nome_completo').eq('terreiro_id', idTerreiroGlobal)
    ]);

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-500 text-xs font-bold">Erro ao carregar extrato: ${error.message}</div>`;
        return;
    }

    const mapaMediuns = {};
    (mediunsCasa || []).forEach(m => {
        if (m.auth_id) mapaMediuns[m.auth_id] = m.nome_completo;
        mapaMediuns[String(m.id)] = m.nome_completo;
    });

    transacoesCache = (transacoes || []).map(t => ({
        ...t,
        nomeSolicitanteResolvido: t.solicitante_nome || mapaMediuns[t.solicitado_por] || 'Médium',
        nomeValidadorResolvido: t.validador_nome || mapaMediuns[t.validado_por] || null
    }));

    let saldo = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;
    let qtdEntradasPendentes = 0;
    let qtdSaidasAuditoria = 0;

    transacoesCache.forEach(t => {
        const valor = parseFloat(t.valor) || 0;
        const ehEntrada = t.tipo === 'entrada';

        if (t.status === 'aprovado') {
            if (ehEntrada) {
                totalEntradas += valor;
                saldo += valor;
            } else {
                totalSaidas += valor;
                saldo -= valor;
            }
        } else if (t.status === 'pendente' && ehEntrada) {
            qtdEntradasPendentes++;
        } else if ((t.status === 'aguardando_auditoria' || t.status === 'pendente') && !ehEntrada) {
            qtdSaidasAuditoria++;
        }
    });

    document.getElementById('cantinaSaldo').textContent = saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('cantinaEntradas').textContent = totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('cantinaSaidas').textContent = totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const totalPendencias = qtdEntradasPendentes + qtdSaidasAuditoria;
    const widgetPend = document.getElementById('widgetQtdPendenciasCantina');
    if (widgetPend) widgetPend.textContent = totalPendencias;

    const bEnt = document.getElementById('badgeQtdEntradasPend');
    if (bEnt) {
        bEnt.textContent = qtdEntradasPendentes;
        bEnt.classList.toggle('hidden', qtdEntradasPendentes === 0);
    }

    const bSai = document.getElementById('badgeQtdSaidasAudit');
    if (bSai) {
        bSai.textContent = qtdSaidasAuditoria;
        bSai.classList.toggle('hidden', qtdSaidasAuditoria === 0);
    }

    renderizarListaFiltradaCantina();
}

window.alternarFiltroAbaCantina = (aba) => {
    filtroAbaAtual = aba;

    const botoes = {
        todos: document.getElementById('tabCantinaExtrato'),
        entradas_pendentes: document.getElementById('tabCantinaEntradasPend'),
        saidas_auditoria: document.getElementById('tabCantinaSaidasAudit')
    };

    Object.keys(botoes).forEach(k => {
        if (!botoes[k]) return;
        if (k === aba) {
            botoes[k].className = "py-3 px-4 rounded-2xl font-black text-xs md:text-sm transition-all shadow-md bg-tema-secundaria text-white active:scale-95 flex items-center justify-center gap-2 border-b-4 border-black/20";
        } else {
            botoes[k].className = "py-3 px-4 rounded-2xl font-bold text-xs md:text-sm transition-all shadow-sm bg-white text-gray-600 hover:text-gray-900 border border-gray-200 active:scale-95 flex items-center justify-center gap-2";
        }
    });

    renderizarListaFiltradaCantina();
};

function renderizarListaFiltradaCantina() {
    const container = document.getElementById('listaExtratoCantina');
    if (!container) return;

    const lista = transacoesCache.filter(t => {
        if (filtroAbaAtual === 'entradas_pendentes') return t.tipo === 'entrada' && t.status === 'pendente';
        if (filtroAbaAtual === 'saidas_auditoria') return t.tipo === 'saida' && (t.status === 'aguardando_auditoria' || t.status === 'pendente');
        if (filtroAbaAtual === 'pendentes') return t.status !== 'aprovado' && t.status !== 'rejeitado';
        return true;
    });

    if (lista.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400 text-xs font-medium">Nenhuma movimentação encontrada para este filtro.</div>`;
        return;
    }

    container.innerHTML = lista.map(t => {
        const valor = parseFloat(t.valor) || 0;
        const valFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const ehEntrada = t.tipo === 'entrada';
        const dataFmt = new Date(t.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        let bolinhaStatus = '🟢';
        let corValor = ehEntrada ? 'text-green-600' : 'text-red-600';
        let sinal = ehEntrada ? '+' : '-';
        let textoStatus = '';

        const primeiroNomeValidador = t.nomeValidadorResolvido ? t.nomeValidadorResolvido.split(' ')[0] : 'Diretoria';
        const primeiroNomeSolicitante = t.nomeSolicitanteResolvido ? t.nomeSolicitanteResolvido.split(' ')[0] : 'Médium';

        if (t.status === 'aprovado') {
            bolinhaStatus = ehEntrada ? '🟢' : '🔴';
            if (t.metodo_pagamento === 'asaas') {
                textoStatus = `<span class="bg-green-100 text-green-800 text-[10px] font-black px-2 py-0.5 rounded-full">⚡ Aprovado via Asaas PIX</span>`;
            } else {
                const labelAcao = ehEntrada ? 'Aprovado por' : 'Validado por';
                textoStatus = `<span class="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">${labelAcao} ${primeiroNomeValidador}</span>`;
            }
        } else if (t.status === 'rejeitado') {
            bolinhaStatus = '⚪';
            corValor = 'text-gray-400 line-through';
            textoStatus = `<span class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Rejeitado por ${primeiroNomeValidador}</span>`;
        } else {
            bolinhaStatus = '🟡';
            corValor = 'text-amber-600';
            const lancadoPeloProprio = String(t.solicitado_por) === String(usuarioLogadoAuthId);
            textoStatus = lancadoPeloProprio
                ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full"><i class="fas fa-user-clock mr-1"></i>Aguardando Validação Cruzada</span>`
                : (ehEntrada
                    ? `<span class="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-full">Pendente (Validar Entrada)</span>`
                    : `<span class="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-full">Aguardando Auditoria (Saída)</span>`);
        }

        // Regra de Validação Cruzada (Ninguém valida o próprio lançamento):
        const naoFuiEuQueLancei = String(t.solicitado_por) !== String(usuarioLogadoAuthId);
        const temPapelValidador = (ehGestorCantina || ehValidadorCantina || ehAdmin);
        const estaPendente = (t.status === 'pendente' || t.status === 'aguardando_auditoria');
        const podeAgir = naoFuiEuQueLancei && temPapelValidador && estaPendente;

        const labelBotaoAnexo = ehEntrada ? 'Ver Recibo' : 'Ver Nota Fiscal';
        let botoesHtml = '';

        if (t.comprovante_url) {
            botoesHtml += `
                <button type="button" onclick="abrirModalAnexoCantina(${t.id})" class="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-xl border border-gray-300 transition active:scale-95 inline-flex items-center gap-1">
                    <i class="fas fa-receipt text-tema-primaria"></i> ${labelBotaoAnexo}
                </button>
            `;
        }

        if (podeAgir) {
            const labelBtnAprovar = ehEntrada ? 'Aprovar PIX' : 'Validar Despesa';
            botoesHtml += `
                <button type="button" onclick="processarDecisaoCantina(${t.id}, 'aprovado')" class="text-[11px] bg-green-600 hover:bg-green-700 text-white font-black px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 inline-flex items-center gap-1">
                    <i class="fas fa-check"></i> ${labelBtnAprovar}
                </button>
                <button type="button" onclick="processarDecisaoCantina(${t.id}, 'rejeitado')" class="text-[11px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2.5 py-1.5 rounded-xl border border-red-200 transition active:scale-95">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }

        return `
            <div class="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                    <div class="text-lg leading-none mt-0.5 select-none">${bolinhaStatus}</div>
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-black text-sm ${corValor}">${sinal} ${valFmt}</span>
                            <span class="text-gray-300">|</span>
                            <span class="font-bold text-xs md:text-sm text-gray-800">${t.descricao}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
                            <span><i class="far fa-clock mr-1"></i>${dataFmt}</span>
                            <span>•</span>
                            <span>Enviado por: <strong>${primeiroNomeSolicitante}</strong></span>
                            ${textoStatus}
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    ${botoesHtml}
                </div>
            </div>
        `;
    }).join('');
}

window.abrirModalNovaTransacao = (tipo) => {
    document.getElementById('formTipoTransacao').value = tipo;
    document.getElementById('formValorTransacao').value = '';
    document.getElementById('formDescricaoTransacao').value = '';
    document.getElementById('formArquivoTransacao').value = '';

    document.getElementById('tituloModalTransacao').innerHTML = tipo === 'entrada'
        ? '<i class="fas fa-arrow-down text-green-600 mr-2"></i> Registrar Entrada'
        : '<i class="fas fa-arrow-up text-red-600 mr-2"></i> Registrar Despesa (Saída)';

    const lblUp = document.getElementById('labelUploadTransacao');
    const dicaUp = document.getElementById('dicaUploadTransacao');
    if (tipo === 'saida') {
        lblUp.textContent = 'Foto da Nota Fiscal do Mercado (Obrigatório) *';
        dicaUp.textContent = 'Ficará aguardando validação cruzada do outro responsável.';
    } else {
        lblUp.textContent = 'Comprovante / Recibo da Entrada (Opcional)';
        dicaUp.textContent = 'Ficará pendente para validação cruzada do outro responsável.';
    }

    document.getElementById('modalTransacao').classList.remove('hidden');
};

window.fecharModalTransacao = () => {
    document.getElementById('modalTransacao').classList.add('hidden');
};

window.salvarTransacao = async () => {
    const tipo = document.getElementById('formTipoTransacao').value;
    const valor = parseFloat(document.getElementById('formValorTransacao').value);
    const descricao = document.getElementById('formDescricaoTransacao').value.trim();
    const arquivoInput = document.getElementById('formArquivoTransacao');
    const btn = document.getElementById('btnSalvarTransacao');

    if (!valor || isNaN(valor) || valor <= 0) return alert("Digite um valor válido.");
    if (!descricao) return alert("Digite a descrição.");
    if (tipo === 'saida' && (!arquivoInput.files || arquivoInput.files.length === 0)) {
        return alert("Para registrar uma despesa, é obrigatório anexar a foto da Nota Fiscal.");
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        let urlComprovante = null;

        if (arquivoInput.files && arquivoInput.files.length > 0) {
            const arquivoOtimizado = await comprimirImagemCantina(arquivoInput.files[0], 1200, 1200, 0.82);
            const ext = arquivoOtimizado.name.split('.').pop();
            const fileName = `${idTerreiroGlobal}/cantina_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { error: uploadError } = await dbCantina.storage.from('comprovantes').upload(fileName, arquivoOtimizado);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = dbCantina.storage.from('comprovantes').getPublicUrl(fileName);
            urlComprovante = publicUrlData.publicUrl;
        }

        const statusInicial = tipo === 'entrada' ? 'pendente' : 'aguardando_auditoria';

        const { error: dbError } = await dbCantina.from('caixa_cantina').insert([{
            terreiro_id: idTerreiroGlobal,
            tipo: tipo,
            valor: valor,
            descricao: descricao,
            comprovante_url: urlComprovante,
            status: statusInicial,
            metodo_pagamento: 'manual',
            solicitado_por: usuarioLogadoAuthId,
            solicitante_nome: mediumLogado?.nome_completo || 'Gestão Cantina',
            validado_por: null,
            validador_nome: null,
            data_validacao: null
        }]);

        if (dbError) throw dbError;

        alert(tipo === 'entrada'
            ? '✅ Entrada registrada! Aguardando validação cruzada do outro responsável.'
            : '✅ Despesa registrada! Aguardando validação cruzada do outro responsável.');
        fecharModalTransacao();
        await carregarExtratoCantina();

    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Registrar';
    }
};

window.abrirModalAnexoCantina = (idTransacao) => {
    const t = transacoesCache.find(x => Number(x.id) === Number(idTransacao));
    if (!t || !t.comprovante_url) return;

    const valFmt = Number(t.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const ehEntrada = t.tipo === 'entrada';

    document.getElementById('modalAnexoSubtitulo').textContent = `${t.descricao} — ${valFmt} (Enviado por ${t.nomeSolicitanteResolvido})`;

    const frame = document.getElementById('frameAnexoCantina');
    const img = document.getElementById('imgAnexoCantina');
    const loader = document.getElementById('loaderAnexoCantina');

    loader.classList.remove('hidden');
    frame.classList.add('hidden');
    img.classList.add('hidden');

    if (t.comprovante_url.toLowerCase().includes('.pdf')) {
        frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(t.comprovante_url)}&embedded=true`;
        frame.classList.remove('hidden');
    } else {
        img.src = t.comprovante_url;
        img.classList.remove('hidden');
        if (typeof window.resetarZoomAnexoCantina === 'function') window.resetarZoomAnexoCantina();
    }

    const naoFuiEuQueLancei = String(t.solicitado_por) !== String(usuarioLogadoAuthId);
    const temPapelValidador = (ehGestorCantina || ehValidadorCantina || ehAdmin);
    const estaPendente = (t.status === 'pendente' || t.status === 'aguardando_auditoria');
    const boxAcoes = document.getElementById('boxBotoesAcaoModalAnexo');

    if (naoFuiEuQueLancei && temPapelValidador && estaPendente) {
        boxAcoes.classList.remove('hidden');
        const btnAprovar = document.getElementById('btnAprovarModalCantina');
        const btnRejeitar = document.getElementById('btnRejeitarModalCantina');

        btnAprovar.innerHTML = ehEntrada
            ? `<i class="fas fa-check"></i> Aprovar PIX (${valFmt})`
            : `<i class="fas fa-check"></i> Validar Despesa (${valFmt})`;

        btnAprovar.onclick = () => processarDecisaoCantina(t.id, 'aprovado');
        btnRejeitar.onclick = () => processarDecisaoCantina(t.id, 'rejeitado');
    } else {
        boxAcoes.classList.add('hidden');
    }

    document.getElementById('modalVerAnexoCantina').classList.remove('hidden');
};

window.fecharModalAnexoCantina = () => {
    document.getElementById('modalVerAnexoCantina').classList.add('hidden');
    document.getElementById('frameAnexoCantina').src = '';
    document.getElementById('imgAnexoCantina').src = '';
};

window.processarDecisaoCantina = async (idTransacao, novoStatus) => {
    const t = transacoesCache.find(x => Number(x.id) === Number(idTransacao));
    if (!t) return;

    const ehEntrada = t.tipo === 'entrada';
    if (String(t.solicitado_por) === String(usuarioLogadoAuthId)) {
        return alert("Bloqueio de Auditoria Cruzada: Você não pode aprovar ou validar um lançamento feito por você mesmo. O outro responsável deve validar.");
    }
    if (!ehGestorCantina && !ehValidadorCantina && !ehAdmin) {
        return alert("Apenas o(a) Gestor(a) ou o(a) Validador(a) da Cantina podem validar lançamentos.");
    }

    const valFmt = Number(t.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const msgConfirm = novoStatus === 'aprovado'
        ? (ehEntrada ? `Confirmar recebimento do PIX de ${valFmt} e somar ao saldo da Cantina?` : `Validar esta Nota Fiscal de ${valFmt} e deduzir do saldo da Cantina?`)
        : `Tem certeza que deseja REJEITAR este lançamento de ${valFmt}?`;

    if (!confirm(msgConfirm)) return;

    try {
        const { error } = await dbCantina
            .from('caixa_cantina')
            .update({
                status: novoStatus,
                validado_por: usuarioLogadoAuthId,
                validador_nome: mediumLogado?.nome_completo || 'Validador',
                data_validacao: new Date().toISOString()
            })
            .eq('id', idTransacao)
            .eq('terreiro_id', idTerreiroGlobal);

        if (error) throw error;

        fecharModalAnexoCantina();
        await carregarExtratoCantina();
    } catch (e) {
        alert("Erro ao processar: " + e.message);
    }
};

function configurarZoomPinchCantina() {
    const container = document.querySelector('#modalVerAnexoCantina .area-zoom');
    const img = document.getElementById('imgAnexoCantina');
    if (!container || !img) return;

    let scale = 1, panning = false, pointX = 0, pointY = 0, start = { x: 0, y: 0 }, startDist = 0, startScale = 1, lastTap = 0;

    window.resetarZoomAnexoCantina = () => {
        scale = 1; pointX = 0; pointY = 0;
        img.style.transition = 'transform 0.2s ease-out';
        img.style.transform = `translate(0px, 0px) scale(1)`;
    };

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            panning = false;
            startDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            startScale = scale;
        } else if (e.touches.length === 1 && scale > 1) {
            panning = true;
            start = { x: e.touches[0].clientX - pointX, y: e.touches[0].clientY - pointY };
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            img.style.transition = 'none';
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            scale = Math.min(Math.max(1, startScale * (dist / startDist)), 4);
            img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        } else if (e.touches.length === 1 && panning) {
            e.preventDefault();
            img.style.transition = 'none';
            pointX = e.touches[0].clientX - start.x;
            pointY = e.touches[0].clientY - start.y;
            img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300 && now - lastTap > 0) {
            scale = scale > 1 ? 1 : 2.5;
            pointX = 0; pointY = 0;
            img.style.transition = 'transform 0.2s ease-out';
            img.style.transform = `translate(0px, 0px) scale(${scale})`;
            e.preventDefault();
        }
        lastTap = now;
        if (scale <= 1) window.resetarZoomAnexoCantina();
    });
}
