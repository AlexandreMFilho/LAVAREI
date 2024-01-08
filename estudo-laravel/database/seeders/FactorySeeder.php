<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class FactorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
        \App\Models\Aluno::factory(10)->create();
        \App\Models\Professor::factory(10)->create();
        \App\Models\DisciplinaProfessor::factory(10)->create();
        \App\Models\Turma::factory(10)->create();
        \App\Models\TurmaDisciplina::factory(10)->create();

        dump('Factories executadas com sucesso!');
    }
}

