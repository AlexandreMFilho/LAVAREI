<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TurmaDisciplina extends Model
{
    use HasFactory;
    protected $table = 'turmaDisciplina';
    protected $fillable = ['id_turma','id_disciplina'];

    public function turma(){
        return $this->belongsToMany(\App\Models\Turma::class,'id_turma','id');
    }

    public function disciplina(){
        return $this->belongsToMany(\App\Models\Disciplina::class,'id_disciplina','id');
    }
}
