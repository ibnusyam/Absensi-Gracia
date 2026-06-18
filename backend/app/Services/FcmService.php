<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimal Firebase Cloud Messaging (HTTP v1) sender.
 *
 * When FCM is disabled (default in local/dev) every send is logged instead of
 * dispatched, so the rest of the app behaves identically without credentials.
 */
class FcmService
{
    public function __construct(
        private readonly array $config,
    ) {
    }

    public static function fromConfig(): self
    {
        return new self((array) config('services.fcm'));
    }

    public function isEnabled(): bool
    {
        return (bool) ($this->config['enabled'] ?? false);
    }

    /**
     * Send a notification to a single user (no-op if they have no token).
     */
    public function notifyUser(User $user, string $title, string $body, array $data = []): void
    {
        if (! $user->fcm_token) {
            return;
        }

        $this->send($user->fcm_token, $title, $body, $data);
    }

    /**
     * Send a notification to many users.
     *
     * @param  iterable<User>  $users
     */
    public function notifyUsers(iterable $users, string $title, string $body, array $data = []): void
    {
        foreach ($users as $user) {
            $this->notifyUser($user, $title, $body, $data);
        }
    }

    public function send(string $token, string $title, string $body, array $data = []): void
    {
        if (! $this->isEnabled()) {
            Log::info('[FCM disabled] notification', compact('token', 'title', 'body', 'data'));

            return;
        }

        try {
            $projectId = $this->config['project_id'];
            $accessToken = $this->resolveAccessToken();

            Http::withToken($accessToken)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => [
                        'token' => $token,
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'data' => array_map('strval', $data),
                    ],
                ]);
        } catch (\Throwable $e) {
            // Notifications are best-effort; never break the request flow.
            Log::warning('[FCM] send failed: '.$e->getMessage());
        }
    }

    /**
     * Exchange the service-account JSON for an OAuth2 access token.
     * (Implementation intentionally lightweight; replace with google/apiclient
     * or kreait/firebase-php in production.)
     */
    private function resolveAccessToken(): string
    {
        $path = base_path($this->config['credentials']);

        if (! is_file($path)) {
            throw new \RuntimeException("FCM credentials not found at {$path}");
        }

        // A real implementation signs a JWT with the service-account key and
        // exchanges it at https://oauth2.googleapis.com/token. Left as an
        // integration point so the rest of the system stays testable.
        throw new \RuntimeException('FCM access-token exchange not configured.');
    }
}
