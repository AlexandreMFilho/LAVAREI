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


# Executar Seeder

Com as Seeders devidamente criadas iremos criar uma Seeder que irá chamar todas as nossas Seeders facilitando assim o processo de execução, permitindo que todas as seeders sejam criadas, criando também o banco de dados, com o seguinte comando:

```
sail artisan migrate --seed
```

Este Seeder terá o nome `DatabaseSeeder.php`, dentro dele:

1.Importar os tipos
```php
use App\Models\Model\Tipos\{
                TipoCargaHorariaModel,
                TipoCotaModel,
                TipoIntegralizacaoModel,
                TipopaisModel,
                TipoTitulacaoModel,
                TipoCategoriaModel,
                TipoCreditoModel,
                TipoLotacaoModel, #docente
                TipoPpgModel,
                TipoUfModel,
                TipoCoordenadorModel,
                TipoCursoModel, #ok
                TipoNivelModel,
                TipoTitulacaoDocenteModel,
};

```
2.Importar as Models
```php
use App\Models\Model\Depg\{
                            CargaHorariaModel,
                            DisciplinaModel,
                            DocenteModel,
                            EstudanteModel,
                            CreditoModel,
                            DocenteCursoModel,
                            EditalModel,
                            IntegralizacaoModel,
                            CursoModel,
                            DocenteDeliberacaoModel,
                            EstudanteDisciplinaModel,
                            TitulacaoModel,
                            DeliberacaoModel,
                            DocenteDisciplinaModel,
                            EstudanteEditaisModel,
                            UnidadeAcademicaModel,   
                        };
```

3.Criar a função retorno chamando as Seeders criadas:

```php
public function run(): void
    {
        $this->call([
            TipoAgenciaFomentoSeeder::class,
            TipoBolsaConcedidaSeeder::class,
            TipoCategoriaEspecializacaoSeeder::class,
            TipoCategoriaFuncionalSeeder::class,
            TipoObjetivoSeeder::class,
            TipoProcientistaSeeder::class
        ]);
    }
    ```s