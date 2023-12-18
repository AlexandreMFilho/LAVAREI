<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Turma>
 */
class TurmaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nome'=>'Turma '.mt_rand(0, 99).strtoupper(Str::random(2)),
            'codigo'=>mt_rand(10, 99)
            //
        ];
    }
}

/*
\App\Models\Turma::factory(1)->create();
*/
