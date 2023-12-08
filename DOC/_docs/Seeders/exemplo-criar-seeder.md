# Criar um Seeder

As Seeders são responsáveis por criar o banco, e preenche-lo com dados estáticos como os `Tipos`.
Para cria-los utilize no terminal o comando:
```
php artisan db:seed
sail artisan make:seed database/seeders/TipoAgenciaFomentoSeeder
```
##Criado o arquivo Seeder, deverá preenche-lo:

1.Importar a Model


```php
use App\Models\Model\Tipos\TipoAgenciaFomentoModel;
```

1.Criar a função de retorno da seed

```php
public function run(): void
    {
        $dados = [
            [
                'nome'=>'FAPERJ',
                'indice'=>1,
                'ativo'=>true
            ],
            [
                'nome'=>'CNPQ',
                'indice'=>1,
                'ativo'=>true
            ],
            [
                'nome'=>'CAPES',
                'indice'=>1,
                'ativo'=>true
            ],
            [
                'nome'=>'OUTRAS',
                'indice'=>1,
                'ativo'=>true
            ],
        ];

        foreach($dados as $dado){
            TipoAgenciaFomentoModel::create($dado);
        }

        dump("Seeder agencia fomento concluído.");
    }
```
Acima estão os valores estáticos da tabela TipoAgenciaFomento.
