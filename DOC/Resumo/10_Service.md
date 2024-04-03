# Executar uma Service

Para criar uma *service* é necessário seguir o seguinte passo a passo:<br>
1. Estender a bibioteca abaixo:
>Illuminate\Support\Service<br>

2. Abrir o terminal:
>Ctrl + J

3. executar o código abaixo:
> 
``` php
sail artisan automacao: service Entidade -- schema = Procad

```

# Classe InscricaoService

* Criada usando EditalService como uma base

Foram implementadas na classe os métodos:

1. inscrever()
2. submeter()
3. apresentarRelatorio()
4. acompanhar()
5. interporRecurso()
6. indicarBolsista()

**inscrever()**: método procura um projeto e se não existir cria um.
O método recebe um parâmetro chamado **$projeto**, que é um array e tem um valor padrão vazio [].

~~~php
if (count($projeto) == 0){ 
    // Se não houver informação
    // Lança uma exceção
    throw new \Exception("Projeto citado não tem informação" .
           "por isso, não pode ser inscrito");
}

if (ProjetoModel::find($projeto["id"])) {
    throw new \Exception("Projeto já existe");
}
~~~

A condição acima verifica se há um projeto no banco de dados.

Se achar, retorna a warning e salva-a.

Verifica se o array **$projeto** está vazio. Se estiver vazio, lança uma exceção indicando que o projeto não tem informações e, portanto, não pode ser inscrito.

Utiliza um modelo chamado *ProjetoModel* para verificar se já existe um projeto com o mesmo ID. Se existir, lança uma exceção indicando que o projeto já existe.

~~~php
$inscreve = new ProjetoModel();
$inscreve->fill($projeto);
$inscreve->save();
~~~

Cria uma nova instância do modelo *ProjetoModel*, preenche seus atributos com os valores do array **$projeto** e salva no banco de dados.

**submeter()**: responsável por submeter um projeto, possivelmente indicando que a inscrição para o projeto foi encerrada (`fim_inscricao` definido como verdadeiro) e retorna uma mensagem indicando o sucesso da operação.

~~~php
if ($sub = ProjetoModel::find($id_projeto["id"])) {
    $sub->fim_inscricao = true; 
}
~~~
Verifica se existe um projeto com o ID fornecido. Se existir, atualiza o atributo `fim_inscricao` para true.

e retorna a submissão + uma string de que foi inscrito.

**apresentarRelatorio()**: responsável por pegar os dados de um projeto já pronto, se dados for 0 ou menor retorna-se uma excessão, se não, o projeto model retorna um relatório se existir.

~~~php
    $relatorio = ProjetoModel::where($dados)->get();
        
    if(empty($relatorio)){
        throw new \Exception("Relatório não encontrado");
    }
        /*
        receber dados do relatório e retornar para a view
        */
    return $relatorio;
~~~

Em resumo, este método realiza uma consulta ao banco de dados usando os dados fornecidos, verifica se o relatório existe e, se tudo estiver correto, retorna os dados do relatório para serem utilizados na view. Caso contrário, lança exceções apropriadas indicando que o relatório não existe ou não foi encontrado.

**acompanhar()**: responsável por recuperar e retornar dados de um projeto com base no ID fornecido. Vamos analisar o código passo a passo:

