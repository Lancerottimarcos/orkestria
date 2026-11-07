# Guia de Deploy na VPS Hostinger — Orkestria

Este guia passo a passo foi preparado para colocar o sistema no ar na sua VPS (Ubuntu / Debian) da Hostinger com máxima estabilidade, segurança e performance.

---

## 1. Requisitos na VPS

Acesse a VPS via SSH:
```bash
ssh root@SEU_IP_VPS
```

Atualize o sistema e instale as ferramentas essenciais:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
```

Instale o **Node.js 22 LTS**:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Instale o gerenciador de processos **PM2** globalmente:
```bash
sudo npm install -g pm2
```

---

## 2. Clonar ou Enviar o Projeto

Crie a pasta da aplicação:
```bash
mkdir -p /var/www/orkestria
cd /var/www/orkestria
```

Clone o repositório ou envie os arquivos para essa pasta:
```bash
git clone https://github.com/Lancerottimarcos/orkestria.git .
```

---

## 3. Configurar as Variáveis de Ambiente (.env)

Copie o arquivo de exemplo:
```bash
cp .env.example .env
nano .env
```

Gere chaves seguras para `AUTH_SECRET` e `META_TOKEN_ENCRYPTION_KEY`:
```bash
openssl rand -hex 32
```

Preencha no seu `.env`:
```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="chave_gerada_acima"
AUTH_TRUST_HOST="true"
META_TOKEN_ENCRYPTION_KEY="outra_chave_gerada_acima"

ADMIN_NAME="Marcos Lancerotti"
ADMIN_EMAIL="lancerottirmarcos@gmail.com"
ADMIN_PASSWORD="sua_senha_segura"
```

> **Dica:** Se você for acessar por IP antes de apontar o domínio com SSL, adicione `AUTH_COOKIE_INSECURE="1"`. Assim que colocar o domínio com HTTPS (Let's Encrypt), remova essa linha.

---

## 4. Instalação e Banco de Dados

Instale as dependências:
```bash
npm install
```

Gere o cliente do Prisma e inicialize o banco de dados SQLite:
```bash
npm run prisma:generate
npm run db:push
```

*(Opcional)* Popule o banco com o usuário administrador padrão ou dados de demonstração:
```bash
# Para criar apenas o usuário administrador:
npm run db:seed

# OU para popular com dados completos da agência (clientes, kanban, financeiro, etc):
npm run db:seed:showcase
```

---

## 5. Gerar a Build de Produção

Compile o Next.js:
```bash
npm run build
```

---

## 6. Iniciar a Aplicação com PM2

Inicie o processo gerenciado pelo PM2:
```bash
pm2 start ecosystem.config.cjs
```

Para garantir que o sistema reinicie automaticamente se a VPS for reiniciada:
```bash
pm2 save
pm2 startup
```
*(Execute o comando sugerido pelo PM2 se solicitado no terminal).*

Verifique o status:
```bash
pm2 status
pm2 logs orkestria
```

---

## 7. Configurar Nginx com Proxy Reverso e SSL

Crie o arquivo de configuração do site:
```bash
sudo nano /etc/nginx/sites-available/orkestria
```

Cole o conteúdo abaixo (substitua `app.suaagencia.com.br` pelo seu domínio):
```nginx
server {
    listen 80;
    server_name app.suaagencia.com.br;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site no Nginx e recarregue:
```bash
sudo ln -s /etc/nginx/sites-available/orkestria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Gere o certificado SSL gratuito (HTTPS automático com renovação):
```bash
sudo certbot --nginx -d app.suaagencia.com.br
```

---

## 8. Manutenção e Atualizações Futuras

Sempre que fizer alterações no código e enviar para o GitHub, basta atualizar na VPS:
```bash
cd /var/www/orkestria
git pull
npm install
npm run prisma:generate
npm run db:push
npm run build
pm2 restart orkestria
```

Pronto! Seu sistema Orkestria estará rodando em produção com alta disponibilidade na Hostinger.
