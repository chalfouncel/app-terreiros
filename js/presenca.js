let usuarioAtual = null;
let perfilAtual = null;
let terreiroAtual = null;
let eventoAtual = null;

const btnPresenca = document.getElementById('btnPresenca');
const statusMessage = document.getElementById('statusMessage');

// 1. Fórmula Matemática para calcular distância em metros usando GPS (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// 2. Função de Inicialização
async function carregarDados() {
    // Verifica Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    usuarioAtual = session.user;

    // Busca Perfil
    const { data: perfil } = await supabaseClient.from('perfis').select('*').eq('id', usuarioAtual.id).single();
    perfilAtual = perfil;
    document.getElementById('nomeUsuario').textContent = `Olá, ${perfil.nome_completo || 'Médium'}`;

    // Busca Terreiro
    if(perfil.terreiro_id) {
        const { data: terreiro } = await supabaseClient.from('terreiros').select('*').eq('id', perfil.terreiro_id).single();
        terreiroAtual = terreiro;
        document.getElementById('nomeTerreiro').textContent = terreiro.nome;
    }

    // Busca Evento de Hoje
    const inicioDia = new Date();
    inicioDia.setHours(0,0,0,0);
    const fimDia = new Date();
    fimDia.setHours(23,59,59,999);

    const { data: eventos } = await supabaseClient
        .from('agenda')
        .select('*')
        .eq('terreiro_id', perfilAtual.terreiro_id)
        .gte('data_hora_inicio', inicioDia.toISOString())
        .lte('data_hora_inicio', fimDia.toISOString())
        .order('data_hora_inicio', { ascending: true })
        .limit(1);

    if (eventos && eventos.length > 0) {
        eventoAtual = eventos[0];
        document.getElementById('eventoHoje').classList.remove('hidden');
        document.getElementById('tituloEvento').textContent = eventoAtual.titulo;
        document.getElementById('tipoEvento').textContent = eventoAtual.tipo;
        
        const hora = new Date(eventoAtual.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('horarioEvento').textContent = `Horário: ${hora}`;
        
        // Verifica se já marcou presença hoje
        const { data: jaMarcou } = await supabaseClient
            .from('presencas')
            .select('id')
            .eq('evento_id', eventoAtual.id)
            .eq('usuario_id', usuarioAtual.id)
            .single();

        if (jaMarcou) {
            mostrarStatus('Você já marcou presença neste evento.', 'text-green-600');
        } else {
            prepararBotaoGPS();
        }
    } else {
        document.getElementById('semEvento').classList.remove('hidden');
    }
}

// 3. Preparar Botão e GPS
function prepararBotaoGPS() {
    btnPresenca.disabled = false;
    btnPresenca.classList.remove('bg-gray-400', 'cursor-not-allowed');
    btnPresenca.classList.add('bg-green-600', 'hover:bg-green-700');
    btnPresenca.textContent = 'Registrar Presença';

    btnPresenca.addEventListener('click', async () => {
        btnPresenca.disabled = true;
        btnPresenca.textContent = 'Obtendo localização...';

        if (!navigator.geolocation) {
            mostrarStatus('Seu navegador não suporta GPS.', 'text-red-600');
            return;
        }

        navigator.geolocation.getCurrentPosition(sucessoGPS, erroGPS, { enableHighAccuracy: true });
    });
}

// 4. Sucesso ao capturar GPS
async function sucessoGPS(posicao) {
    const latCelular = posicao.coords.latitude;
    const lonCelular = posicao.coords.longitude;
    
    const latTerreiro = terreiroAtual.latitude_sede;
    const lonTerreiro = terreiroAtual.longitude_sede;

    if (!latTerreiro || !lonTerreiro) {
        mostrarStatus('As coordenadas do terreiro não estão configuradas no sistema.', 'text-red-600');
        return;
    }

    const distanciaMetros = calcularDistancia(latCelular, lonCelular, latTerreiro, lonTerreiro);
    const raioPermitido = eventoAtual.raio_presenca_metros || 50;

    btnPresenca.textContent = 'Validando e Salvando...';

    const valida = distanciaMetros <= raioPermitido;

    try {
        const { error } = await supabaseClient.from('presencas').insert({
            evento_id: eventoAtual.id,
            usuario_id: usuarioAtual.id,
            localizacao_valida: valida
        });

        if (error) throw error;

        if (valida) {
            mostrarStatus(`Presença confirmada! Você está a ${Math.round(distanciaMetros)}m do terreiro.`, 'text-green-600');
            btnPresenca.classList.add('hidden');
        } else {
            mostrarStatus(`Presença negada. Você está a ${Math.round(distanciaMetros)}m de distância. (Máximo: ${raioPermitido}m)`, 'text-red-600');
            btnPresenca.textContent = 'Tentar Novamente';
            btnPresenca.disabled = false;
        }
    } catch (err) {
        mostrarStatus('Erro ao salvar presença: ' + err.message, 'text-red-600');
        btnPresenca.textContent = 'Tentar Novamente';
        btnPresenca.disabled = false;
    }
}

// 5. Erro no GPS (ex: usuário negou permissão)
function erroGPS(err) {
    mostrarStatus('Erro de GPS: Você precisa autorizar a localização.', 'text-red-600');
    btnPresenca.textContent = 'Registrar Presença';
    btnPresenca.disabled = false;
}

// 6. Funções Auxiliares
function mostrarStatus(mensagem, classeCor) {
    statusMessage.textContent = mensagem;
    statusMessage.className = `mt-4 text-sm font-medium ${classeCor}`;
    statusMessage.classList.remove('hidden');
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// Inicia tudo
carregarDados();
