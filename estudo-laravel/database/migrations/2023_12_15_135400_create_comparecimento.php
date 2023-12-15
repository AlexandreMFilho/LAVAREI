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
        Schema::create('comparecimento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_aluno')->constraint()->references('id')->on('aluno');;
            $table->foreignId('id_aula')->constraint()->references('id')->on('aula');;
            $table->foreignId('id_disciplina')->constraint()->references('id')->on('disciplina');
            $table->boolean('compareceu');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comparecimento');
    }
};
