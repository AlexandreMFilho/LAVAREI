#Executar Seeder

Com as Seeders devidamente criadas iremos criar uma Seeder que irá chamar todas as nossas Seeders facilitando assim o processo de execução, permitindo que todas as seeders sejam criadas, criando também o banco de dados, com o seguinte comando:

```
sail artisan migrate --seed
sail artisan db:seed --class=MinhaSeeder
php artisan db:seed --class=MinhaSeeder
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
    ```