let idTerreiroGlobal = null;
let idEventoGlobal = null;

document.addEventListener('DOMContentLoaded', async () => {
    const estadoCarregando = document.getElementById('estadoCarregando');
    const estadoSemGira = document.getElementById('estadoSemGira');
    const estadoComGira = document.getElementById('estadoComGira');
    const estadoSucesso = document.getElementById('estadoSucesso');

    const formAssistencia = document.getElementById('formAssistencia');
    const inputNome = document.getElementById('nomeVisitante');
    const inputTel = document.getElementById('telVisitante');
    const chkPrimeiraVez = document.getElementById('chkPrimeiraVez');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnNovoRegistro = document.getElementById('btnNovoRegistro');
    const msgErro = document.getElementById('msgErro');

    // 1. Identifica o Terreiro pelo parâmetro da URL (?t=ID) ou memória local
    const urlParams = new URLSearchParams(window.location.search);
    idTerreiroGlobal = urlParams.get('t') || localStorage.getItem('assistencia_terreiro_id');

    if (!idTerreiroGlobal) {
        if (estadoCarregando) estadoCarregando.classList.add('hidden');
        if (estadoSemGira) {
            estadoSemGira.classList.remove('hidden');
            estadoSemGira.innerHTML = `
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                    <i class="fas fa-qrcode text-2xl"></i>
                </div>
                <h2 class="text-lg font-bold text-gray-800">QR Code Inválido</h2>
                <p class="text-xs text-gray-500 mt-2">Nenhum terreiro foi identificado. Por favor, leia o QR Code disponibilizado na Casa.</p>
            `;
        }
        return;
    }

    localStorage.setItem('assistencia_terreiro_id', idTerreiroGlobal);

    try {
        // 2. Carrega dados do Terreiro (sem GPS)
        const { data: terreiro, error: errTerreiro } = await supabaseClient
            .from('terreiros')
            .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, status_bloqueado')
            .eq('id', idTerreiroGlobal)
            .single();

        if (errTerreiro || !terreiro) throw new Error('Terreiro não localizado.');
        if (terreiro.status_bloqueado === true) throw new Error('Recepção temporariamente indisponível para este Templo.');

        const txtNomeTerreiro = document.getElementById('nomeTerreiro');
        if (txtNomeTerreiro) txtNomeTerreiro.textContent = terreiro.nome || 'Terreiro';

        const root = document.documentElement;
        if (terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
        if (terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
        if (terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
        if (terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

        const imgLogo = document.getElementById('logoTerreiro');
        if (imgLogo && terreiro.logo_url) {
            imgLogo.src = terreiro.logo_url;
            imgLogo.classList.remove('hidden');
        }

        // 3. Procura Gira Aberta para Recepção
        const agora = new Date();
        const { data: giras, error: errGiras } = await supabaseClient
            .from('agenda')
            .select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .or('ata_encerrada.eq.false,ata_encerrada.is.null')
            .order('data_hora_inicio', { ascending: true });

        if (errGiras) throw errGiras;

        const giraAtiva = (giras || []).find(g => {
            if (g.especial === true || g.tipo === 'informativo') return false;

            const hrInicio = new Date(g.data_hora_inicio);
            const hrFim = g.data_hora_fim ? new Date(g.data_hora_fim) : new Date(hrInicio.getTime() + (4 * 60 * 60 * 1000));
            const hrLiberada = new Date(hrInicio.getTime() - (90 * 60 * 1000));

            return agora >= hrLiberada && agora <= hrFim;
        });

        if (estadoCarregando) estadoCarregando.classList.add('hidden');

        if (!giraAtiva) {
            if (estadoSemGira) estadoSemGira.classList.remove('hidden');
            return;
        }

        idEventoGlobal = giraAtiva.id;

        // 4. Preenche cabeçalho da gira (Fuso Horário de Brasília)
        const txtTituloGira = document.getElementById('tituloGira');
        if (txtTituloGira) txtTituloGira.textContent = giraAtiva.titulo;

        const txtHorarioGira = document.getElementById('horarioGira');
        if (txtHorarioGira) {
            const inicio = new Date(giraAtiva.data_hora_inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            const fim = giraAtiva.data_hora_fim 
                ? new Date(giraAtiva.data_hora_fim).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
                : '--:--';
            txtHorarioGira.innerHTML = `<i class="far fa-clock mr-1"></i> ${inicio} às ${fim}`;
        }

        // 5. Verifica se já realizou check-in nesta sessão específica
        const checkinSalvo = localStorage.getItem(`assistencia_checkin_${idEventoGlobal}`);
        if (checkinSalvo) {
            if (estadoSucesso) {
                const horaFeita = document.getElementById('horaConfirmada');
                if (horaFeita) horaFeita.textContent = new Date(checkinSalvo).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                estadoSucesso.classList.remove('hidden');
                window.mostrarApoioAssistencia();
            }
        }

        // Recupera nome e telefone salvos de visitas anteriores
        if (inputNome && localStorage.getItem('assistencia_nome')) {
            inputNome.value = localStorage.getItem('assistencia_nome');
        }
        if (inputTel && localStorage.getItem('assistencia_telefone')) {
            inputTel.value = localStorage.getItem('assistencia_telefone');
        }

        if (!checkinSalvo && estadoComGira) estadoComGira.classList.remove('hidden');

    } catch (err) {
        console.error('Erro na recepção:', err);
        if (estadoCarregando) estadoCarregando.classList.add('hidden');
        if (estadoSemGira) {
            estadoSemGira.classList.remove('hidden');
            estadoSemGira.innerHTML = `<p class="text-xs text-red-500 font-bold">Erro ao acessar a recepção: ${err.message}</p>`;
        }
    }

    // 6. Botão para Registrar Acompanhante / Familiar
    if (btnNovoRegistro) {
        btnNovoRegistro.addEventListener('click', () => {
            if (inputNome) inputNome.value = '';
            if (chkPrimeiraVez) chkPrimeiraVez.checked = false;
            if (msgErro) msgErro.classList.add('hidden');
            
            if (estadoSucesso) estadoSucesso.classList.add('hidden');
            if (estadoComGira) {
                estadoComGira.classList.remove('hidden');
                if (inputNome) inputNome.focus();
            }
        });
    }

    // Máscara automática de WhatsApp enquanto digita
    if (inputTel) {
        inputTel.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
            e.target.value = v;
        });
    }

    // 7. Envio Direto (Validado por QR Code local e janela de horário da gira)
    if (formAssistencia) {
        formAssistencia.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = inputNome ? inputNome.value.trim() : '';
            const tel = inputTel ? inputTel.value.replace(/\D/g, '') : '';
            const primeiraVez = chkPrimeiraVez ? chkPrimeiraVez.checked : false;

            if (!nome) {
                if (msgErro) {
                    msgErro.textContent = 'Por favor, informe o seu nome completo.';
                    msgErro.classList.remove('hidden');
                }
                return;
            }

            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Confirmando presença...';
            if (msgErro) msgErro.classList.add('hidden');

            try {
                const agoraIso = new Date().toISOString();

                const { error: errInsert } = await supabaseClient
                    .from('presencas_assistencia')
                    .insert([{
                        terreiro_id: idTerreiroGlobal,
                        evento_id: idEventoGlobal,
                        nome_completo: nome,
                        telefone: tel || null,
                        primeira_vez: primeiraVez,
                        data_hora_checkin: agoraIso
                    }]);

                if (errInsert) throw errInsert;

                // Salva dados no aparelho para próximas visitas
                localStorage.setItem('assistencia_nome', nome);
                if (tel) localStorage.setItem('assistencia_telefone', inputTel.value);
                localStorage.setItem(`assistencia_checkin_${idEventoGlobal}`, agoraIso);

                const horaFormatada = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                const horaConfirmada = document.getElementById('horaConfirmada');
                if (horaConfirmada) horaConfirmada.textContent = horaFormatada;

                if (estadoComGira) estadoComGira.classList.add('hidden');
                if (estadoSucesso) estadoSucesso.classList.remove('hidden');
                window.mostrarApoioAssistencia();

            } catch (err) {
                if (msgErro) {
                    msgErro.textContent = err.message || 'Erro ao registrar presença. Tente novamente.';
                    msgErro.classList.remove('hidden');
                }
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Presença';
            }
        });
    }
});


// Doação direta: somente leitura do cadastro e geração local de Pix. Não registra pagamentos.
(function () {
    const $ = id => document.getElementById(id);
    let dadosPix = null;
    let abertura = 0;
    let focoAnterior = null;

    function normalizarChaveDoacao(tipo, valor) {
        tipo = String(tipo || '').toUpperCase();
        const chave = String(valor || '').trim();
        const digitos = chave.replace(/\D/g, '');
        switch (String(tipo || '').toUpperCase()) {
            case 'EMAIL':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave) || chave.length > 77) break;
                return chave.toLowerCase();
            case 'CPF':
            case 'CNPJ':
                if (!/^[\d.\-/\s]+$/.test(chave) || digitos.length !== (tipo === 'CPF' ? 11 : 14)) break;
                return digitos;
            case 'PHONE': {
                if (!/^[+\d()\s.-]+$/.test(chave)) break;
                const telefone = digitos.length === 11 ? '55' + digitos : digitos;
                if (!/^55[1-9]\d9\d{8}$/.test(telefone)) break;
                return '+' + telefone;
            }
            case 'EVP':
                if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(chave)) break;
                return chave.toLowerCase();
        }
        throw new Error('A chave Pix de destino da casa está incompleta ou inválida. Avise a administração.');
    }

    function centavosDoacao(texto) {
        let v = String(texto || '').trim();
        if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(v)) v = v.replace(/\./g, '');
        if (!/^\d+(?:[.,]\d{1,2})?$/.test(v)) throw new Error('Informe um valor válido, como 10,00.');
        const partes = v.replace(',', '.').split('.');
        const n = Number(partes[0]) * 100 + Number((partes[1] || '').padEnd(2, '0'));
        if (!Number.isSafeInteger(n) || n < 1 || n > 999999999999) throw new Error('Informe um valor entre R$ 0,01 e R$ 9.999.999.999,99.');
        return n;
    }

    function gerarPixDoacao(dados, centavos) {
        if (!Number.isSafeInteger(centavos) || centavos < 1 || centavos > 999999999999) throw new Error('Valor inválido.');
        const tlv = (id, valor) => {
            const v = String(valor);
            if (!v.length || v.length > 99 || /[^\x20-\x7e]/.test(v)) throw new Error('Dados do Pix inválidos. Avise a administração.');
            return id + String(v.length).padStart(2, '0') + v;
        };
        const ascii = (v, max) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase().slice(0, max);
        const chave = normalizarChaveDoacao(dados.tipo_chave_pix_repasse, dados.chave_pix_repasse);
        const valor = Math.floor(centavos / 100) + '.' + String(centavos % 100).padStart(2, '0');
        let codigo = tlv('00', '01') + tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', chave)) +
            tlv('52', '0000') + tlv('53', '986') + tlv('54', valor) + tlv('58', 'BR') +
            tlv('59', ascii(dados.nome, 25)) + tlv('60', ascii(dados.cidade, 15)) +
            tlv('62', tlv('05', '***')) + '6304';
        let crc = 0xffff;
        for (const c of codigo) {
            crc ^= c.charCodeAt(0) << 8;
            for (let i = 0; i < 8; i++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
        }
        return codigo + crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function limparCodigo() {
        $('codigoPixDoacaoDireta').value = '';
        $('resultadoPixDoacaoDireta').hidden = true;
        $('avisoPixDoacaoDireta').textContent = '';
        $('copiarPixDoacaoDireta').textContent = 'Copiar código Pix';
    }

    function fecharDoacaoDireta() {
        abertura++;
        dadosPix = null;
        $('modalPixDoacaoDireta').classList.add('hidden');
        $('valorPixDoacaoDireta').value = '';
        limparCodigo();
        focoAnterior?.focus();
    }

    function montarDoacaoDireta() {
        const titulo = $('ancoraPixAssistencia');
        if (!titulo || $('btnDoacaoAnonimaDireta')) return;
        const botao = document.createElement('button');
        botao.id = 'btnDoacaoAnonimaDireta';
        botao.type = 'button';
        botao.className = 'w-full mb-4 py-3.5 px-4 rounded-xl text-white font-bold text-sm';
        botao.innerHTML = '<span class="doacao-direta-conteudo"><i class="fas fa-hand-holding-heart" aria-hidden="true"></i><span>Doação anônima em dinheiro</span></span>';
        document.body.insertAdjacentHTML('beforeend', `
          <style id="estiloBotaoDoacaoDireta">
            #btnDoacaoAnonimaDireta {
              position: relative;
              overflow: hidden;
              isolation: isolate;
              background: linear-gradient(115deg, #166534 0%, #047857 60%, #065f46 100%);
              border: 0;
              box-sizing: border-box;
              flex: 0 0 auto;
              min-height: 48px;
              padding: 14px 16px;
              font-size: 14px;
              line-height: 20px;
              box-shadow: 0 5px 14px rgba(6,95,70,.20), inset 0 1px 0 rgba(255,255,255,.18);
              cursor: pointer;
              transition: transform .18s ease, box-shadow .18s ease;
              -webkit-tap-highlight-color: transparent;
            }
            #btnDoacaoAnonimaDireta[hidden] { display: none !important; }
            #btnDoacaoAnonimaDireta .doacao-direta-conteudo {
              position: relative;
              z-index: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: .5rem;
              line-height: 20px;
            }
            #btnDoacaoAnonimaDireta .fa-hand-holding-heart { font-size: 1em; line-height: 1; }
            #btnDoacaoAnonimaDireta::before {
              content: '';
              position: absolute;
              z-index: 0;
              pointer-events: none;
              inset: 0;
              background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.18) 50%, transparent 68%);
              transform: translateX(-120%);
              animation: brilhoDoacaoDireta 6s ease-in-out infinite;
            }
            @keyframes brilhoDoacaoDireta {
              0%, 70% { transform: translateX(-120%); }
              93%, 100% { transform: translateX(120%); }
            }
            @media (hover: hover) {
              #btnDoacaoAnonimaDireta:hover { box-shadow: 0 7px 18px rgba(6,95,70,.3), inset 0 1px 0 rgba(255,255,255,.2); }
            }
            #btnDoacaoAnonimaDireta:active { transform: scale(.98); }
            #btnDoacaoAnonimaDireta:focus-visible { outline: 3px solid #10b981; outline-offset: 3px; }
            @media (prefers-reduced-motion: reduce) {
              #btnDoacaoAnonimaDireta { transition: none; }
              #btnDoacaoAnonimaDireta::before { animation: none; display: none; }
              #btnDoacaoAnonimaDireta:active { transform: none; }
            }
          </style>`);
        botao.hidden = true;
        titulo.before(botao);
        document.body.insertAdjacentHTML('beforeend', `
          <div id="modalPixDoacaoDireta" class="hidden fixed inset-0 z-[999999] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tituloPixDoacaoDireta">
            <div class="bg-white text-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4">
              <div class="flex items-start justify-between gap-3">
                <h3 id="tituloPixDoacaoDireta" class="font-black text-lg">Doação anônima em dinheiro</h3>
                <button id="fecharPixDoacaoDireta" type="button" class="px-3 py-1 text-xl rounded-lg bg-gray-100 text-gray-600" aria-label="Fechar">×</button>
              </div>
              <p id="casaPixDoacaoDireta" class="text-sm font-semibold text-emerald-700"></p>
              <p class="text-xs text-gray-600 leading-relaxed">Esta doação não será registrada no aplicativo. O recebedor poderá identificar seu nome no comprovante bancário.</p>
              <form id="formPixDoacaoDireta" class="space-y-3">
                <label for="valorPixDoacaoDireta" class="block text-sm font-bold">Quanto deseja doar? (R$)</label>
                <input id="valorPixDoacaoDireta" type="text" inputmode="decimal" autocomplete="off" maxlength="18" placeholder="Ex.: 20,00" class="w-full border border-gray-300 rounded-xl p-3 text-xl font-bold bg-white text-gray-900" required>
                <button id="gerarPixDoacaoDireta" type="submit" disabled class="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">Carregando dados da casa...</button>
              </form>
              <p id="avisoPixDoacaoDireta" role="status" aria-live="polite" class="text-sm text-gray-700"></p>
              <div id="resultadoPixDoacaoDireta" hidden>
                <p id="resumoPixDoacaoDireta" class="font-bold text-center mb-3"></p>
                <label for="codigoPixDoacaoDireta" class="block text-xs font-bold mb-2">Pix Copia e Cola</label>
                <textarea id="codigoPixDoacaoDireta" readonly rows="3" class="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 text-xs break-all" aria-label="Código Pix Copia e Cola"></textarea>
                <button id="copiarPixDoacaoDireta" type="button" class="w-full mt-3 py-3 rounded-xl bg-emerald-600 text-white font-bold">Copiar código Pix</button>
                <p class="mt-3 text-xs text-gray-600">No aplicativo do seu banco, escolha Pix Copia e Cola. Confira o destinatário e o valor antes de confirmar.</p>
              </div>
              <button id="voltarPixDoacaoDireta" type="button" class="w-full py-2 text-sm font-bold text-gray-600">Voltar à confirmação</button>
            </div>
          </div>`);
        botao.addEventListener('click', abrirDoacaoDireta);
        $('fecharPixDoacaoDireta').addEventListener('click', fecharDoacaoDireta);
        $('voltarPixDoacaoDireta').addEventListener('click', fecharDoacaoDireta);
        $('valorPixDoacaoDireta').addEventListener('input', limparCodigo);
        $('modalPixDoacaoDireta').addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); fecharDoacaoDireta(); }
            if (e.key === 'Tab') {
                const visiveis = [...$('modalPixDoacaoDireta').querySelectorAll('button, input, textarea')].filter(el => !el.disabled && el.getClientRects().length);
                if (e.shiftKey && document.activeElement === visiveis[0]) { e.preventDefault(); visiveis.at(-1)?.focus(); }
                else if (!e.shiftKey && document.activeElement === visiveis.at(-1)) { e.preventDefault(); visiveis[0]?.focus(); }
            }
        });
        $('formPixDoacaoDireta').addEventListener('submit', e => {
            e.preventDefault();
            limparCodigo();
            try {
                if (!dadosPix || String(dadosPix.id) !== String(idTerreiroGlobal)) throw new Error('Reabra a doação para carregar os dados da casa.');
                const centavos = centavosDoacao($('valorPixDoacaoDireta').value);
                $('codigoPixDoacaoDireta').value = gerarPixDoacao(dadosPix, centavos);
                $('resumoPixDoacaoDireta').textContent = (centavos / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
                $('resultadoPixDoacaoDireta').hidden = false;
                $('copiarPixDoacaoDireta').focus();
            } catch (erro) { $('avisoPixDoacaoDireta').textContent = erro.message; }
        });
        $('copiarPixDoacaoDireta').addEventListener('click', async () => {
            const codigo = $('codigoPixDoacaoDireta');
            if (!codigo.value || !dadosPix || String(dadosPix.id) !== String(idTerreiroGlobal)) return;
            const atual = abertura;
            const textoCopiado = codigo.value;
            try {
                await navigator.clipboard.writeText(textoCopiado);
                if (atual === abertura && codigo.value === textoCopiado) $('copiarPixDoacaoDireta').textContent = 'Código copiado! Abra seu banco';
            } catch (_) {
                codigo.focus(); codigo.select(); codigo.setSelectionRange(0, codigo.value.length);
                $('avisoPixDoacaoDireta').textContent = 'Toque e segure o código selecionado para copiar.';
            }
        });
    }

    async function abrirDoacaoDireta() {
        const atual = ++abertura;
        dadosPix = null;
        focoAnterior = document.activeElement;
        $('valorPixDoacaoDireta').value = '';
        limparCodigo();
        $('casaPixDoacaoDireta').textContent = '';
        $('gerarPixDoacaoDireta').disabled = true;
        $('gerarPixDoacaoDireta').textContent = 'Carregando dados da casa...';
        $('modalPixDoacaoDireta').classList.remove('hidden');
        $('valorPixDoacaoDireta').focus();
        try {
            // Apenas SELECT: consulta sempre a chave atual desse cadastro, sem fallback para mensalidade.
            const {data, error} = await supabaseClient.from('terreiros')
                .select('id, nome, tipo_chave_pix_repasse, chave_pix_repasse, postal_code')
                .eq('id', idTerreiroGlobal).single();
            if (atual !== abertura) return;
            if (error || !data) throw new Error('Não foi possível carregar o Pix da casa. Feche e tente novamente.');
            normalizarChaveDoacao(data.tipo_chave_pix_repasse, data.chave_pix_repasse);
            $('casaPixDoacaoDireta').textContent = data.nome;
            // A cidade é exigida no BR Code. Consulta somente o CEP da casa, sem valor ou dados do doador.
            const cep = String(data.postal_code || '').replace(/\D/g, '');
            if (!/^\d{8}$/.test(cep)) throw new Error('O CEP da casa precisa ser completado pela administração.');
            const abort = new AbortController();
            const timeout = setTimeout(() => abort.abort(), 8000);
            let endereco;
            try {
                const resposta = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: abort.signal, credentials:'omit', referrerPolicy:'no-referrer'});
                if (!resposta.ok) throw new Error('CEP');
                endereco = await resposta.json();
            } catch (_) { throw new Error('Não foi possível consultar o endereço da casa. Feche e tente novamente.'); }
            finally { clearTimeout(timeout); }
            if (atual !== abertura) return;
            if (endereco.erro || !endereco.localidade) throw new Error('Confira o CEP da casa com a administração.');
            dadosPix = {...data, cidade:endereco.localidade};
            $('gerarPixDoacaoDireta').disabled = false;
            $('gerarPixDoacaoDireta').textContent = 'Gerar Pix Copia e Cola';
        } catch (erro) {
            if (atual !== abertura) return;
            $('avisoPixDoacaoDireta').textContent = erro.message;
            $('gerarPixDoacaoDireta').textContent = 'Pix indisponível';
        }
    }

    window.atualizarBotaoDoacaoDireta = aba => {
        montarDoacaoDireta();
        if ($('btnDoacaoAnonimaDireta')) $('btnDoacaoAnonimaDireta').hidden = aba !== 'doacao';
    };
})();


