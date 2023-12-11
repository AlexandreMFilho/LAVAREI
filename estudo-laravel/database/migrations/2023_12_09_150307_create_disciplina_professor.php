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
        Schema::create('disciplina_professor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_professor')->constraint()->references('id')->on('professor');
            $table->foreignId('id_disciplina')->constraint()->references('id')->on('disciplina');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disciplina_professor');
    }
};
