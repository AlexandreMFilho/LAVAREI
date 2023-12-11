<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TurmaDisciplina extends Model
{
    use HasFactory;
    protected $table = 'turmaDisciplina';
    protected $fillable = ['id_turma','id_disciplina']
}
