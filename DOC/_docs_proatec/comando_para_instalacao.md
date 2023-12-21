# Comando importantes para a instlação do projeto



## GIT CLONE

O comand "git clone" copia um repositório existente do git.

```
git clone <url>
git clone http://sistacad-data.uerj.br/pr2/proatec.git
```


## GIT STATUS

Git status, mostra as condições do diretório atual, como alterações e arquios que estão sendo monitorados e não monitorados.

```
git status
```
## GIT CHECKOUT DEV

O comando permite que você navegue entre os ramos criados.

```
git checkout dev
```

## GIT CHECKOUT -b 

verifica o brench atual.

```
git checkout -b <nome do ramo>
```


## GIT ADD

Adiciona um arquivo no diretório atual

```
git add
```

## GIT PUSH ORIGIN

serve para fazer upload do repositório atual
```
git push origin
```

## GIT CHECKOUT -b 

Cria um ramo com o nome digitado após o comando, seguido de um espaço.

```
git checkout -b <nome do ramo>
```

## COMANDOS APT/APT-GET

### UPDATE

Atualiza a lista de pacotes disponíveis a partir dos repositórios configurados. 

```
 sudo apt update
```

### UPGRADE

Atualiza os pacotes instalados para a versão mais recente disponível. 

```
 sudo apt upgrade
```

### INSTALL

Instala um ou mais pacotes. 

```
 sudo apt install pacote1 pacote2
```

### REMOVE

Remove um ou mais pacotes. 

```
 sudo apt remove pacote1 pacote2
```

### AUTOREMOVE

Remove pacotes que foram instalados como dependências e que já não são necessários por nenhum outro pacote. 

```
 sudo apt autoremove
```

### PURGE

Remove um pacote e todos os seus arquivos de configuração. 

```
 sudo apt purge pacote
```

### CLEAN

Remove os arquivos de pacote baixados para instalações anteriores, mas que já não são mais necessários.

```
 sudo apt clean
```

### DIST-UPGRADE

Atualiza os pacotes instalados e suas dependências para a versão mais recente disponível, mesmo que isso signifique remover ou instalar pacotes adicionais.

```
 sudo apt dist-upgrade
```

### REINSTALL

Reinstala um ou mais pacotes.

```
 sudo apt dist-upgrade
```

### DSELECT-UPGRADE

Seugue a seleção do dselect.

```
 sudo apt dselect-upgrade
```

### SHOW

Mostra detalhes do pacote.

```
 sudo apt show
```

### BUILD-DEP

Configura as dependências de compilação de pacotes fonte.

```
 sudo apt build-dep
```

### SATISFY

Satisfaça as dependências de strings.

```
 sudo apt satisfy
```

### AUTOCLEAN

Apaga arquivos antigos baixados para instalação.

```
 sudo apt autoclean
```

### CHECK

Verifica se não há dependências quebradas.

```
 sudo apt check
```

### SOURCE

Baixa arquivos fonte.

```
 sudo apt source
```

### DOWNLOAD

Obter o pacote binário para o directório actual.

```
 sudo apt download
```

### CHANGELOG

Obter e mostrar o changelog de um pacote.

```
 sudo apt changelog
```