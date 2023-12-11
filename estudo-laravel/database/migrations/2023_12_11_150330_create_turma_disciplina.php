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
        Schema::create('turma_disciplina', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_turma')->constraint()->references('id')->on('turma');
            $table->foreignId('id_disciplina')->constraint()->references('id')->on('disciplina');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('turma_disciplina');
    }
};
