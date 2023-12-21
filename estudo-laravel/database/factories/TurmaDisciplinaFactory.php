<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Turma;
use App\Models\Disciplina;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TurmaDisciplina>
 */
class TurmaDisciplinaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {   
        $turma = Turma::take(1)->get();
        //if(count($turma) <= 0){
        if(empty($turma)){
           $turma = Turma::factory(1)->create();
        }
        $disciplina = Disciplina::take(1)->get();
        //if(count($disciplina) <= 0){
        if(empty($disciplina)){
           $disciplina = Disciplina::factory(1)->create();
        }
        return [
            //
            'id_turma'->$turma[0]->id,
            'id_disciplina'->$disciplina[0]->id,
        ];
    }
}


//TODO TO DO COrrigir
