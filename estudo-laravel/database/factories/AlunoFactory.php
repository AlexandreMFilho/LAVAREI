<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Turma;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Aluno>
 */
class AlunoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $turma = Turma::all();
        if(count($turma) == 0){
           $turma = Turma::factory(1)->create();
        }
        return [
            'nome'=>fake()->name(),
            'matricula'=>Str::random(13),
            'id_turma'=>$turma[0]->id,
            //
        ];
        dump($turma);
    }
}
