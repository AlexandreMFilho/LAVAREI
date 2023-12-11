<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Disciplina;

class DisciplinaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $dados = [
            ['nome' => 'Matemática'],
            ['nome' => 'Português'],
            ['nome' => 'História'],
            ['nome' => 'Geografia'],
            ['nome' => 'Ciências'],
            ['nome' => 'Inglês'],
            ['nome' => 'Educação Física'],
            ['nome' => 'Artes'],
            ['nome' => 'Libras'],
            ['nome' => 'Espanhol'],
            ['nome' => 'Empreendedorismo'],
            ['nome' => 'Informática'],
            ['nome' => 'Biologia'],
            ['nome' => 'Física'],
            ['nome' => 'Química'],
            ['nome' => 'Sociologia'],
            ['nome' => 'Filosofia']       
        ];
        foreach ($dados as $value) {
            Disciplina::create($value);
        }
    dump('Disciplinas cadastradas com sucesso!');
    }
}