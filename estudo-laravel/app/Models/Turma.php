<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Turma extends Model
{
    use HasFactory;
    protected $table = 'turma';
    protected $fillable = ['nome','id_professor','codigo','alunos'];
    /*
    public function alunos(){
        return $this->belongsToMany(\App\Models\Aluno::class,'id_aluno','id');
    }*/
    public function professor(){
        return $this->belongsTo(\App\Models\Professor::class,'id_professor','id');
    }
    
}
