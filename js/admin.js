let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

let nomeTerreiroGlobal = "";
let logoTerreiroGlobal = "";
let mapaGlobal = null;
let marcadorGlobal = null;
let circuloGlobal = null;
let listaMediunsGlobal = []; 

function comprimirImagem(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.match(/image.*/)) return resolve(file);

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width, height = image.height;
                if (width > height) {
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    const ext = file.name.split('.').pop() || 'jpg';
                    const novoArquivo = new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), { type: file.type.includes('png') ? 'image/png' : 'image/jpeg', lastModified: Date.now() });
                    resolve(novoArquivo);
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
    try {
        let emModoMasterPuro = false;
        let terreiroSaaSForcado = null;

        const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataStr = new Date().toLocaleDateString('pt-BR', dataOpcoes);
        if(document.getElementById('dataHoje')) document.getElementById('dataHoje').textContent = dataStr;
        if(document.getElementById('dataHojeMobile')) document.getElementById('dataHojeMobile').textContent = dataStr;

        const sidebar = document.getElementById('sidebar');
        const overlayMobile = document.getElementById('overlayMobile');
        const btnAbrirMenu = document.getElementById('btnAbrirMenu');
        const btnFecharMenu = document.getElementById('btnFecharMenu');

        function toggleMenu() {
            if (!sidebar || !overlayMobile) return;
            if (!sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full'); overlayMobile.classList.add('hidden');
            } else {
                sidebar.classList.remove('-translate-x-full'); overlayMobile.classList.remove('hidden');
            }
        }

        if(btnAbrirMenu) btnAbrirMenu.addEventListener('click', toggleMenu);
        if(btnFecharMenu) btnFecharMenu.addEventListener('click', toggleMenu);
        if(overlayMobile) overlayMobile.addEventListener('click', toggleMenu);

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return window.location.replace('index.html');

        const btnSair = document.getElementById('btnSair');
        if (btnSair) {
            btnSair.addEventListener('click', async () => {
                btnSair.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saindo...';
                await supabaseClient.auth.signOut(); localStorage.clear(); window.location.replace('index.html'); 
            });
        }

        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, is_master, perm_visao_geral, perm_ata')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        perfilAdminLogado = perfil;

        const temAcessoPainel = perfil.is_admin || perfil.perm_visao_geral || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin || perfil.perm_ata || perfil.is_master;
        if (!temAcessoPainel) { alert('Acesso negado.'); return window.location.replace('presenca.html'); }
        
        if (perfil.is_master) {
            if (document.getElementById('menuMaster')) document.getElementById('menuMaster').classList.remove('hidden');
            terreiroSaaSForcado = localStorage.getItem('terreiroAtivoSaaS');
            
            if (terreiroSaaSForcado) {
                idTerreiroGlobal = terreiroSaaSForcado;
                const avisoInfiltrado = document.createElement('div');
                avisoInfiltrado.className = "bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-50 flex flex-col md:flex-row justify-center items-center gap-2 md:space-x-4 flex-shrink-0";
                avisoInfiltrado.innerHTML = `<span><i class="fas fa-user-secret mr-2"></i> MODO SUPORTE: logado no painel do cliente.</span><button onclick="voltarParaMeuPainel()" class="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold shadow border border-red-200">Sair do Modo Suporte</button>`;
                const containerPrincipal = document.querySelector('.flex-1.flex-col') || document.body;
                containerPrincipal.insertBefore(avisoInfiltrado, containerPrincipal.firstChild);
                perfil.is_admin = true; perfil.perm_visao_geral = true; perfil.perm_agenda = true; perfil.perm_ata = true; perfil.perm_grau = true; perfil.perm_financeiro = true; perfil.perm_doacoes = true; perfil.perm_admin = true;
            } else { emModoMasterPuro = true; idTerreiroGlobal = null; }
        } else { idTerreiroGlobal = perfil.terreiro_id; }

        if (emModoMasterPuro) {
            ['menuVisaoGeral', 'menuQuadroMediuns', 'menuAgendaGiras', 'menuLivroAta', 'menuGrau', 'menuFinanceiro', 'menuDoacoes', 'menuAdmin'].forEach(id => {
                if (document.getElementById(id)) document.getElementById(id).classList.add('hidden');
            });
            document.querySelectorAll('#sidebar hr').forEach(hr => hr.classList.add('hidden'));
            if(document.getElementById('nomeTerreiroSidebar')) document.getElementById('nomeTerreiroSidebar').textContent = "Gestão SaaS";
        } else {
            if (!perfil.is_admin) {
                if (!perfil.perm_visao_geral) document.getElementById('menuVisaoGeral')?.classList.add('hidden');
                if (!perfil.perm_agenda) document.getElementById('menuAgendaGiras')?.classList.add('hidden');
                if (!perfil.perm_ata) document.getElementById('menuLivroAta')?.classList.add('hidden');
                if (!perfil.perm_grau) document.getElementById('menuGrau')?.classList.add('hidden');
                if (!perfil.perm_financeiro) document.getElementById('menuFinanceiro')?.classList.add('hidden');
                if (!perfil.perm_doacoes) document.getElementById('menuDoacoes')?.classList.add('hidden');
                if (!perfil.perm_admin) document.getElementById('menuAdmin')?.classList.add('hidden');
            }
        }

        const primeiroNome = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Admin';
        if(document.getElementById('nomeAdmin')) document.getElementById('nomeAdmin').textContent = 'Olá, ' + primeiroNome;
        if(document.getElementById('nomeAdminMobile')) document.getElementById('nomeAdminMobile').textContent = primeiroNome;
        
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient.from('terreiros').select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto').eq('id', idTerreiroGlobal).single();
            if (terreiro) {
                nomeTerreiroGlobal = terreiro.nome; logoTerreiroGlobal = terreiro.logo_url;
                if(document.getElementById('nomeTerreiroSidebar')) document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);
                if(terreiro.logo_url && document.getElementById('logoSidebar')) {
                    document.getElementById('logoSidebar').src = terreiro.logo_url; document.getElementById('logoSidebar').classList.remove('hidden');
                }
            }
        }

        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.replace('bg-white/20', 'hover:bg-white/10'));
                menu.classList.replace('hover:bg-white/10', 'bg-white/20');
                
                secoes.forEach(s => s.classList.add('hidden'));
                const titulo = document.getElementById('tituloSecao');
                const tituloMobile = document.getElementById('tituloMobile');
                const aplicarTitulos = (texto) => { if (titulo) titulo.textContent = texto; if (tituloMobile) tituloMobile.textContent = texto; };

                if (menu.id === 'menuVisaoGeral') { document.getElementById('secVisaoGeral')?.classList.remove('hidden'); aplicarTitulos('Visão Geral'); carregarPainelInicial(); }
                else if (menu.id === 'menuQuadroMediuns') { document.getElementById('secQuadroMediuns')?.classList.remove('hidden'); aplicarTitulos('Quadro de Médiuns'); carregarQuadroMediuns(); }
                else if (menu.id === 'menuAgendaGiras') { document.getElementById('secAgendaGiras')?.classList.remove('hidden'); aplicarTitulos('Agenda de Eventos'); carregarAgenda(); }
                else if (menu.id === 'menuLivroAta') { document.getElementById('secLivroAta')?.classList.remove('hidden'); aplicarTitulos('Livro de Presença (ATA)'); window.carregarLivroAta(); }
                else if (menu.id === 'menuGrau') { document.getElementById('secGrau')?.classList.remove('hidden'); aplicarTitulos('Alteração de Grau'); carregarTabelaGraus(); }
                else if (menu.id === 'menuFinanceiro') { document.getElementById('secFinanceiro')?.classList.remove('hidden'); aplicarTitulos('Controle Financeiro'); carregarFinanceiro(); }
                else if (menu.id === 'menuDoacoes') { document.getElementById('secDoacoes')?.classList.remove('hidden'); aplicarTitulos('Doações e Campanhas'); window.carregarDoacoesPrometidas(); window.carregarDoacoesCatalogo(); }
                else if (menu.id === 'menuAdmin') { document.getElementById('secAdministracao')?.classList.remove('hidden'); aplicarTitulos('Configurações da Casa'); carregarConfiguracoesCasa(); }
                else if (menu.id === 'menuMaster') { document.getElementById('secMaster')?.classList.remove('hidden'); aplicarTitulos('Gestão da Plataforma (SaaS)'); carregarGestaoPlataforma(); }

                if (window.innerWidth < 768 && sidebar && overlayMobile) { sidebar.classList.add('-translate-x-full'); overlayMobile.classList.add('hidden'); }
            });
        });

        if (document.getElementById('formConfigMensalidade')) {
            document.getElementById('formConfigMensalidade').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btnSalvarConfigMensalidade');
                const msg = document.getElementById('msgConfigMensalidade');
                btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                
                try {
                    let gateway = 'manual';
                    document.getElementsByName('gatewayPagamento').forEach(r => { if(r.checked) gateway = r.value; });
                    const chavePix = document.getElementById('chavePixManual').value.trim();
                    const asaasKey = document.getElementById('asaasApiKey') ? document.getElementById('asaasApiKey').value.trim() : '';
                    
                    const { error: errT } = await supabaseClient.from('terreiros').update({ gateway_pagamento: gateway, chave_pix_manual: chavePix, asaas_api_key: asaasKey }).eq('id', idTerreiroGlobal);
                    if (errT) throw errT;
                    
                    const inputs = document.querySelectorAll('.input-valor-grau');
                    const upserts = Array.from(inputs).map(inp => { return { terreiro_id: idTerreiroGlobal, grau: inp.getAttribute('data-grau'), valor: parseFloat(inp.value) || 0 }; });
                    if(upserts.length > 0){
                        const { error: errM } = await supabaseClient.from('config_mensalidades').upsert(upserts, { onConflict: 'terreiro_id,grau' });
                        if(errM) throw errM;
                    }
                    
                    if (msg) {
                        msg.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Configurações financeiras salvas!';
                        msg.className = 'text-sm text-green-600 block mb-4 border border-green-200 bg-green-50 p-2 rounded';
                        msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 5000);
                    }
                } catch(error) {
                    if (msg) { msg.textContent = '❌ Erro: ' + error.message; msg.className = 'text-sm text-red-600 block mb-4'; msg.classList.remove('hidden'); }
                } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar Tesouraria'; }
            });
        }

        setTimeout(() => {
            const btnPDFDoacoes = document.getElementById('btnGerarPDF_doacoes');
            if (btnPDFDoacoes) {
                const novoBtn = btnPDFDoacoes.cloneNode(true);
                btnPDFDoacoes.parentNode.replaceChild(novoBtn, btnPDFDoacoes);
                novoBtn.addEventListener('click', () => {
                    if (!window.dadosDoacoesParaPDF || !window.dadosDoacoesParaPDF.doacoes || window.dadosDoacoesParaPDF.doacoes.length === 0) return alert('Nenhuma doação.');
                    const { doacoes, mediuns, itens } = window.dadosDoacoesParaPDF;
                    const dados = doacoes.map(d => {
                        const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                        const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                        const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                        const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                        return [medium, itemNome, String(d.quantidade), new Date(d.data_registro).toLocaleDateString('pt-BR'), d.entregue ? 'Entregue' : 'Pendente'];
                    });
                    dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
                    window.gerarPDFRelatorio('Relatório de Doações Registradas', ['Médium', 'Item', 'Qtd', 'Data', 'Status'], dados);
                });
            }
        }, 800);

        // ==========================================
        // DECLARAÇÃO DAS FUNÇÕES ASSÍNCRONAS
        // ==========================================
        async function carregarPainelInicial() {
            if(!idTerreiroGlobal) return; 
            try {
                const { count: totalMediuns } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true }).eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema');
                const elTotalMed = document.getElementById('totalMediuns');
                if (elTotalMed) elTotalMed.textContent = totalMediuns || '0';

                const agora = new Date().toISOString();
                const { data: agendaData } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

                let giraAtualId = null;
                const elProxGira = document.getElementById('proximaGira');

                if (agendaData && agendaData.length > 0) {
                    giraAtualId = agendaData[0].id;
                    const dataGira = new Date(agendaData[0].data_hora_inicio).toLocaleString('pt-BR');
                    const badgeRestrita = agendaData[0].especial ? '<span class="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold uppercase">Restrita</span>' : '';
                    if (elProxGira) elProxGira.innerHTML = `${agendaData[0].titulo} ${badgeRestrita} <br><span class="text-sm font-normal text-gray-500">${dataGira}</span>`;
                } else { if (elProxGira) elProxGira.textContent = 'Nenhum evento agendado'; }

                const tabelaPresencas = document.getElementById('tabelaPresencas');
                const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao, status_ativo').eq('terreiro_id', idTerreiroGlobal);

                if (giraAtualId) {
                    const { data: presencas } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = presencas ? presencas.length : '0';

                    if (tabelaPresencas) {
                        if (presencas && presencas.length > 0) {
                            let arrayPresencasVisuais = [];
                            presencas.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                if (md && md.status_ativo === false) return;
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                arrayPresencasVisuais.push({ nome, hora });
                            });
                            arrayPresencasVisuais.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                            tabelaPresencas.innerHTML = ''; 
                            arrayPresencasVisuais.forEach(p => { tabelaPresencas.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${p.nome}</td><td class="p-3 text-gray-600 text-center">${p.hora}</td></tr>`; });
                        } else { tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500">Nenhum check-in ainda.</td></tr>`; }
                    }
                } else {
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = '0';
                    if(tabelaPresencas) tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500">Nenhum evento agendado para o momento.</td></tr>`;
                }

                const selectRelatorio = document.getElementById('selectEventoRelatorio');
                const btnGerarHistorico = document.getElementById('btnBaixarPdfEvento');

                if (selectRelatorio) {
                    const { data: historicoEventos } = await supabaseClient.from('agenda').select('id, titulo, data_hora_inicio, especial').eq('terreiro_id', idTerreiroGlobal).order('data_hora_inicio', { ascending: false });
                    selectRelatorio.innerHTML = '<option value="">Selecione um evento...</option>';
                    if (historicoEventos && historicoEventos.length > 0) {
                        historicoEventos.forEach(ev => {
                            const dataFormatada = new Date(ev.data_hora_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const tipoEvento = ev.especial ? ' [Restrita]' : ' [Aberta]';
                            selectRelatorio.innerHTML += `<option value="${ev.id}">${dataFormatada} - ${ev.titulo}${tipoEvento}</option>`;
                        });
                    } else { selectRelatorio.innerHTML = '<option value="">Nenhum evento encontrado no histórico.</option>'; }
                }

                if (btnGerarHistorico && selectRelatorio) {
                    const novoBtn = btnGerarHistorico.cloneNode(true);
                    btnGerarHistorico.parentNode.replaceChild(novoBtn, btnGerarHistorico);
                    novoBtn.addEventListener('click', async () => {
                        const eventoIdSelecionado = selectRelatorio.value;
                        if (!eventoIdSelecionado) return alert('Por favor, selecione um evento na lista antes de clicar em Baixar.');
                        const originalHtml = novoBtn.innerHTML;
                        novoBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando Documento...';
                        novoBtn.disabled = true;
                        try {
                            const textoOption = selectRelatorio.options[selectRelatorio.selectedIndex].text;
                            const tituloEvStr = textoOption.split(' - ')[1] || 'Evento';
                            const { data: presencasHist } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', eventoIdSelecionado);
                            if (!presencasHist || presencasHist.length === 0) return alert('Nenhum check-in foi registrado para este evento.');
                            const dadosParaPDF = [];
                            presencasHist.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                let cargoExibicao = '-';
                                if (md) { const g = md.grau && md.grau !== '-' ? md.grau : ''; const f = md.funcao && md.funcao !== '-' ? md.funcao : ''; if (g && f) cargoExibicao = `${g}/${f}`; else cargoExibicao = g || f || '-'; }
                                dadosParaPDF.push([nome, cargoExibicao, hora]);
                            });
                            dadosParaPDF.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
                            window.gerarPDFRelatorio(`Relação de Presentes - ${tituloEvStr}`, ['Nome Completo', 'Grau / Função', 'Hora Check-in'], dadosParaPDF);
                        } catch (error) { alert('Erro inesperado ao gerar o relatório.'); } finally { novoBtn.innerHTML = originalHtml; novoBtn.disabled = false; }
                    });
                }
            } catch (err) { console.error('Erro ao carregar painel inicial:', err); }
        }

        async function carregarQuadroMediuns() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando corrente...</td></tr>';
            try {
                const { data, error } = await supabaseClient.from('mediuns').select('id, nome_completo, nome_social, data_nascimento, grau, funcao, telefone, palavra, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, perm_visao_geral, perm_ata, status_ativo').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
                if (error) throw error;
                if (data) data.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
                listaMediunsGlobal = data || [];
                window.mediunsFiltrados = listaMediunsGlobal;
                renderizarTabelaMediuns(listaMediunsGlobal);
                renderizarAniversariantes(listaMediunsGlobal);
            } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500 font-bold">Erro ao carregar dados.</td></tr>`; }
        }

        function renderizarTabelaMediuns(lista) {
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500 font-medium">Nenhum médium encontrado com estes filtros.</td></tr>'; return; }
            lista.forEach(m => {
                let dataNascFormatada = '-';
                if (m.data_nascimento) {
                    if (m.data_nascimento.includes('-')) { const partes = m.data_nascimento.split('-'); if(partes.length === 3) dataNascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`; } else dataNascFormatada = m.data_nascimento; 
                }
                const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
                let status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
                if (m.status_ativo === false) status = '<span class="text-red-600 font-bold">Inativo</span>';
                let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
                if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                    const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false},${m.perm_ata || false}`;
                    const isAtivo = m.status_ativo !== false;
                    const iconInativar = isAtivo ? 'fa-user-times' : 'fa-user-check';
                    const colorInativar = isAtivo ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700';
                    const titleInativar = isAtivo ? 'Inativar Médium' : 'Reativar Médium';
                    acoesHtml = `<div class="flex items-center justify-center space-x-4"><button onclick="alternarStatusAtivoMedium(${m.id}, ${isAtivo})" class="${colorInativar} transition" title="${titleInativar}"><i class="fas ${iconInativar}"></i></button><button onclick="abrirModalEditarMedium(${m.id})" class="text-purple-500 hover:text-purple-700 transition" title="Editar Médium"><i class="fas fa-user-edit"></i></button><button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition" title="Permissões de Acesso"><i class="fas fa-key"></i></button><button onclick="excluirMedium(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 transition" title="Excluir Médium"><i class="fas fa-trash"></i></button></div>`;
                }
                let linkWhats = '-';
                if (m.telefone) {
                    const numeroLimpo = m.telefone.replace(/\D/g, ''); const ddi = numeroLimpo.startsWith('55') ? '' : '55';
                    linkWhats = `<a href="https://wa.me/${ddi}${numeroLimpo}" target="_blank" class="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium"><i class="fab fa-whatsapp text-lg"></i> ${m.telefone}</a>`;
                }
                tbody.innerHTML += `<tr class="hover:bg-gray-50 transition-colors group"><td class="p-4 text-gray-800 font-medium whitespace-nowrap">${m.nome_completo}</td><td class="p-4 text-gray-600 text-center whitespace-nowrap">${dataNascFormatada}</td><td class="p-4 text-gray-600 whitespace-nowrap">${cargo}</td><td class="p-4 text-gray-600">${linkWhats}</td><td class="p-4 text-center">${status}</td><td class="p-4 text-center no-print">${acoesHtml}</td></tr>`;
            });
        }

        function renderizarAniversariantes(lista) {
            const ul = document.getElementById('listaAniversariantes');
            const titulo = document.getElementById('tituloAniversariantesMes');
            if (!ul) return;
            const dataAtual = new Date();
            const mesAtualNum = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
            const nomeMesAtual = dataAtual.toLocaleString('pt-BR', { month: 'long' });
            if(titulo) titulo.textContent = `Aniversariantes de ${nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1)}`;

            const aniversariantes = lista.filter(m => {
                if (!m.data_nascimento) return false;
                let mesNasc = '';
                if (m.data_nascimento.includes('-')) mesNasc = m.data_nascimento.split('-')[1];
                else if (m.data_nascimento.includes('/')) mesNasc = m.data_nascimento.split('/')[1];
                return mesNasc === mesAtualNum;
            });

            aniversariantes.sort((a, b) => {
                let diaA = 0, diaB = 0;
                if(a.data_nascimento.includes('-')) diaA = parseInt(a.data_nascimento.split('-')[2]);
                if(b.data_nascimento.includes('-')) diaB = parseInt(b.data_nascimento.split('-')[2]);
                return diaA - diaB;
            });
            window.aniversariantesAtuais = aniversariantes; 
            ul.innerHTML = '';
            if (aniversariantes.length === 0) { ul.innerHTML = `<li class="p-6 text-center text-gray-400 flex flex-col items-center justify-center gap-2"><i class="fas fa-calendar-times text-2xl mb-1"></i><span class="text-sm">Nenhum médium faz aniversário<br>neste mês.</span></li>`; return; }

            aniversariantes.forEach(m => {
                let dia = '00', mes = '00';
                if (m.data_nascimento.includes('-')) { const p = m.data_nascimento.split('-'); dia = p[2]; mes = p[1]; }
                const nomeExibicao = m.nome_completo.split(' ')[0] || 'Médium';
                ul.innerHTML += `<li class="p-3 hover:bg-gray-50 flex items-center justify-between transition-colors border-l-4 border-transparent hover:border-blue-500"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold shadow-inner border border-blue-200">${dia}</div><div><p class="text-sm font-bold text-gray-800 flex items-center">${nomeExibicao}</p><p class="text-[10px] text-gray-500 uppercase">${m.grau || 'Médium'}</p></div></div><span class="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">${dia}/${mes}</span></li>`;
            });
        }

        async function carregarAgenda() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGirasCadastradas');
            if (!tbody) return;
            const agora = new Date().toISOString();
            const { data } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(15); 
            tbody.innerHTML = '';
            if(data && data.length > 0) {
                data.forEach(g => {
                    const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                    const imgHtml = g.imagem_url ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded text-xs transition" title="Ver Cartaz"><i class="fas fa-image"></i> Cartaz</a>` : `<span class="text-gray-400 text-xs">-</span>`;
                    const badgeEspecial = g.especial ? '<span class="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Restrita</span>' : '';
                    const acoesBloco = `<div class="flex items-center justify-center space-x-2">${imgHtml}<div class="h-4 border-l border-gray-300 mx-2"></div><button onclick="abrirModalEditarGira('${g.id}')" class="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold py-1 px-2 rounded shadow transition" title="Editar Título/Hora"><i class="fas fa-edit"></i></button><button onclick="excluirGira('${g.id}', '${g.data_hora_inicio}')" class="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded shadow transition" title="Excluir Evento"><i class="fas fa-trash"></i></button></div>`;
                    tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${g.titulo} ${badgeEspecial}</td><td class="p-3 text-gray-600">${inicio}</td><td class="p-3 text-center">${acoesBloco}</td></tr>`;
                });
            } else { tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum evento agendado no momento.</td></tr>'; }
        }

        async function carregarTabelaGraus() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGraus');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
            const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, nome_social, grau, funcao').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
            if (data) { mediunsGrauCache = data; renderizarGraus(data); }
        }

        async function carregarFinanceiro() {
            if(!idTerreiroGlobal) return;
            const ano = parseInt(document.getElementById('selectAnoFinanceiro').value);
            const tbody = document.getElementById('tabelaFinanceiro');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
            
            const { data: mediuns } = await supabaseClient.from('mediuns').select('id, nome_completo, nome_social').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
            if(!mediuns || mediuns.length === 0) { tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Nenhum médium cadastrado neste terreiro.</td></tr>'; return; }

            const idsMediunsDesteTerreiro = mediuns.map(m => m.id);
            const { data: pgtos } = await supabaseClient.from('financeiro').select('*').eq('ano', ano).in('medium_id', idsMediunsDesteTerreiro);
            
            tbody.innerHTML = '';
            mediuns.forEach(m => {
                const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
                let htmlMeses = ''; let emDia = true;
                const mesAtual = new Date().getMonth() + 1; const anoAtual = new Date().getFullYear();

                for (let i = 1; i <= 12; i++) {
                    const pago = meusPgtos.some(p => p.mes === i && p.pago);
                    const passou = (ano < anoAtual) || (ano === anoAtual && i < mesAtual);
                    if (passou && !pago) emDia = false;
                    const checkStr = pago ? 'checked' : '';
                    htmlMeses += `<td class="py-1 px-1 border-b border-gray-100"><input type="checkbox" ${checkStr} class="w-4 h-4 cursor-pointer accent-tema-secundaria" onchange="salvarPagamento(${m.id}, ${i}, ${ano}, this.checked)"></td>`;
                }
                const statusHtml = emDia ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>' : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>';
                tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs truncate max-w-[220px]">${m.nome_completo}</td>${htmlMeses}<td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td></tr>`;
            });
        }

        async function carregarConfiguracoesCasa() {
            if (!idTerreiroGlobal) return;
            const { data } = await supabaseClient.from('terreiros').select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, latitude, longitude, modulo_mensalidade_ativo, gateway_pagamento, chave_pix_manual, asaas_api_key').eq('id', idTerreiroGlobal).single();
            if (data) {
                if(data.logo_url) {
                    const prev = document.getElementById('previewLogo');
                    if (prev) { prev.src = data.logo_url; prev.classList.remove('hidden'); }
                    document.getElementById('placeholderLogo')?.classList.add('hidden');
                }
                if(document.getElementById('corPrimaria')) document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
                if(document.getElementById('corSecundaria')) document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
                if(document.getElementById('corFundo')) document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
                if(document.getElementById('corTexto')) document.getElementById('corTexto').value = data.cor_texto || '#1f2937';

                if(document.getElementById('inputLat')) {
                    document.getElementById('inputLat').value = data.latitude || '';
                    document.getElementById('inputLng').value = data.longitude || '';
                    let lat = data.latitude || -14.2350, lng = data.longitude || -51.9253;
                    if(typeof iniciarMapa === 'function') iniciarMapa(lat, lng, data.latitude ? 18 : 4);
                }

                if (data.modulo_mensalidade_ativo) {
                    document.getElementById('boxConfigMensalidade')?.classList.remove('hidden');
                    const radios = document.getElementsByName('gatewayPagamento');
                    radios.forEach(r => {
                        if(r.value === (data.gateway_pagamento || 'manual')) r.checked = true;
                        r.addEventListener('change', (e) => {
                            if(e.target.value === 'manual') { document.getElementById('boxChavePix')?.classList.remove('hidden'); document.getElementById('boxChaveAsaas')?.classList.add('hidden'); } 
                            else { document.getElementById('boxChavePix')?.classList.add('hidden'); document.getElementById('boxChaveAsaas')?.classList.remove('hidden'); }
                        });
                    });
                    
                    if(data.gateway_pagamento === 'asaas') { document.getElementById('boxChavePix')?.classList.add('hidden'); document.getElementById('boxChaveAsaas')?.classList.remove('hidden'); } 
                    else { document.getElementById('boxChavePix')?.classList.remove('hidden'); document.getElementById('boxChaveAsaas')?.classList.add('hidden'); }
                    
                    if(document.getElementById('chavePixManual')) document.getElementById('chavePixManual').value = data.chave_pix_manual || '';
                    if(document.getElementById('asaasApiKey')) document.getElementById('asaasApiKey').value = data.asaas_api_key || '';
                    
                    const { data: configVals } = await supabaseClient.from('config_mensalidades').select('*').eq('terreiro_id', idTerreiroGlobal);
                    const containerGraus = document.getElementById('listaValoresGrau');
                    if(containerGraus) {
                        containerGraus.innerHTML = '';
                        const grausBase = ['I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT', 'Dirigente', 'Outros'];
                        grausBase.forEach(g => {
                            const conf = configVals?.find(c => c.grau === g);
                            const valor = conf ? conf.valor : '0.00';
                            containerGraus.innerHTML += `<div class="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm"><label class="text-[10px] font-black text-gray-500 uppercase mb-1 truncate">${g}</label><div class="flex items-center"><span class="text-xs font-bold text-gray-800 mr-1">R$</span><input type="number" step="0.01" min="0" data-grau="${g}" value="${valor}" class="input-valor-grau w-full px-2 py-1 text-sm border-b-2 border-gray-100 outline-none focus:border-tema-secundaria bg-transparent text-gray-700 font-medium"></div></div>`;
                        });
                    }
                } else { document.getElementById('boxConfigMensalidade')?.classList.add('hidden'); }
            }
        }

        async function carregarGestaoPlataforma() {
            const tbody = document.getElementById('tabelaMasterTerreiros') || document.querySelector('#secMaster tbody');
            if(!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Carregando terreiros...</td></tr>';
            
            const { data, error } = await supabaseClient.from('terreiros').select('*').order('id', { ascending: true });
            if (error) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Erro: ${error.message}</td></tr>`; return; }

            tbody.innerHTML = '';
            data.forEach(t => {
                const statusHtml = t.status_bloqueado ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">Bloqueado</span>' : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Ativo</span>';
                const btnAcessar = `<button onclick="acessarTerreiroSaaS('${t.id}')" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-3 rounded shadow mr-2"><i class="fas fa-sign-in-alt"></i></button>`;
                const btnBloqueio = t.status_bloqueado ? `<button onclick="alternarBloqueioTerreiro('${t.id}', false)" class="text-xs bg-gray-800 text-white py-1 px-3 rounded shadow"><i class="fas fa-lock-open"></i></button>` : `<button onclick="alternarBloqueioTerreiro('${t.id}', true)" class="text-xs bg-red-600 text-white py-1 px-3 rounded shadow"><i class="fas fa-lock"></i></button>`;
                const btnImportar = `<button onclick="abrirModalImportacao('${t.id}', '${t.nome.replace(/'/g, "\\'")}')" class="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded shadow ml-2"><i class="fas fa-file-csv"></i></button>`;
                const statusMensalidade = t.modulo_mensalidade_ativo ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300';
                const btnMensalidade = `<button onclick="alternarModuloMensalidade('${t.id}', ${!t.modulo_mensalidade_ativo})" class="text-xs py-1 px-3 rounded shadow ml-2 transition ${statusMensalidade}" title="Habilitar/Desabilitar Módulo Tesouraria"><i class="fas fa-hand-holding-usd"></i></button>`;
                const acaoHtml = `<div class="flex justify-center items-center">${btnAcessar}${btnBloqueio}${btnImportar}${btnMensalidade}</div>`;
                tbody.innerHTML += `<tr class="border-b border-gray-100 ${t.status_bloqueado ? 'bg-red-50' : ''}"><td class="p-3 text-sm font-mono text-gray-500 truncate max-w-[120px]" title="${t.id}">${t.id.substring(0,8)}...</td><td class="p-3 font-bold text-gray-800">${t.nome}</td><td class="p-3 text-center">${statusHtml}</td><td class="p-3 text-center">${acaoHtml}</td></tr>`;
            });
        }

        // ==========================================
        // DISPARO SEGURO DO CLIQUE INICIAL (AGORA NO ESCOPO CERTO)
        // ==========================================
        if (emModoMasterPuro) {
            document.getElementById('menuMaster')?.click();
        } else if (perfilAdminLogado.is_admin || perfilAdminLogado.perm_visao_geral) {
            document.getElementById('menuVisaoGeral')?.click();
        } else {
            if (perfilAdminLogado.perm_agenda) document.getElementById('menuAgendaGiras')?.click();
            else if (perfilAdminLogado.perm_ata) document.getElementById('menuLivroAta')?.click();
            else document.getElementById('menuQuadroMediuns')?.click(); 
        }

    } catch (error) {
        console.error('Erro de inicialização:', error);
    }
});

