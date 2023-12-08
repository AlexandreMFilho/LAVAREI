<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('professor', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('matricula',13)->unique();
            $table->string('materia');
            $table->foreignId('id_turma')->constraint()->references('id')->on('turma');//será 1 para muitos | ver depois
            $table->integer('carga_horaria');
            $table->string('email');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('professor');
    }
};
