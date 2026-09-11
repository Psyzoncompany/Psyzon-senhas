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
