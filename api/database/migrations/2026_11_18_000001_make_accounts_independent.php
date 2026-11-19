<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/*
 * NutriFlow: toda conta é independente. Remove a hierarquia de tenants e o acesso
 * "master" herdados do skeleton, para que ninguém enxergue dados de outra conta.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->update(['is_master' => false]);
        DB::table('tenants')->whereNotNull('parent_id')->update(['parent_id' => null]);
    }

    public function down(): void
    {
        //
    }
};
