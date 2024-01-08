<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Disciplina;
use App\Models\Professor;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Model>
 */
class DisciplinaProfessorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

    public function definition(): array
    {
        $professor = Professor::take(1)->get();
        if(empty($professor)){
           $professor = Professor::factory(1)->create();
        }
        
        $disciplina = Disciplina::take(1)->get();
        //if(empty($disciplina)){
           //TODO criar chamada ao SEEDER caso n tenha.
        //}
        
        return [
            'id_disciplina'=>$disciplina[0]->id,
            'id_professor'=>$professor[0]->id,

        ];
    }
}
