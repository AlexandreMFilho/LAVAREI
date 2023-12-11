<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\{
    Professor,
    Disciplina,
    DisciplinaProfessor,
    Turma,
    TurmaDisciplina,
    Aluno,
    };

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DisciplinaSeeder::class,
        ]);
    }
}
