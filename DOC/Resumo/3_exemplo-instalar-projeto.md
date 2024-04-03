# Instalando o projeto

Com o repositório clonado em sua máquina, e com privilégios de administrador (```sudo su```) acesse a pasta `app` em seu terminal e execute o comando:

```
composer update
```

caso o php não tenha sido instalado será necessário instala-lo com os comandos:
```
apt install php8.1-xml
apt install php8.1-curl
apt install php8.1-zip
``` 

para então executar: 
```
composer update
```

Copie o documento `.env.example` para `.env`.

Em seguida, execute:

```php
sail up -d
```
caso ocorra algum erro, deverá parar o serviço apache 2

```
service apache2 stop
```
ou colocar o alias do sail, através do comando:
```
alias sail='[ -f sail ] && sh sail || sh vendor/bin/sail'
```
caso o docker não esteja instalado, instale seguindo os passos do site 

```https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04```

e refazer o comando
```
sail up -d
```

agora basta acessar a página e iniciar
```
http://localhost
```

Caso na página do localHost dê problema de permissão, execute no terminal ```sudo su``` o comando

```
chmod 777 -Rfv *
```

Em seguida você deverá se conectar ao banco e criar nele o schema "sistema". [[Ver Banco]](../Banco)


#### Dados banco,
1- Conectar banco postgreeSQL
2- Nome do banco "laravel"
3- usuário "sail"
4- senha "password"
5- Criar um Schema "sistema"

## Para fins de Teste

Deverá executar as Seeders para a criação do banco e as Factorys para popular o banco. [[Ver seeder]](../Seeders/),  [[Ver factory]](../Factory).

