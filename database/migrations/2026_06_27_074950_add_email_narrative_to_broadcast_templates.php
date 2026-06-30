<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_templates', function (Blueprint $table) {
            $table->text('email_narrative')->nullable()->after('email_body');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('broadcast_templates', function (Blueprint $table) {
            $table->dropColumn('email_narrative');
        });
    }
};
