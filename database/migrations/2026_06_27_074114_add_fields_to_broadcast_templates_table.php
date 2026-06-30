<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_templates', function (Blueprint $table) {
            $table->text('whatsapp_body')->nullable()->after('body');
            $table->string('email_subject')->nullable()->after('whatsapp_body');
            $table->text('email_body')->nullable()->after('email_subject');
            $table->string('email_banner')->nullable()->after('email_body');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('broadcast_templates', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_body', 'email_subject', 'email_body', 'email_banner']);
        });
    }
};
