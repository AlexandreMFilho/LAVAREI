<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comparecimento extends Model
{
    use HasFactory;
    protected $table = 'comparecimento';
    protected $fillable = ['id_aluno', 'id_aula', 'id_disciplina', 'compareceu'];

    public function aluno(){
        return $this->belongsToMany(\App\Models\Aluno::class,'id_aluno','id');
    }

    public function aula(){
        return $this->belongsToMany(\App\Models\Aula::class,'id_aula','id');
    }
}
