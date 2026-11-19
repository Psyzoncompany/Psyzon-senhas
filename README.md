# Cofre Local

Cofre de senhas com AES-256-GCM, categorias, pesquisa, biometria opcional e backup criptografado. A publicação permanece no mesmo endereço e mantém o cofre local existente.

## Reabertura no aparelho

**Manter aberto neste dispositivo** vem ativado conforme solicitado. Depois do primeiro desbloqueio, o site persiste uma `CryptoKey` não exportável no IndexedDB do aparelho e pode reabrir o cofre ao recarregar ou reabrir o navegador. Não persiste senha mestra nem senhas em texto aberto. A chave fica acessível ao próprio site neste aparelho: use esta opção somente em aparelho pessoal.

**Bloquear cofre** apaga a chave lembrada, limpa o conteúdo exibido e avisa outras abas. A geração de revogação impede que uma gravação antiga ressuscite o desbloqueio. Ao desligar a opção, volta o bloqueio por saída de aba ou cinco minutos sem atividade. Se o navegador negar IndexedDB, o site informa que pedirá a senha na reabertura.

## Google e Firebase

A integração está implementada, mas **desativada até configurar e validar um projeto Firebase**. Não há credenciais inventadas nem uso de outro projeto do usuário. `dist/firebase-config.json` contém `enabled: false`.

Para ativar em projeto dedicado:

1. Conectar o Firebase e identificar o projeto destinado a este cofre.
2. Registrar uma aplicação Web e preencher `firebase` em `dist/firebase-config.json` com a configuração pública Web (apiKey, authDomain, projectId, appId e demais campos retornados pelo Firebase). Não colocar credenciais administrativas, chave privada ou senha neste arquivo.
3. Ativar Authentication > Google e autorizar o domínio `cofre-local-rodrigo.rodrigoribeiroalves.chatgpt.site`.
4. Criar o Firestore e publicar as regras `firebase/firestore.rules`. Em projeto compartilhado, integrar apenas o bloco `/cofreUsers/{userId}/vault/main` às regras existentes; não substituir regras de outros aplicativos. Auditar regras abrangentes existentes: regras que liberem tudo também liberam esse caminho, mesmo com um bloco restritivo.
5. Validar com duas contas: cada uma só lê e escreve seu próprio documento. Só então mudar `enabled` para `true` e publicar o site.

Auth usa persistência local e Google por popup, com mensagens para popup bloqueado, domínio não autorizado e provedor desativado. O site mantém sua restrição de acesso da hospedagem; login Google não altera quem pode visitar a publicação privada.

Cada UID tem seu cofre, chave lembrada e biometria separados. Firestore recebe **apenas o envelope criptografado** em `cofreUsers/{uid}/vault/main`. A senha mestra continua necessária no primeiro acesso de um aparelho para descriptografar. O login Google por si só não recupera a chave mestra. Sair da conta revoga o desbloqueio lembrado naquele aparelho.

O cofre legado usa `cofre-local:v1`, preservado. A importação para uma conta nova exige a senha mestra do cofre local e um clique explícito; a cópia local não é apagada. Backups podem ser restaurados no cofre selecionado após validação.

A sincronização consulta o servidor antes de abrir o cofre da conta e grava por transação comparando a versão anterior. Falhas de rede e conflitos não sobrescrevem o cofre remoto; recarregue antes de editar. Não há sincronização silenciosa de gravações offline. O limite de envelope é 900 KB para caber em um documento Firestore.

## Criptografia e backup

PBKDF2-HMAC-SHA-256 com 600.000 iterações, salt aleatório de 16 bytes, AES-256-GCM e IV aleatório de 12 bytes por gravação. A senha mestra não pode ser recuperada. Exporte um backup antes de limpar dados do navegador. Chaves lembradas e biometria não integram o backup.

Face ID / biometria usa WebAuthn PRF, HKDF-SHA-256 e chave envolvida. Verificação do usuário é obrigatória; erros mantêm o acesso por senha mestra. Exige HTTPS e autenticador compatível; validar em iPhone real. Senhas mostradas são ocultadas após 15 segundos. A área de transferência não é apagada automaticamente.

O projeto não passou por auditoria independente. Um aparelho, extensão ou origem comprometidos podem acessar o conteúdo quando o cofre está aberto ou com reabertura habilitada.

## Verificação

`node --test tests/*.test.mjs`

Cobertura: criptografia, adulteração, biometria, isolamento de namespaces, CryptoKey não exportável, ordenação de gravação/revogação, reabertura do app, bloqueio manual, preferência desligada e rejeição de conflitos na sincronização. Os testes locais não substituem a validação de OAuth real nem das regras publicadas no Firebase.

## Hospedagem

Site estático com saída `dist`, sem build nem instalação. `.openai/hosting.json` preserva a identidade Sites. `vercel.json` mantém cabeçalhos de segurança e CSP limitada ao próprio site e aos serviços necessários do Firebase. SDK Web Firebase 12.6.0 é carregado de gstatic somente quando a integração está configurada.