// ==========================================
// FUNÇÕES GLOBAIS DE AÇÕES E CLIQUE DO HTML
// ==========================================

function aplicarFiltrosMediuns() {
    const termoNome = (document.getElementById('filtroNomeMedium')?.value || '').toLowerCase();
    const termoGrau = document.getElementById('filtroGrauMedium')?.value || '';
    const termoStatus = document.getElementById('filtroStatusMedium')?.value || '';
    const termoMes = document.getElementById('filtroMesNascimento')?.value || '';

    const listaFiltrada = listaMediunsGlobal.filter(medium => {
        const nomeCompletoStr = (medium.nome_completo || '').toLowerCase();
        const nomeSocialStr = (medium.nome_social || '').toLowerCase();
        const passaNome = nomeCompletoStr.includes(termoNome) || nomeSocialStr.includes(termoNome);
        let passaGrau = true;
        if (termoGrau !== '') { const grauStr = `${medium.grau || ''} ${medium.funcao || ''}`.toLowerCase(); passaGrau = grauStr.includes(termoGrau.toLowerCase()); }
        let passaStatus = true;
        const statusAtual = medium.cadastro_completo ? 'Ativo' : 'Pendente';
        if (termoStatus !== '') passaStatus = (statusAtual === termoStatus);
        let passaMes = true;
        if (termoMes !== '') {
            if (!medium.data_nascimento) passaMes = false;
            else {
                let mesNasc = '';
                if (medium.data_nascimento.includes('-')) mesNasc = medium.data_nascimento.split('-')[1];
                else if (medium.data_nascimento.includes('/')) mesNasc = medium.data_nascimento.split('/')[1];
                passaMes = (mesNasc === termoMes);
            }
        }
        return passaNome && passaGrau && passaStatus && passaMes;
    });

    window.mediunsFiltrados = listaFiltrada;
    const tbody = document.getElementById('tabelaTodosMediuns');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (listaFiltrada.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500 font-medium">Nenhum médium encontrado com estes filtros.</td></tr>'; return; }

    listaFiltrada.forEach(m => {
        let dataNascFormatada = '-';
        if (m.data_nascimento) {
            if (m.data_nascimento.includes('-')) { const partes = m.data_nascimento.split('-'); if(partes.length === 3) dataNascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`; } else dataNascFormatada = m.data_nascimento; 
        }
        const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
        let status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
        if (m.status_ativo === false) status = '<span class="text-red-600 font-bold">Inativo</span>';
        let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
        if (perfilAdminLogado && perfilAdminLogado.is_admin) {
            const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false},${m.perm_ata || false}`;
            const isAtivo = m.status_ativo !== false;
            const iconInativar = isAtivo ? 'fa-user-times' : 'fa-user-check';
            const colorInativar = isAtivo ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700';
            acoesHtml = `<div class="flex items-center justify-center space-x-4"><button onclick="alternarStatusAtivoMedium(${m.id}, ${isAtivo})" class="${colorInativar} transition"><i class="fas ${iconInativar}"></i></button><button onclick="abrirModalEditarMedium(${m.id})" class="text-purple-500 hover:text-purple-700 transition"><i class="fas fa-user-edit"></i></button><button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition"><i class="fas fa-key"></i></button><button onclick="excluirMedium(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 transition"><i class="fas fa-trash"></i></button></div>`;
        }
        let linkWhats = '-';
        if (m.telefone) {
            const numeroLimpo = m.telefone.replace(/\D/g, ''); const ddi = numeroLimpo.startsWith('55') ? '' : '55';
            linkWhats = `<a href="https://wa.me/${ddi}${numeroLimpo}" target="_blank" class="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium"><i class="fab fa-whatsapp text-lg"></i> ${m.telefone}</a>`;
        }
        tbody.innerHTML += `<tr class="hover:bg-gray-50 transition-colors group"><td class="p-4 text-gray-800 font-medium whitespace-nowrap">${m.nome_completo}</td><td class="p-4 text-gray-600 text-center whitespace-nowrap">${dataNascFormatada}</td><td class="p-4 text-gray-600 whitespace-nowrap">${cargo}</td><td class="p-4 text-gray-600">${linkWhats}</td><td class="p-4 text-center">${status}</td><td class="p-4 text-center no-print">${acoesHtml}</td></tr>`;
    });
}

window.gerarPDFRelatorio = (titulo, colunas, dados) => {
    const containerPDF = document.createElement('div');
    containerPDF.style.padding = '20px 30px'; containerPDF.style.fontFamily = 'Arial, sans-serif'; containerPDF.style.color = '#333'; containerPDF.style.position = 'relative';
    let watermark = '';
    if (logoTerreiroGlobal) watermark = `<div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: -1; pointer-events: none;"><img src="${logoTerreiroGlobal}" style="width: 400px; max-width: 80%;"></div>`;
    let html = `${watermark}<table style="width: 100%; margin-bottom: 15px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;"><tr><td style="width: 20%; text-align: left; vertical-align: middle;">${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 70px; max-width: 100px; object-fit: contain;">` : ''}</td><td style="width: 60%; text-align: center; vertical-align: middle;"><h2 style="margin: 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase;">${nomeTerreiroGlobal || 'Templo'}</h2><h3 style="margin: 4px 0 0 0; color: #444; font-size: 16px;">${titulo}</h3><p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p></td><td style="width: 20%;"></td></tr></table><table style="width: 100%; border-collapse: collapse; font-size: 11px; position: relative; z-index: 1;"><thead><tr style="background-color: #f3f4f6;">${colunas.map(c => `<th style="padding: 6px 4px; border: 1px solid #ddd; text-align: left; font-weight: bold; color: #555;">${c}</th>`).join('')}</tr></thead><tbody>`;
    dados.forEach((linha, i) => { const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb'; html += `<tr style="background-color: ${bg};">${linha.map(celula => `<td style="padding: 3px 4px; border: 1px solid #ddd; color: #222; border-bottom: 1px solid #eee;">${celula}</td>`).join('')}</tr>`; });
    html += `</tbody></table>`;
    containerPDF.innerHTML = html;
    html2pdf().set({ margin: 10, filename: `${titulo.replace(/\s+/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(containerPDF).save();
};

window.abrirModalNovoMedium = () => { document.getElementById('msgNovoMedium')?.classList.add('hidden'); document.getElementById('resultadoNovoMedium')?.classList.add('hidden'); const f = document.getElementById('formNovoMedium'); if (f) { f.reset(); f.classList.remove('hidden'); } document.getElementById('modalNovoMedium')?.classList.remove('hidden'); };
window.fecharModalNovoMedium = () => { document.getElementById('modalNovoMedium')?.classList.add('hidden'); document.getElementById('menuQuadroMediuns')?.click(); };

function formatarTitleCaseAdmin(texto) {
    if (!texto) return ''; const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
    return texto.toLowerCase().split(' ').map((palavra, index) => { if (preposicoes.includes(palavra) && index !== 0) return palavra; return palavra.charAt(0).toUpperCase() + palavra.slice(1); }).join(' ');
}

window.abrirModalEditarMedium = (id) => {
    const medium = listaMediunsGlobal.find(m => m.id === id);
    if (!medium) return alert("Médium não encontrado.");
    document.getElementById('editMediumId').value = medium.id; document.getElementById('editMediumNome').value = medium.nome_completo || ''; document.getElementById('editMediumNomeSocial').value = medium.nome_social || ''; document.getElementById('editMediumTelefone').value = medium.telefone || ''; document.getElementById('editMediumNascimento').value = medium.data_nascimento || ''; document.getElementById('editMediumGrau').value = medium.grau || '-'; document.getElementById('editMediumFuncao').value = medium.funcao || '-';
    document.getElementById('msgEditMedium')?.classList.add('hidden'); document.getElementById('modalEditarMedium')?.classList.remove('hidden');
};

window.fecharModalEditarMedium = () => { document.getElementById('modalEditarMedium')?.classList.add('hidden'); };

window.excluirMedium = async (id, nome) => {
    if(!confirm(`ATENÇÃO: Deseja excluir DEFINITIVAMENTE o médium ${nome}?`)) return;
    const { error } = await supabaseClient.from('mediuns').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert('Erro ao excluir: ' + error.message); else { alert('Médium excluído!'); document.getElementById('menuQuadroMediuns')?.click(); }
};

window.alternarStatusAtivoMedium = async (id, statusAtual) => {
    const novoStatus = !statusAtual;
    if(!confirm(novoStatus ? "Deseja REATIVAR o acesso deste médium?" : "Deseja INATIVAR este médium?")) return;
    const { error } = await supabaseClient.from('mediuns').update({ status_ativo: novoStatus }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert('Erro: ' + error.message); else document.getElementById('menuQuadroMediuns')?.click();
};

window.abrirModalPermissoes = (id, nome, permsString) => {
    document.getElementById('idMediumPermissao').value = id; document.getElementById('nomeMediumPermissao').textContent = nome;
    const [pAgenda, pGrau, pFin, pDoa, pAdmin, pVisao, pAta] = permsString.split(',');
    document.getElementById('chkPermAgenda').checked = pAgenda === 'true'; document.getElementById('chkPermGrau').checked = pGrau === 'true'; document.getElementById('chkPermFinanceiro').checked = pFin === 'true'; document.getElementById('chkPermDoacoes').checked = pDoa === 'true'; document.getElementById('chkPermAdmin').checked = pAdmin === 'true';
    if (document.getElementById('chkPermVisao')) document.getElementById('chkPermVisao').checked = pVisao === 'true';
    if (document.getElementById('chkPermAta')) document.getElementById('chkPermAta').checked = pAta === 'true';
    document.getElementById('modalPermissoes').classList.remove('hidden');
};

window.atualizarSelecao = (containerId, checkbox) => {
    let arr = window['selecionados_' + containerId] || [];
    if(checkbox.checked) { if(!arr.includes(checkbox.value)) arr.push(checkbox.value); } else { arr = arr.filter(v => v !== checkbox.value); }
    window['selecionados_' + containerId] = arr;
};

window.filtrarConvocados = (containerId, inputNomeId, selectGrauId) => {
    const termoNome = (document.getElementById(inputNomeId)?.value || '').toLowerCase();
    const termoGrau = (document.getElementById(selectGrauId)?.value || '').toLowerCase();
    const filtrados = (listaMediunsGlobal || []).filter(m => {
        const nomeStr = (m.nome_social ? m.nome_social : m.nome_completo).toLowerCase();
        const passaNome = nomeStr.includes(termoNome);
        let passaGrau = true;
        if (termoGrau !== '') { const grauCompleto = `${m.grau || ''} ${m.funcao || ''}`.toLowerCase(); passaGrau = grauCompleto.includes(termoGrau); }
        return passaNome && passaGrau;
    });
    
    const container = document.getElementById(containerId);
    if(!container) return;
    let html = '';
    const selecionados = window['selecionados_' + containerId] || [];
    if(filtrados.length === 0) { html = '<span class="text-xs text-gray-500">Nenhum médium.</span>'; } 
    else {
        filtrados.forEach(m => {
            const isChecked = selecionados.includes(String(m.id)) ? 'checked' : '';
            html += `<label class="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" value="${m.id}" class="chk-convocado rounded text-red-500" ${isChecked} onchange="atualizarSelecao('${containerId}', this)"><span class="truncate">${m.nome_completo}</span></label>`;
        });
    }
    container.innerHTML = html;
};

window.excluirGira = async (id, dataInicioISO) => {
    const dataInicio = new Date(dataInicioISO); const agora = new Date(); const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);
    if (diferencaHoras < 2) return alert("⚠️ Não é permitido excluir um evento que começa em menos de 2 horas.");
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    const { error } = await supabaseClient.from('agenda').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert("Erro: " + error.message); else { alert("Evento apagado!"); document.getElementById('menuAgendaGiras')?.click(); }
};

window.abrirModalEditarGira = async (id) => {
    const { data, error } = await supabaseClient.from('agenda').select('*').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
    if (error) return alert("Erro: " + error.message);
    document.getElementById('editGiraId').value = data.id; document.getElementById('editGiraTitulo').value = data.titulo;
    const formata = (isoString) => {
        if (!isoString) return ''; const d = new Date(new Date(isoString).toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    document.getElementById('editGiraInicio').value = formata(data.data_hora_inicio); document.getElementById('editGiraFim').value = formata(data.data_hora_fim);
    if (document.getElementById('editGiraGeraAta')) document.getElementById('editGiraGeraAta').checked = data.gera_ata || false;
    document.getElementById('modalEditarGira').classList.remove('hidden');
};

window.fecharModalEditarGira = () => document.getElementById('modalEditarGira').classList.add('hidden');

window.carregarLivroAta = async () => {
    if(!idTerreiroGlobal) return;
    const tbody = document.getElementById('tabelaLivroAta');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('agenda').select('id, titulo, data_hora_inicio, data_hora_fim, ata_encerrada, texto_ata').eq('terreiro_id', idTerreiroGlobal).eq('gera_ata', true).order('data_hora_inicio', { ascending: false }).limit(50); 
        if (error) throw error;
        tbody.innerHTML = '';
        if (!data || data.length === 0) return tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum evento gerou ATA.</td></tr>';
        data.forEach(g => {
            const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
            const statusHtml = g.ata_encerrada ? '<span class="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded">Finalizada</span>' : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Em Aberto</span>';
            let acoesHtml = g.ata_encerrada ? `<button onclick="gerarPDF_ATA('${g.id}')" class="text-xs bg-gray-800 text-white py-1 px-3 rounded shadow"><i class="fas fa-file-pdf mr-1 text-red-400"></i> Baixar Documento</button>` : `<button onclick="abrirModalEscreverAta('${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 py-1 px-3 rounded shadow mr-2">Editar</button><button onclick="encerrarAta('${g.id}')" class="text-xs bg-red-500 text-white py-1 px-3 rounded shadow">Encerrar</button>`;
            tbody.innerHTML += `<tr class="border-b border-gray-100"><td class="p-3 font-medium">${g.titulo}</td><td class="p-3 text-sm">${inicio}</td><td class="p-3 text-center">${statusHtml}</td><td class="p-3 text-center">${acoesHtml}</td></tr>`;
        });
    } catch (error) { tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${error.message}</td></tr>`; }
};

window.abrirModalEscreverAta = async (id) => {
    try {
        const { data } = await supabaseClient.from('agenda').select('texto_ata').eq('id', id).single();
        document.getElementById('ataEventoId').value = id; document.getElementById('ataTexto').value = data?.texto_ata || '';
        document.getElementById('modalEscreverAta').classList.remove('hidden'); document.getElementById('msgEscreverAta').classList.add('hidden');
    } catch (error) { alert("Erro: " + error.message); }
};

window.fecharModalEscreverAta = () => document.getElementById('modalEscreverAta').classList.add('hidden');
window.encerrarAta = async (id) => {
    if(!confirm("Atenção! Ao encerrar, os check-ins serão bloqueados. Confirmar?")) return;
    const { error } = await supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (!error) { alert("Encerrada!"); document.getElementById('menuLivroAta')?.click(); }
};
window.baixarLivroAnual = () => alert("Função em desenvolvimento. Baixe as atas individuais.");
window.arquivarAnoAnterior = async () => {
    const anoAtual = new Date().getFullYear();
    if(!confirm(`Excluir DEFINITIVAMENTE atas anteriores a ${anoAtual}?`)) return;
    const { error } = await supabaseClient.from('agenda').delete().eq('terreiro_id', idTerreiroGlobal).eq('gera_ata', true).lte('data_hora_inicio', `${anoAtual}-01-01T00:00:00`);
    if (!error) { alert("Limpeza concluída!"); document.getElementById('menuLivroAta')?.click(); }
};

window.gerarPDF_ATA = async (eventoId) => {
    try {
        const { data: evento } = await supabaseClient.from('agenda').select('*').eq('id', eventoId).single();
        const { data: presencas } = await supabaseClient.from('presencas').select('data_hora_checkin, usuario_id').eq('evento_id', eventoId).order('data_hora_checkin');
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, grau, funcao').eq('terreiro_id', idTerreiroGlobal);
        const mapaMediuns = {}; mediuns.forEach(m => { mapaMediuns[m.id] = m; if(m.auth_id) mapaMediuns[m.auth_id] = m; });
        
        let trs = '';
        if (presencas && presencas.length > 0) {
            presencas.forEach(p => {
                const medium = mapaMediuns[p.usuario_id] || { nome_completo: 'Médium Desconhecido', grau: '-', funcao: '-' };
                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                trs += `<tr><td style="border-bottom: 1px solid #ddd; padding: 6px;">${medium.nome_completo}</td><td style="border-bottom: 1px solid #ddd; padding: 6px; text-align: center;">${medium.grau || '-'}</td><td style="border-bottom: 1px solid #ddd; padding: 6px; text-align: right;">${hora}</td></tr>`;
            });
        } else { trs = `<tr><td colspan="3" style="text-align: center; padding: 20px;">Nenhum check-in.</td></tr>`; }

        const div = document.createElement('div'); div.style.padding = '40px'; div.style.fontFamily = 'Arial, sans-serif'; div.style.color = '#000'; div.style.backgroundColor = '#fff';
        div.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 80px; margin-bottom: 15px;">` : ''}
            <h1 style="font-size: 20px; font-weight: bold; text-transform: uppercase;">${nomeTerreiroGlobal || 'Templo'}</h1>
            <h2 style="font-size: 16px; font-weight: normal; margin: 0;">LIVRO DE ATAS E PRESENÇAS</h2></div>
            <h3 style="text-align: center; font-size: 16px; margin-bottom: 25px; text-transform: uppercase; background-color: #f3f4f6; padding: 10px;">${evento.titulo}</h3>
            ${evento.texto_ata ? `<p style="text-align: justify; line-height: 1.8; font-size: 14px; margin-bottom: 30px; white-space: pre-wrap;">${evento.texto_ata}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px;">
                <thead><tr><th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: left;">NOME DO MÉDIUM</th><th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: center;">GRAU</th><th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: right;">HORA</th></tr></thead>
                <tbody>${trs}</tbody>
            </table>
        `;
        alert("Gerando Livro de Presença (PDF)... Aguarde.");
        html2pdf().set({ margin: 10, filename: `ATA_${evento.titulo}.pdf`, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(div).save();
    } catch (error) { alert("Não foi possível gerar a ATA."); }
};

window.salvarGrau = async (id) => {
    const btn = document.getElementById(`btnGrau_${id}`);
    const grau = document.getElementById(`grau_${id}`).value;
    const funcao = document.getElementById(`func_${id}`).value;
    btn.innerHTML = 'Salvando...'; btn.disabled = true;
    const { error } = await supabaseClient.from('mediuns').update({ grau, funcao }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    btn.disabled = false;
    if (error) { btn.innerHTML = 'Erro!'; btn.classList.replace('bg-tema-primaria', 'bg-red-500'); } 
    else {
        btn.innerHTML = 'Salvo <i class="fas fa-check"></i>'; btn.classList.replace('bg-tema-primaria', 'bg-green-600');
        setTimeout(() => { btn.innerHTML = 'Salvar'; btn.classList.replace('bg-green-600', 'bg-tema-primaria'); }, 2000);
    }
};

window.salvarPagamento = async (mediumId, mes, ano, status) => {
    const { error } = await supabaseClient.from('financeiro').upsert({ medium_id: mediumId, mes: mes, ano: ano, pago: status }, { onConflict: 'medium_id,mes,ano' });
    if(error) alert('Erro: ' + error.message);
};

window.carregarDoacoesPrometidas = async () => {
    if (!idTerreiroGlobal) return;
    const tbody = document.getElementById('tabelaDoacoesPrometidas');
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Buscando...</td></tr>';
    try {
        const { data: doacoes } = await supabaseClient.from('doacoes_registradas').select('*').eq('terreiro_id', idTerreiroGlobal).order('entregue', { ascending: true }).order('data_registro', { ascending: false }); 
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social').eq('terreiro_id', idTerreiroGlobal);
        const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao').eq('terreiro_id', idTerreiroGlobal);
        window.dadosDoacoesParaPDF = { doacoes, mediuns, itens };

        if (!doacoes || doacoes.length === 0) { if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhum registro.</td></tr>'; return; }
        if(tbody) {
            tbody.innerHTML = '';
            doacoes.forEach(d => {
                const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                const itemNome = itemObj ? `${itemObj.nome}` : 'Item';
                const data = new Date(d.data_registro).toLocaleDateString('pt-BR');
                const statusHtml = d.entregue ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">Entregue</span>' : '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Pendente</span>';
                const acaoBaixa = d.entregue ? `<button onclick="marcarDoacao('${d.id}', false)" class="text-xs text-gray-400 hover:text-gray-800 underline mt-1">Desfazer</button>` : `<button onclick="marcarDoacao('${d.id}', true)" class="bg-tema-secundaria hover:opacity-90 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm mt-1">Dar Baixa</button>`;
                const btnExcluir = `<button onclick="excluirDoacao('${d.id}')" class="text-xs text-red-500 hover:text-red-700 ml-2" title="Excluir Registro"><i class="fas fa-trash"></i></button>`;
                tbody.innerHTML += `<tr class="border-b border-gray-100"><td class="p-3 text-sm">${medium}</td><td class="p-3 text-sm">${itemNome}</td><td class="p-3 text-center font-bold">${d.quantidade}</td><td class="p-3 text-xs text-gray-500">${data}</td><td class="p-3 text-center"><div class="flex items-center justify-center gap-2"><div class="flex flex-col items-center">${statusHtml}${acaoBaixa}</div>${btnExcluir}</div></td></tr>`;
            });
        }
    } catch (error) { if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar doações.</td></tr>`; }
};

window.marcarDoacao = async (id, status) => {
    await supabaseClient.from('doacoes_registradas').update({ entregue: status, data_entrega: status ? new Date().toISOString() : null }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    window.carregarDoacoesPrometidas();
};

window.excluirDoacao = async (id) => {
    if (!confirm('Deseja excluir este registro de doação permanentemente?')) return;
    await supabaseClient.from('doacoes_registradas').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    window.carregarDoacoesPrometidas();
};

window.carregarDoacoesCatalogo = async () => {
    if (!idTerreiroGlobal) return;
    const tbody = document.getElementById('tabelaItensDoacao');
    if(!tbody) return;
    const { data } = await supabaseClient.from('itens_doacao').select('*').eq('terreiro_id', idTerreiroGlobal).order('nome');
    if (data && data.length > 0) {
        tbody.innerHTML = '';
        data.forEach(item => {
            const btn = item.ativo ? `<button onclick="alternarStatusCatalogo('${item.id}', false)" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Ocultar</button>` : `<button onclick="alternarStatusCatalogo('${item.id}', true)" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Ativar</button>`;
            tbody.innerHTML += `<tr class="border-b border-gray-100 ${item.ativo ? '' : 'opacity-40'}"><td class="p-3 text-sm">${item.nome}</td><td class="p-3 text-xs text-gray-500">${item.descricao || '-'}</td><td class="p-3 text-center">${btn}</td></tr>`;
        });
    }
};

window.alternarStatusCatalogo = async (id, status) => {
    await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    window.carregarDoacoesCatalogo();
};

window.alternarBloqueioTerreiro = async (idTerreiro, vaiBloquear) => {
    if(!confirm(`Deseja ${vaiBloquear ? "BLOQUEAR" : "DESBLOQUEAR"} este terreiro?`)) return;
    const { error } = await supabaseClient.from('terreiros').update({ status_bloqueado: vaiBloquear }).eq('id', idTerreiro);
    if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
};

window.alternarModuloMensalidade = async (idTerreiro, vaiAtivar) => {
    if(!confirm(vaiAtivar ? "Deseja ATIVAR o módulo de Tesouraria/Mensalidades para este Terreiro?" : "Desativar o módulo de Mensalidades deste Terreiro?")) return;
    const { error } = await supabaseClient.from('terreiros').update({ modulo_mensalidade_ativo: vaiAtivar }).eq('id', idTerreiro);
    if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
};

window.acessarTerreiroSaaS = (idTerreiro) => { localStorage.setItem('terreiroAtivoSaaS', idTerreiro); window.location.reload(); };
window.voltarParaMeuPainel = () => { localStorage.removeItem('terreiroAtivoSaaS'); window.location.reload(); };

window.abrirModalImportacao = (idTerreiro, nomeTerreiro) => {
    document.getElementById('idTerreiroImport').value = idTerreiro; document.getElementById('nomeTerreiroImport').textContent = nomeTerreiro;
    document.getElementById('msgImportacao')?.classList.add('hidden');
    if (document.getElementById('formImportarCSV')) document.getElementById('formImportarCSV').reset();
    document.getElementById('modalImportarCSV')?.classList.remove('hidden');
};
window.fecharModalImportacao = () => { document.getElementById('modalImportarCSV')?.classList.add('hidden'); };
