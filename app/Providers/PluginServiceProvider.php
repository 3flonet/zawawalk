<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Models\Plugin as PluginModel;
use Illuminate\Support\Facades\File;

class PluginServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $pluginsPath = base_path('plugins');

        if (!File::isDirectory($pluginsPath)) {
            File::makeDirectory($pluginsPath, 0755, true);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $pluginsPath = base_path('plugins');

        // Avoid issues during migrations
        if (!Schema::hasTable('plugins')) {
            return;
        }

        $pluginDirs = File::directories($pluginsPath);
        
        foreach ($pluginDirs as $dir) {
            $pluginJsonFile = $dir . DIRECTORY_SEPARATOR . 'plugin.json';
            if (!File::exists($pluginJsonFile)) {
                continue;
            }

            $metadata = json_decode(File::get($pluginJsonFile), true);
            if (!$metadata || !isset($metadata['id'])) {
                continue;
            }

            $pluginId = $metadata['id'];
            $dbPlugin = PluginModel::find($pluginId);

            if (!$dbPlugin) {
                $dbPlugin = PluginModel::create([
                    'id' => $pluginId,
                    'name' => $metadata['name'] ?? ucfirst($pluginId),
                    'is_active' => false,
                    'version' => $metadata['version'] ?? '1.0.0',
                    'settings' => $metadata['settings'] ?? [],
                ]);
            }

            if ($dbPlugin->is_active) {
                $studlyName = $this->studlyCaseCustom($pluginId);
                $providerClass = "Plugins\\{$studlyName}\\{$studlyName}ServiceProvider";

                if (class_exists($providerClass)) {
                    $this->app->register($providerClass);
                }
            }
        }
    }

    private function studlyCaseCustom($value)
    {
        $value = ucwords(str_replace(['-', '_'], ' ', $value));
        return str_replace(' ', '', $value);
    }
}
