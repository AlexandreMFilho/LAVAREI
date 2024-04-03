## Criando uma factory para Edital

```sail artisan make:factory Model/Proatec/EditalModel```

Será gerada uma Model-Factory para Edital. Onde gera-se os nomes, descrições e datas que serão usadas no banco de dados.

* O Código abaixo é gerado automaticamente pelo laravel
* E serve para gerar dados para a tabela edital
* Referente ao model EditalModel
* Foi adicionado o faker para gerar dados fake para a tabela
* Como um prototipo de dados

# Exemplo criação de Factory

Nesse documento temos os principais comandos e códigos para ciar uma facoty para o backend do projeto

## criação do shell
```shell
sail artisan make:factory Model/Procad/ProcessoModelFactory
```

## Códido para gerar a factory

1. Importar class use Illuminate\Support\Str;

```php
use use Illuminate\Support\Str;

```

1. Preparar o retorno da Factory
   
```php
    public function definition(): array
    {
        return [
            //'id'=>mt_rand(1, 20),
            //'id_user'=>mt_rand(1, 20),
            'id_docente'=>mt_rand(40, 60),
            'id_processo'=>mt_rand(1,20),
            'data_inicio'=>now(),
            'data_termino'=>now(),
            'resumo'=>fake()->sentence(1),
        ];
    } 
```

```
history  | grep -i fact
```

# Execução da factory
#### Caminho para a execução da factory:

1. Abra o terminal:
  ``` Ctrl + J```
<br>

1. Execute o comando: 

  

```shell 
 sail artisan tinker
```
   >* Este comando é responsável por **abrir o terminal php**.

3. Execute o comando:
```php
App\Models\Model\Procad\ProcessoModel::factory(10)->create();
```

 > * Este comando é responsavel por **popular o banco de dados**.

#### Exemplificação:
 Ao executarmos os comandos no terminal:


 O terminal nos retorna:


   > = Illuminate\Database\Eloquent\Collection {#6665
    all: [
      App\Models\Model\Procad\ProcessoModel {#6695
        id_docente: 40,
        data_inicio: Illuminate\Support\Carbon @1700672120 {#6668
          date: 2023-11-22 13:55:20.877594 America/Sao_Paulo (-03:00),
        },
        data_termino: Illuminate\Support\Carbon @1700672120 {#6669
          date: 2023-11-22 13:55:20.877628 America/Sao_Paulo (-03:00),
        },
        resumo: "Iste molestias.",
  

 
  > * Indica os registros que foram criados.<br>
###### Ao  executarmos o seguinte código no Banco de dados:
```  sql 
Select * from procad.processo p 
``````

Podemos verificar os registros criados:
![Alt text](imgs/image-4.png)

