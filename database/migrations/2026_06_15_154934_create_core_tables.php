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
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('plugins', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->boolean('is_active')->default(false);
            $table->string('version')->default('1.0.0');
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('registration_forms', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->json('fields_schema')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('banner_path')->nullable();
            $table->decimal('ticket_price', 12, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_form_id')->constrained('registration_forms')->cascadeOnDelete();
            $table->string('ticket_code')->unique();
            $table->json('registration_data')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('payment_status')->default('pending'); // pending, paid, failed
            $table->string('payment_method')->default('manual'); // midtrans, manual
            $table->string('payment_proof_path')->nullable();
            $table->boolean('checked_in')->default(false);
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendees');
        Schema::dropIfExists('registration_forms');
        Schema::dropIfExists('plugins');
        Schema::dropIfExists('settings');
    }
};