// Convites opcionais exibidos somente depois da confirmação da presença.
(function () {
    let carregando = null;
    let terreiroCarregado = null;
    window.mostrarApoioAssistencia = () => {
        const sucesso = document.getElementById('estadoSucesso');
        if (!sucesso || sucesso.classList.contains('hidden')) return;
        let area = document.getElementById('apoioAssistencia');
        if (!area) {
            area = document.createElement('section');
            area.id = 'apoioAssistencia';
            area.className = 'mt-6 mb-6 pt-5 border-t border-gray-100 text-left';
            area.innerHTML = `<h4 class="text-base font-black text-gray-800 mb-1">Ajude a fortalecer nossa casa</h4>
                <p class="text-xs text-gray-500 mb-4">Se desejar, contribua com uma doação ou participe das nossas rifas.</p>
                <div id="ancoraPixAssistencia"></div>
                <div id="rifasApoioAssistencia" class="space-y-4"></div>`;
            const acompanhante = document.getElementById('btnNovoRegistro');
            if (acompanhante) acompanhante.before(area); else sucesso.appendChild(area);
        }
        window.atualizarBotaoDoacaoDireta('doacao');
        if (carregando || terreiroCarregado === String(idTerreiroGlobal)) return;
        const terreiro = String(idTerreiroGlobal);
        carregando = carregarRifas(terreiro).finally(() => { carregando = null; });
    };

    async function carregarRifas(terreiro) {
        const lista = document.getElementById('rifasApoioAssistencia');
        lista.textContent = 'Carregando rifas da casa...';
        try {
            const { data, error } = await supabaseClient.from('rifas')
                .select('id, titulo, imagem_url, valor_numero')
                .eq('terreiro_id', terreiro).eq('status', 'aberta')
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (String(idTerreiroGlobal) !== terreiro) return;
            lista.replaceChildren();
            for (const rifa of data || []) {
                const card = document.createElement('article');
                card.className = 'overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm';
                const link = new URL('rifa-publica.html', window.location.href);
                link.searchParams.set('r', String(rifa.id));
                const nome = String(rifa.titulo || 'Rifa da casa');
                if (rifa.imagem_url) {
                    try {
                        const imagemURL = new URL(rifa.imagem_url, window.location.href);
                        if (['https:', 'http:'].includes(imagemURL.protocol)) {
                            const arte = document.createElement('a');
                            arte.href = link.href;
                            arte.setAttribute('aria-label', 'Ver rifa: ' + nome);
                            const imagem = document.createElement('img');
                            imagem.src = imagemURL.href;
                            imagem.alt = nome;
                            imagem.loading = 'lazy';
                            imagem.className = 'w-full max-h-80 object-contain bg-gray-50';
                            imagem.addEventListener('error', () => { arte.hidden = true; }, {once:true});
                            arte.appendChild(imagem);
                            card.appendChild(arte);
                        }
                    } catch (_) { /* Mantém o título e o link se a imagem for inválida. */ }
                }
                const corpo = document.createElement('div');
                corpo.className = 'p-4 space-y-3';
                const titulo = document.createElement('h5');
                titulo.className = 'font-black text-gray-800 text-base';
                titulo.textContent = nome;
                corpo.appendChild(titulo);
                const valor = Number(rifa.valor_numero);
                if (Number.isFinite(valor) && valor > 0) {
                    const preco = document.createElement('p');
                    preco.className = 'text-sm font-bold text-indigo-700';
                    preco.textContent = valor.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) + ' por número';
                    corpo.appendChild(preco);
                }
                const participar = document.createElement('a');
                participar.href = link.href;
                participar.className = 'block w-full text-center py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm';
                participar.textContent = 'Ver rifa e escolher meus números';
                corpo.appendChild(participar);
                card.appendChild(corpo);
                lista.appendChild(card);
            }
            terreiroCarregado = terreiro;
        } catch (_) {
            lista.replaceChildren();
            const aviso = document.createElement('p');
            aviso.className = 'text-xs text-gray-500';
            aviso.textContent = 'Não foi possível carregar as rifas agora.';
            const tentar = document.createElement('button');
            tentar.type = 'button';
            tentar.className = 'text-sm font-bold text-indigo-700 py-2';
            tentar.textContent = 'Tentar novamente';
            tentar.addEventListener('click', () => window.mostrarApoioAssistencia());
            lista.append(aviso, tentar);
        }
    }
})();
