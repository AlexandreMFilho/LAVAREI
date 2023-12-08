#Criar Routes

Para criar uma route, execute o no terminal php o comando:

```php
sail artisan automacao:route Bolsa --schema=Procad
```
Nesse exemplo, `Bolsa` representa a Entidade, e `Procad` o esquema.

As routes ficarão localizadas em 
```
routes/v1/backend/BolsaRoute
```

Dentro de um arquivo route, teremos os métodos:

```php
        Route::get('/listarId/{id?}', 'listarId'); 
```
Note que:
`get` é o tipo de método que essa função irá realizar (post, put, get).
1º parâmetro a rota que irá chamar essa função.
2º parâmetro o método dentro do controller a ser usado.