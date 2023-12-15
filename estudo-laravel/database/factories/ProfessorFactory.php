<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;


/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Professor>
 */
class ProfessorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $n = fake()->name();
        return [
            'nome'=>$n,
            'matricula'=>Str::random(13),
            'carga_horaria'=>mt_rand(0, 100),
            'email'=>$n[0].$n[1]."@email.com",
            //
        ];
    }
}
