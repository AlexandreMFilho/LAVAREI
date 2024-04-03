# Mapamento

É usado como uma forma de receber e enviar dados da tabela dentro do banco de dados e para o código.

* Abra o terminal ```ctrl + J``` e execute o código:

```
sail artisan mapeamento
```

O comando acima serve para ver as rotas do **mapeamento**

```
  ⇂ mapeamento:banco  
  ⇂ mapeamento:DAOModel  
  ⇂ mapeamento:model  
  ⇂ mapeamento:TipoComponent  
  ⇂ mapeamento:TipoDAOModel  
  ⇂ mapeamento:TipoModel  
  ⇂ mapeamento:ViewModel 
```

* Caso deseje ver o mapemento de alguma das opções, bastar digitar, por exemplo:

1. sail artisan mapeamento:nome_da_rota
   
```
sail artisan mapeamento:banco
```

O comando acima, retornará todos os resultados do mapeamento entre o código e o banco de dados.