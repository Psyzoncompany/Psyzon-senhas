# Cofre Local

Site estático em português para guardar senhas **apenas no navegador**, com pesquisa, categorias livres, edição, exclusão, cópia e backup criptografado.

## Uso
Abra pelo endereço HTTPS definitivo. Crie uma senha mestra com no mínimo 12 caracteres. Guarde-a: não existe recuperação. Os dados são específicos do navegador, perfil e origem. Não há sincronização; exporte o backup antes de limpar dados, trocar de dispositivo ou mudar o domínio. Restauração substitui o cofre após validação e confirmação.

## Segurança
Web Crypto: PBKDF2-HMAC-SHA-256 (600.000 iterações, salt aleatório de 16 bytes), AES-256-GCM e IV aleatório de 12 bytes a cada gravação. Todo o conteúdo, inclusive categorias, é criptografado antes do localStorage. A chave não é exportável e permanece só em memória. Bloqueio ao ocultar a aba ou após 5 minutos sem atividade. Senhas exibidas voltam a ser ocultadas após 15 segundos. Sem bibliotecas externas, fontes remotas, analytics ou chamadas de rede. A área de transferência não é apagada automaticamente.

Este projeto não passou por auditoria independente. Um dispositivo comprometido, extensão maliciosa ou alteração maliciosa do site pode acessar dados quando o cofre estiver aberto. Os controles contra alterações concorrentes não substituem um banco transacional; evite editar em várias abas simultaneamente.

## Publicação
Importe o repositório no Vercel: framework Other, saída `dist`, sem instalação ou build. `vercel.json` inclui os cabeçalhos de segurança. Nenhuma senha real deve ser adicionada ao repositório.

## Verificação
`node --test tests/crypto.test.mjs`

## Face ID e chaves de acesso
Depois de abrir o cofre com a senha mestra, selecione **Ativar Face ID / biometria**. Confirme a senha, crie uma chave de acesso e confirme a biometria para ativar. No próximo acesso, use **Entrar com Face ID**. O sistema escolhe Face ID, Touch ID ou código/PIN; a página não pode exigir exclusivamente reconhecimento facial.

Requer HTTPS, autenticador de plataforma e WebAuthn PRF funcional (Safari 18 ou mais recente em dispositivos Apple compatíveis). A compatibilidade é verificada durante o cadastro. Falhas ou cancelamentos mantêm o desbloqueio por senha mestra. Abra diretamente no Safari se o navegador interno de um app impedir a operação.

O segredo PRF deriva uma chave AES-GCM via HKDF-SHA-256 para envolver a chave do cofre. Apenas a chave envolvida, identificador da credencial, IV e salts são persistidos. Senha mestra e chave de acesso em claro não são salvas. Verificação do usuário é obrigatória e o contexto da resposta (origem, desafio e RP ID) é conferido. O segredo PRF é a barreira criptográfica local; isto não é um serviço de autenticação remota. A chave de acesso pode sincronizar pelo iCloud, mas os registros do cofre não sincronizam.

A ativação pertence ao endereço e navegador. Backups não incluem biometria: ative novamente após restaurar ou trocar de endereço. Desativar remove a configuração local; a credencial pode ser excluída no gerenciador de senhas do sistema. Verificação nativa tem timeout e não é tratada como troca comum de aba; as senhas ficam ocultas enquanto a janela nativa está aberta. A integração precisa ser validada em um iPhone real; os testes automatizados não substituem o hardware Apple.
