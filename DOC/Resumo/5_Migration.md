# Migrations

As migrations desempenham um papel crucial, comparável ao controle de versão do seu banco de dados. Elas oferecem a capacidade de definir e compartilhar as especificações do esquema do banco de dados.

Através da **facade** do Laravel Schema, é possível contar com suporte independente de banco de dados para criar e manipular tabelas em todos os sistemas suportados pelo Laravel. 

* Pode-se usar o comando ```php artisan make:migration {NomedaMigration}``` para gerar uma migration para o banco de dados. A migration criada será colocada em seu diretório ```database/{Nomedamigration}```. Cada nome de arquivo de migração contém um carimbo de data/hora que permite ao Laravel determinar a ordem das migrações.

```php artisan make:migration create_flights_table```

O Laravel utiliza o nome da migração para inferir o nome da tabela e determinar se uma nova tabela será criada. Se o Laravel conseguir identificar o nome da tabela a partir do nome da migração, o sistema preenchera automaticamente o arquivo de migração gerado com a tabela correspondente. Caso contrário, é possível especificar manualmente a tabela no arquivo de migração.

Para personalizar o caminho da migração gerada, basta utilizar a opção `--path` ao executar o comando `make:migration`. O caminho fornecido deve ser relativo ao diretório base do seu aplicativo.

# Estruturas - Migrations

Uma classe de migração contém dois métodos: up e down. 

O método **up** é usado para adicionar novas tabelas, colunas ou índices ao seu banco de dados, enquanto o método **down** deve reverter as operações realizadas pelo método up.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sistema.users', function (Blueprint $table) {
            $table->id();
            $table->string('nome_civil');
            $table->string('nome_social');
            $table->string('perfil')->default('PADRAO');
            $table->string('foto')->default('foto.svg');
            $table->string('email')->unique();
            $table->string('cpf',11)->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sistema.users');
    }
};

```
## Multiplas tabelas na Migration

Para executar multiplas tabelas na migration, você tem que escrever as tabelas respeitando a sua ordem de relacionamento, escrevendo primeiro as que não possuem nenhum relacionamento, em seguida as que se relacionam.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sistema.curso', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('código',11)->unique();
            $table->timestamps();
        });

            Schema::create('sistema.disciplina', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('sigla',5)->unique();
            $table->timestamps();
        });

            Schema::create('sistema.curso_disciplina', function (Blueprint $table) {
            $table->id();
            $table->foreignId(id_curso)->constraint()->references('id')->on("sistema.curso");;
            $table->foreignId(id_disciplina)->constraint()->references('id')->on("sistema.disciplina");;
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sistema.curso_disciplina');
        Schema::dropIfExists('sistema.curso');
        Schema::dropIfExists('sistema.disciplina');
    }
};

```

Neste caso para a utilização do método down primeiro deve-se deletar as tabelas que possuem as relações e em seguida todas que não as possuem.

# Configurando a conexão de migração

* Se a migration estiver interagindo com uma conexão de banco de dados diferente da conexão de banco de dados padrão do seu aplicativo, você deverá definir a propriedade `$connection` da sua migração:

```php
protected $connection = 'pgsql';
 
public function up(): void
{
    // bloco de comandos
}
```

# Explorando comandos das migrations

1. Criar migrations
   
    ```php artisan make:migration create_flights_table```
2. Apagar migration
   ```php artisan schema:dump```
3. Executar
   ```php artisan migrate```
   ```php artisan migrate:status```
   ```php artisan migrate --pretend```
   3-1. Execução isolada
   ```php artisan migrate --isolated```
4. Reverter/Rollback
   ```php artisan migrate:rollback```
5. Resetar
   ```php artisan migrate:reset```

   # Apagando migrações

À medida que você cria, acumula-se cada vez mais migrations ao longo do tempo. 

Isso pode fazer com que seu diretório `database/migrations` fique inchado com potencialmente centenas de migrations geradas. Se desejar, você pode "apagar" suas migrações em um único arquivo SQL. Para começar, execute o comando `schema:dump`:

* ​`php artisan schema:dump`

*Descartando o banco de dados atual e todas as migrações existentes...*
* `php artisan schema:dump --prune`

