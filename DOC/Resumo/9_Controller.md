# Comandos de automação controller

Define toda a rota de solicitação usando classes controladoras para organizar esse comportamento em uma única classe.

Por exemplo, uma classe ***UserController*** pode lidar com todas as solicitações recebidas relacionadas aos usuários, incluindo mostrar, criar, atualizar e excluir usuários. Por padrão, os controladores são armazenados no diretório:

```app/Http/Controllers```

1. Para criar uma Controller, usamos o comando no terminal (```ctrl + J```):

```php artisan make:controller UserController```

Que irá criar uma classe pré-pronta:

```php
<?php
 
namespace App\Http\Controllers;
 
use App\Models\User;
use Illuminate\View\View;
 
class UserController extends Controller
{
    /**
     * Show the profile for a given user.
     */
    public function show(string $id): View
    {
        return view('user.profile', [
            'user' => User::findOrFail($id)
        ]);
    }
}
```

* Depois de escrever uma classe e um método do controlador, você pode definir uma rota para o método do controlador da seguinte forma:


```php
use App\Http\Controllers\UserController;
 
Route::get('/user/{id}', [UserController::class, 'show']);
```
