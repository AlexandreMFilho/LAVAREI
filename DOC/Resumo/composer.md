## Instalar o Composer 

Acesse a página `getcomposer.org` e faça a instalação conforme o site mandar.

Após instalar no linux, talvez seja necessário mover o `composer.phar` para uma pasta vista pela PATH 

```bash
mv composer.phar /usr/local/bin/composer
```

# Utilidade

Serve para gerenciar dependências em projetos, permitindo personalizar as dependências em cada projeto.

### Como usar

Criando um arquivo `composer.json` ou rodando o comando `composer init` e digitando os pacotes, sua descrição, autor, minimum stability (Se vai pegar apenas as versões estáveis ou não), tipo do pacote, licensa e os pacotes.

##### Package name (\<vendor>/\<name>) 
\<vendor> : Quem distribui o pacote (Empresa, Github)
\<name> : Nome do pacote

##### Tipo do pacote:
* Library - uma biblioteca
* Project - um projeto
* Metapackage - Projeto vazio com apenas as dependências dele (um esqueleto de projeto).
* composer-plugin - Criar plugins pro composer


#### Exemplo Composer.json
```json
{
    "name": "ceciasderj/sistracasd",
    "type": "project",
    "description": "SISTRACASD ",
    "keywords": ["cecieasdrj", "sistracasd"],
    "license": "proprietary",
    "require": {
        "php": "^8.1.12",
        "laravel/tinker": "^2.5",
    },
    "minimum-stability": "dev",
    "prefer-stable": true
}

```

#### Onde encontrar os pacotes do composer

O composer busca os pacotes no site `packagist.com`, ele é o buscador principal do composer, mas é possível configurar o composer para buscar de outros lugares, como github, zip e etc.





