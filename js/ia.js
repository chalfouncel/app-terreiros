// ============================================================================
// MÓDULO: ASSISTENTE IA & CONSULTAS ANALÍTICAS (ia.html) - INTEGRAÇÃO EDGE FUNCTION
// ============================================================================

(function () {
    let recognition = null;
    let gravandoAudio = false;

    document.addEventListener('DOMContentLoaded', async () => {
        const hist = document.getElementById('historicoMensagens');
        const inputPergunta = document.getElementById('inputPergunta');
        const formChat = document.getElementById('formChat');
        const btnMic = document.getElementById('btnMicrofone');
        const boxGravando = document.getElementById('statusGravando');
        const btnCancelarVoz = document.getElementById('btnCancelarVoz');
        const elSubtitulo = document.getElementById('subtituloTerreiro');

        // 1. Checa Sessão do Usuário
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        // 2. Carrega nome do Terreiro para exibir no cabeçalho
        try {
            const { data: medData } = await supabaseClient
                .from('mediuns')
                .select('terreiro_id, terreiros(nome)')
                .eq('auth_id', session.user.id)
                .single();

            if (medData && medData.terreiros && medData.terreiros.nome) {
                if (elSubtitulo) elSubtitulo.textContent = `Consultas da Casa: ${medData.terreiros.nome}`;
            }
        } catch (e) {
            console.warn('Não foi possível carregar o nome do terreiro:', e);
        }

        // 3. Configura Reconhecimento de Voz (Web Speech API)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                gravandoAudio = true;
                boxGravando?.classList.remove('hidden');
                btnMic?.classList.replace('bg-slate-800', 'bg-rose-600');
                btnMic?.classList.add('animate-pulse');
            };

            recognition.onresult = (event) => {
                const textoTranscrito = event.results[0][0].transcript;
                if (inputPergunta) {
                    inputPergunta.value = textoTranscrito;
                    formChat.dispatchEvent(new Event('submit'));
                }
            };

            recognition.onerror = (e) => {
                console.error('Erro no reconhecimento de voz:', e);
                pararGravacao();
            };

            recognition.onend = () => {
                pararGravacao();
            };

            btnMic?.addEventListener('click', () => {
                if (gravandoAudio) {
                    recognition.stop();
                } else {
                    try {
                        recognition.start();
                    } catch (err) {
                        console.warn('Reconhecimento já iniciado:', err);
                    }
                }
            });

            btnCancelarVoz?.addEventListener('click', () => {
                if (recognition) recognition.abort();
                pararGravacao();
            });
        } else {
            if (btnMic) {
                btnMic.title = "Navegador não suporta reconhecimento de voz";
                btnMic.classList.add('opacity-40', 'cursor-not-allowed');
            }
        }

        function pararGravacao() {
            gravandoAudio = false;
            boxGravando?.classList.add('hidden');
            btnMic?.classList.replace('bg-rose-600', 'bg-slate-800');
            btnMic?.classList.remove('animate-pulse');
        }

        // 4. Atalhos de Perguntas Rápidas
        document.querySelectorAll('.btn-sugestao').forEach(btn => {
            btn.addEventListener('click', () => {
                const txt = btn.textContent.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '').trim();
                if (inputPergunta) {
                    inputPergunta.value = txt;
                    formChat.dispatchEvent(new Event('submit'));
                }
            });
        });

        // 5. Submissão do Formulário de Pergunta
        formChat?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pergunta = inputPergunta.value.trim();
            if (!pergunta) return;

            // Adiciona balão do usuário
            adicionarBalao('usuario', formatarTexto(pergunta));
            inputPergunta.value = '';

            // Adiciona balão "Pensando..."
            const idLoader = 'loader_' + Date.now();
            adicionarLoader(idLoader);

            try {
                // Invocação segura da Supabase Edge Function 'consulta-ia'
                const { data, error } = await supabaseClient.functions.invoke('consulta-ia', {
                    body: { pergunta: pergunta }
                });

                removerLoader(idLoader);

                if (error) {
                    throw new Error(error.message || 'Falha na resposta do servidor.');
                }

                if (data && data.resposta) {
                    adicionarBalao('ia', formatarMarkdownParaHtml(data.resposta));
                } else {
                    adicionarBalao('ia', 'Não foi possível obter uma resposta precisa para essa consulta.');
                }

            } catch (err) {
                console.error('Erro na chamada da Edge Function:', err);
                removerLoader(idLoader);
                adicionarBalao('ia', `⚠️ Ocorreu um erro ao consultar o assistente: ${err.message}`);
            }
        });

        // 6. Funções Visuais de Renderização
        function adicionarBalao(remetente, conteudoHtml) {
            const div = document.createElement('div');
            div.className = `flex items-start gap-3 ${remetente === 'usuario' ? 'justify-end' : ''}`;

            if (remetente === 'usuario') {
                div.innerHTML = `
                    <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none p-3.5 text-xs md:text-sm max-w-[85%] md:max-w-[70%] shadow-md">
                        ${conteudoHtml}
                    </div>
                    <div class="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs shrink-0 font-bold">
                        Você
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-md">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-4 text-xs md:text-sm text-slate-200 leading-relaxed max-w-[90%] md:max-w-[80%] shadow-sm">
                        ${conteudoHtml}
                    </div>
                `;
            }

            hist.appendChild(div);
            hist.scrollTop = hist.scrollHeight;
        }

        function adicionarLoader(id) {
            const div = document.createElement('div');
            div.id = id;
            div.className = "flex items-start gap-3";
            div.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-md">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    Consultando informações com IA...
                </div>
            `;
            hist.appendChild(div);
            hist.scrollTop = hist.scrollHeight;
        }

        function removerLoader(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        function formatarTexto(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function formatarMarkdownParaHtml(md) {
            let res = md;
            res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
            res = res.replace(/^\s*[-•]\s*(.*)$/gm, '• $1');
            res = res.replace(/\n/g, '<br>');
            return res;
        }
    });
})();
