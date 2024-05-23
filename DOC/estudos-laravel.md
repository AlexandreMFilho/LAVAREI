# Estudos Laravel

## Criar um  projeto Laravel

#### IMPORTANTE
É muito importante saber onde pesquisar as coisas, usaremos a própria documentação para nos auxiliar.

Olhando a documentação do Laravel no site ```https://laravel.com/docs/10.x/installation```.

 utilizamos o comando:

 ```
 composer create-project laravel/laravel nome-projeto
 ```

 ###### IMPORTANTE!!! 
 ```laravel/laravel =  vendor/costumer```

 em seguida, dentro da pasta do projeto, daremos o comando  ```php artisan  serve``` para o artisan em nossa máquina simular um servidor web.

 ### IMPORTANTE!!!
 Também precisaremos de um Banco de Dados para armazenar os dados do projeto.

## Instalar o Banco de Dados

 Para fins de aprendizado, utilizaremos o banco ```MariaDB```.

 Após o banco instalado devemos mudar a senha root, inicialmente ele não possui uma senha, para isso usamos ```sudo mysql_secure_installation```

 Em seguida 
```
ENTER
ENTER
digitar senha
repetir senha
y
y
y
y
```

Com o mariadb instalado e configurado, iremos usar o DBeaver:

#### DBEAVER:
```
Abrir terminal:  CTRL+]
```



#### Estrutura projeto

```
.env : variáveis de ambiente
    DB_* configurações do banco
        CONNECTION : o banco utilizado
        HOST :ip
        PORT :porta
        DATABASE :nome banco
        USERNAME :usuario
        PASSWORD :senha

```


### VSCODE:

##### Para exibir o status das migrações do banco de dados
```php artisan migrate:status``` 
se der erro de "could not find driver" use 
```sudo apt install php-mysql```


##### Executar as migrações do banco de dados
```php artisan migrate```


##### Criar uma migration
```php artisan make:migration CreateAluno```
dentro dela devemos implementar os métodos ```up()``` e ```down()```, com atenção na ordem de criação, a ordem de remoção(down) deve ser inversa a de criação (up). 
ficará disponível em `app/database/migrations/..`

##### Criar uma model
`php artisan make:model Aluno`
estará disponível em: `app/Models/..`
dentro dela, implementar abaixo de `use HasFactory;`

```
protected $table = 'aluno';                     //aluno é o nome da tabela
protected $fillable = ['nome', 'matricula'];    //detro do array, colocar as colunas da tabela.
```

##### Para voltar a migration anterior

```php artisan migrate:rollback``` 



