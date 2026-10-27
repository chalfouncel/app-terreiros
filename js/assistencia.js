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

    // 7. Envio com Validação de GPS (Raio de 30 metros)
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

            if (!navigator.geolocation) {
                if (msgErro) {
                    msgErro.textContent = 'Seu navegador não suporta localização via GPS.';
                    msgErro.classList.remove('hidden');
                }
                return;
            }

            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Validando sua localização...';
            if (msgErro) msgErro.classList.add('hidden');

            navigator.geolocation.getCurrentPosition(
                async (posicao) => {
                    try {
                        if (coordsTerreiro && coordsTerreiro.lat && coordsTerreiro.lng) {
                            const latUser = posicao.coords.latitude;
                            const lonUser = posicao.coords.longitude;
                            const distancia = calcularDistancia(latUser, lonUser, coordsTerreiro.lat, coordsTerreiro.lng);

                            if (distancia > 30) {
                                throw new Error(`Você precisa estar no terreiro para registrar presença. Distância atual: ${Math.round(distancia)} metros (máximo permitido: 30m).`);
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
                        if (msgErro) {
                            msgErro.textContent = err.message;
                            msgErro.classList.remove('hidden');
                        }
                        btnConfirmar.disabled = false;
                        btnConfirmar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Presença';
                    }
                },
                (errGps) => {
                    let msg = 'Erro ao acessar o GPS. Por favor, ative a localização no celular e permita o acesso no navegador.';
                    if (errGps.code === 1) {
                        msg = 'Permissão de localização negada. Habilite o GPS no navegador para confirmar presença.';
                    }
                    if (msgErro) {
                        msgErro.textContent = msg;
                        msgErro.classList.remove('hidden');
                    }
                    btnConfirmar.disabled = false;
                    btnConfirmar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Presença';
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }
});
