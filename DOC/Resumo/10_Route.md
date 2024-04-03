# Criar Routes

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


----

# Rotas feitas

area cnpq

http://localhost/v1/Proatec/{Classe}/{comando}


-><span style="color:green"> GET</span>
Usada para requisitar dados do usuário. Apenas pega os dados do BD

-><span style="color:orange"> POST </span>

Usada para salvar os dados enviados
~~~json
{
    "nome":"aa",
    "descricao":"aaa",
    "_token": "{csrf_gerado}" 
}
~~~

# Rotas POST salvar

http://localhost/v1/Proatec/Edital/salvar

```json
{
"nome": "WEDRASDS",
"descricao": "Loremzetti",
"data_inicio_indicacao": "2024-01-21",
"data_fim_indicacao": "2024-01-21",
"data_inicio_inscricao": "2024-01-21",
"data_fim_inscricao": "2024-01-21",
"data_lista_inscritos": "2024-01-21",
"data_inicio_analise": "2024-01-21",
"data_fim_analise": "2024-01-21",
"data_resultado_parcial": "2024-01-21",
"data_inicio_recurso": "2024-01-21",
"data_fim_recurso": "2024-01-21",
"data_lista_recurso": "2024-01-21",
"data_inicio_analise_recurso": "2024-01-21",
"data_fim_analise_recurso": "2024-01-21",
"data_resultado_final": "2024-01-21",
"_token": "XIewRZbBGOGzYOfjqPVX6z76jtFJQ8aTuRYVOomr"
}
```