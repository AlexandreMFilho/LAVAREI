<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    use HasFactory;
    protected $table = 'aula';
    protected $fillable = ['id_professor', 'id_Disciplina', 'nome', 'numero'];

    public function professor(){
        return $this->belongsToMany(\App\Models\Professor::class,'id_professor','id');
    }
    public function turmaDisciplina(){
        return $this->belongsToMany(\App\Models\Disciplina::class,'id_Disciplina','id');
    }

}
