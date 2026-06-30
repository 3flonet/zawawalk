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
        Schema::table('registration_forms', function (Blueprint $table) {
            $table->integer('max_participants')->nullable()->after('ticket_price');
            $table->dateTime('closed_at')->nullable()->after('max_participants');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registration_forms', function (Blueprint $table) {
            $table->dropColumn(['max_participants', 'closed_at']);
        });
    }
};
