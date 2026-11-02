let idTerreiroGlobal = null;
let idEventoGlobal = null;
let coordsTerreiro = null;

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
        // 2. Carrega dados e coordenadas do Terreiro
        const { data: terreiro, error: errTerreiro } = await supabaseClient
            .from('terreiros')
            .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, latitude, longitude')
            .eq('id', idTerreiroGlobal)
            .single();

        if (errTerreiro || !terreiro) throw new Error('Terreiro não localizado.');

        coordsTerreiro = { lat: terreiro.latitude, lng: terreiro.longitude };

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
            }
            return;
        }

        // Recupera nome e telefone salvos de visitas anteriores
        if (inputNome && localStorage.getItem('assistencia_nome')) {
            inputNome.value = localStorage.getItem('assistencia_nome');
        }
        if (inputTel && localStorage.getItem('assistencia_telefone')) {
            inputTel.value = localStorage.getItem('assistencia_telefone');
        }

        if (estadoComGira) estadoComGira.classList.remove('hidden');

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

    // Função de GPS com Fallback Automático (Satélite -> Rede/Wi-Fi em locais cobertos)
    function obterLocalizacaoResiliente() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject({ code: 0, message: 'Seu navegador não suporta localização via GPS.' });
            }
            // 1ª Tentativa: Alta precisão (GPS Satélite - até 8s)
            navigator.geolocation.getCurrentPosition(
                resolve,
                (errAlta) => {
                    // Se o usuário negou explicitamente (code 1), não adianta tentar de novo
                    if (errAlta.code === 1) return reject(errAlta);

                    // 2ª Tentativa automática: Sinal de Rede/Wi-Fi (para galpões/telhados onde satélite falha)
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        (errBaixa) => reject(errBaixa),
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
            );
        });
    }

    // 7. Envio com Validação de GPS Inteligente e Guia de Desbloqueio
    if (formAssistencia) {
        formAssistencia.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = inputNome ? inputNome.value.trim() : '';
            const tel = inputTel ? inputTel.value.replace(/\D/g, '') : '';
            const primeiraVez = chkPrimeiraVez ? chkPrimeiraVez.checked : false;

            if (!nome) {
                if (msgErro) {
                    msgErro.innerHTML = 'Por favor, informe o seu nome completo.';
                    msgErro.classList.remove('hidden');
                }
                return;
            }

            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Validando sua localização...';
            if (msgErro) msgErro.classList.add('hidden');

            try {
                const posicao = await obterLocalizacaoResiliente();

                if (coordsTerreiro && coordsTerreiro.lat && coordsTerreiro.lng) {
                    const latUser = posicao.coords.latitude;
                    const lonUser = posicao.coords.longitude;
                    const distanciaBruta = calcularDistancia(latUser, lonUser, coordsTerreiro.lat, coordsTerreiro.lng);
                    
                    // Desconta a imprecisão da antena do celular em local fechado (até 25m de tolerância)
                    const margemAntena = Math.min(Number(posicao.coords.accuracy) || 0, 25);
                    const distanciaEfetiva = Math.max(0, distanciaBruta - margemAntena);

                    if (distanciaEfetiva > 40) {
                        throw new Error(`Você precisa estar no terreiro para registrar presença. Distância aproximada: ${Math.round(distanciaBruta)} metros.`);
                    }
                }

                btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Confirmando presença...';

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

                // Salva dados no aparelho
                localStorage.setItem('assistencia_nome', nome);
                if (tel) localStorage.setItem('assistencia_telefone', tel);
                localStorage.setItem(`assistencia_checkin_${idEventoGlobal}`, agoraIso);

                const horaFormatada = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                const horaConfirmada = document.getElementById('horaConfirmada');
                if (horaConfirmada) horaConfirmada.textContent = horaFormatada;

                if (estadoComGira) estadoComGira.classList.add('hidden');
                if (estadoSucesso) estadoSucesso.classList.remove('hidden');

            } catch (err) {
                let htmlAjuda = '';

                if (err && err.code === 1) {
                    htmlAjuda = `
                        <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-left text-[11px] text-red-800 space-y-1.5 mt-2">
                            <p class="font-black text-red-700"><i class="fas fa-map-marker-alt mr-1"></i> Permissão de Localização Bloqueada</p>
                            <p><strong>No Android (Chrome):</strong> Toque no ícone de cadeado/ajustes ao lado do endereço do site lá no topo ➔ <em>Permissões</em> ➔ Ative a <strong>Localização</strong>.</p>
                            <p><strong>No iPhone (Safari):</strong> Toque em <strong>aA</strong> (ou no ícone ao lado do endereço) ➔ <em>Configurações do Site</em> ➔ <em>Localização</em> ➔ <strong>Permitir</strong> (e verifique se a Localização do celular está ativa).</p>
                        </div>
                    `;
                } else if (err && (err.code === 2 || err.code === 3)) {
                    htmlAjuda = `
                        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-[11px] text-amber-900 space-y-1 mt-2">
                            <p class="font-black"><i class="fas fa-satellite-dish mr-1"></i> Sinal de GPS desligado ou fraco</p>
                            <p>Ative a <strong>Localização / GPS</strong> na barra superior do seu celular e toque em Confirmar novamente.</p>
                        </div>
                    `;
                } else {
                    htmlAjuda = `<span class="block mt-1">${err.message || 'Erro ao validar presença.'}</span>`;
                }

                if (msgErro) {
                    msgErro.innerHTML = htmlAjuda;
                    msgErro.classList.remove('hidden');
                }
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Presença';
            }
        });
    }
});
