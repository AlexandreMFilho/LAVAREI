<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Aluno extends Model
{
    use HasFactory;
    protected $table = 'aluno';
    protected $fillable = ['nome','matricula','id_turma'];

    public function turma(){
        return $this->belongsTo(\App\Models\Turma::class,'id_turma','id');
    }
}
