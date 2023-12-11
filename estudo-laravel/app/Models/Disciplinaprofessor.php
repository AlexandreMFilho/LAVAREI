<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DisciplinaProfessor extends Model
{
    use HasFactory;
    protected $table = 'disciplinaProfessor';
    protected $fillable = ['id_disciplina','id_professor'];
}
