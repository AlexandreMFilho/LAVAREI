<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Professor extends Model
{
    use HasFactory;
    protected $table = 'professor';
    protected $fillable = ['nome','matricula','materia','id_turma','carga_horaria','email'];

    public function turma(){
        return $this->belongsTo(\App\Models\Turma::class,'id_turma','id');
    }
}