~~~php
public function acompanhar($id_projeto) {
    if (empty($id_projeto)) {
        // Se não houver informação
        // Lança uma exceção
        throw new \Exception("Projeto não existe");
    }
~~~

Se estiver vazio, lança uma exceção indicando que o projeto não existe.

~~~php
// recupera o projeto pelo id
$projeto = ProjetoModel::find($id_projeto);
~~~

Utiliza o modelo *ProjetoModel* para encontrar o projeto com o ID fornecido no banco de dados.

~~~php
if(is_null($projeto)){ // se não encontrar o projeto lança uma exceção
    throw new \Exception("Projeto não encontrado");
}
~~~

Verifica se o resultado da busca (**$projeto**) é nulo e lança uma exceção indicando que o projeto não foi encontrado.

Este método realiza a recuperação de um projeto pelo ID fornecido, verifica se o projeto existe e, se tudo estiver correto, retorna os dados do projeto para serem utilizados na view. Caso contrário, lança exceções apropriadas indicando que o projeto não existe ou não foi encontrado.


# Classe InscricaoService

* Criada usando EditalService como uma base

Foram implementadas na classe os métodos:

1. inscrever()
2. submeter()
3. apresentarRelatorio()
4. acompanhar()
5. interporRecurso()
6. indicarBolsista()

**inscrever()**: método procura um projeto e se não existir cria um.
O método recebe um parâmetro chamado **$projeto**, que é um array e tem um valor padrão vazio [].

~~~php
if (count($projeto) == 0){ 
    // Se não houver informação
    // Lança uma exceção
    throw new \Exception("Projeto citado não tem informação" .
           "por isso, não pode ser inscrito");
}

if (ProjetoModel::find($projeto["id"])) {
    throw new \Exception("Projeto já existe");
}
~~~

A condição acima verifica se há um projeto no banco de dados.

Se achar, retorna a warning e salva-a.

Verifica se o array **$projeto** está vazio. Se estiver vazio, lança uma exceção indicando que o projeto não tem informações e, portanto, não pode ser inscrito.

Utiliza um modelo chamado *ProjetoModel* para verificar se já existe um projeto com o mesmo ID. Se existir, lança uma exceção indicando que o projeto já existe.

~~~php
$inscreve = new ProjetoModel();
$inscreve->fill($projeto);
$inscreve->save();
~~~

Cria uma nova instância do modelo *ProjetoModel*, preenche seus atributos com os valores do array **$projeto** e salva no banco de dados.

**submeter()**: responsável por submeter um projeto, possivelmente indicando que a inscrição para o projeto foi encerrada (`fim_inscricao` definido como verdadeiro) e retorna uma mensagem indicando o sucesso da operação.

~~~php
if ($sub = ProjetoModel::find($id_projeto["id"])) {
    $sub->fim_inscricao = true; 
}
~~~
Verifica se existe um projeto com o ID fornecido. Se existir, atualiza o atributo `fim_inscricao` para true.

e retorna a submissão + uma string de que foi inscrito.

**apresentarRelatorio()**: responsável por pegar os dados de um projeto já pronto, se dados for 0 ou menor retorna-se uma excessão, se não, o projeto model retorna um relatório se existir.

~~~php
    $relatorio = ProjetoModel::where($dados)->get();
        
    if(empty($relatorio)){
        throw new \Exception("Relatório não encontrado");
    }
        /*
        receber dados do relatório e retornar para a view
        */
    return $relatorio;
~~~

Em resumo, este método realiza uma consulta ao banco de dados usando os dados fornecidos, verifica se o relatório existe e, se tudo estiver correto, retorna os dados do relatório para serem utilizados na view. Caso contrário, lança exceções apropriadas indicando que o relatório não existe ou não foi encontrado.

**acompanhar()**: responsável por recuperar e retornar dados de um projeto com base no ID fornecido. Vamos analisar o código passo a passo:

~~~php
public function acompanhar($id_projeto) {
    if (empty($id_projeto)) {
        // Se não houver informação
        // Lança uma exceção
        throw new \Exception("Projeto não existe");
    }
~~~

Se estiver vazio, lança uma exceção indicando que o projeto não existe.

~~~php
// recupera o projeto pelo id
$projeto = ProjetoModel::find($id_projeto);
~~~

Utiliza o modelo *ProjetoModel* para encontrar o projeto com o ID fornecido no banco de dados.

~~~php
if(is_null($projeto)){ // se não encontrar o projeto lança uma exceção
    throw new \Exception("Projeto não encontrado");
}
~~~

Verifica se o resultado da busca (**$projeto**) é nulo e lança uma exceção indicando que o projeto não foi encontrado.

Este método realiza a recuperação de um projeto pelo ID fornecido, verifica se o projeto existe e, se tudo estiver correto, retorna os dados do projeto para serem utilizados na view. Caso contrário, lança exceções apropriadas indicando que o projeto não existe ou não foi encontrado.